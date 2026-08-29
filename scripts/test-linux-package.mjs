import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

if (process.platform !== 'linux') {
  console.log('Linux package verification is not applicable on this platform.')
  process.exit(0)
}

const packageDirectory = resolve('src-tauri/target/release/bundle/deb')
const expectedVersion = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
const packageName = readdirSync(packageDirectory).filter((name) => name.endsWith('.deb')).sort().at(-1)
assert(packageName, `No Debian package was found in ${packageDirectory}`)
const packagePath = join(packageDirectory, packageName)

const inspect = spawnSync('dpkg-deb', ['-f', packagePath, 'Package', 'Version', 'Depends'], { encoding: 'utf8' })
assert.equal(inspect.status, 0, inspect.stderr)
assert.match(inspect.stdout, /Package: game-text-beacon/)
assert.match(inspect.stdout, new RegExp(`Version: ${expectedVersion.replaceAll('.', '\\.')}`))
assert.match(inspect.stdout, /Depends:.*tesseract-ocr/)
assert.match(inspect.stdout, /Depends:.*espeak-ng/)

const privilege = process.getuid?.() === 0 ? [] : ['sudo']
const installer = privilege.length ? privilege[0] : 'apt-get'
const installArguments = privilege.length
  ? ['apt-get', 'install', '-y', '--reinstall', packagePath]
  : ['install', '-y', '--reinstall', packagePath]
const install = spawnSync(installer, installArguments, { encoding: 'utf8' })
assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`)

for (const dependency of ['tesseract-ocr', 'espeak-ng']) {
  const installed = spawnSync('dpkg-query', ['-W', '-f=${Status}', dependency], { encoding: 'utf8' })
  assert.equal(installed.status, 0, `${dependency} was not installed by the Debian dependency resolver`)
  assert.match(installed.stdout, /install ok installed/)
}

// Prove that the package-installed speech engine can synthesize PCM locally,
// even though the verifier container has no physical speaker.
const wav = spawnSync('espeak-ng', ['--stdout', 'Game Text Beacon native package speech check.'])
assert.equal(wav.status, 0, wav.stderr?.toString())
assert.equal(wav.stdout.subarray(0, 4).toString('ascii'), 'RIFF')
assert(wav.stdout.length > 1000, 'eSpeak NG did not generate audible wave data')

const scratch = mkdtempSync(join(tmpdir(), 'game-text-beacon-package-'))
const alsaConfig = join(scratch, 'asound.conf')
writeFileSync(alsaConfig, 'pcm.!default { type null }\nctl.!default { type null }\n')
const port = 9337
const application = spawn('dbus-run-session', ['--', 'xvfb-run', '-a', '/usr/bin/game-text-beacon'], {
  env: {
    ...process.env,
    ALSA_CONFIG_PATH: alsaConfig,
    WEBKIT_DISABLE_COMPOSITING_MODE: '1',
    WEBKIT_INSPECTOR_HTTP_SERVER: `127.0.0.1:${port}`
  },
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
})
let applicationLog = ''
application.stdout.on('data', (chunk) => { applicationLog += chunk })
application.stderr.on('data', (chunk) => { applicationLog += chunk })

const waitForInspector = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      if (response.ok) {
        const home = await response.text()
        if (/\/socket\/\d+\/\d+\/WebPage/.test(home)) return home
      }
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error(`Packaged WebKitGTK inspector did not start.\n${applicationLog}`)
}

let browser
try {
  const inspectorHome = await waitForInspector()
  const socket = inspectorHome.match(/\/socket\/\d+\/\d+\/WebPage/)?.[0]
  assert(socket, `Could not find the packaged WebKitGTK target.\n${inspectorHome}`)
  browser = await chromium.launch({ headless: true })
  const inspector = await browser.newPage()
  await inspector.goto(`http://127.0.0.1:${port}/Main.html?ws=127.0.0.1:${port}${socket}`)
  await inspector.waitForFunction(() => globalThis.WI?.assumingMainTarget?.()?.RuntimeAgent, null, { timeout: 15_000 })

  const evaluateWebKit = (expression) => inspector.evaluate((source) => new Promise((resolveEvaluation) => {
    globalThis.WI.assumingMainTarget().RuntimeAgent.evaluate.invoke({
      expression: source,
      returnByValue: true,
      doNotPauseOnExceptionsAndMuteConsole: true
    }, (error, result) => resolveEvaluation(error ? { error } : result))
  }), expression)

  const webSpeech = await evaluateWebKit('[typeof window.speechSynthesis, typeof window.SpeechSynthesisUtterance]')
  assert.deepEqual(webSpeech.value, ['undefined', 'undefined'], 'The regression must run in WebKitGTK without Web Speech')
  await evaluateWebKit(`window.__nativeSpeechResult = 'pending'; window.__TAURI_INTERNALS__.invoke('speak_text', {text: 'Game Text Beacon speaks through its installed Linux voice.'}).then(() => window.__nativeSpeechResult = 'ok').catch((error) => window.__nativeSpeechResult = 'error:' + String(error)); 'started'`)

  let nativeResult = 'pending'
  for (let attempt = 0; attempt < 100 && nativeResult === 'pending'; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
    nativeResult = (await evaluateWebKit('window.__nativeSpeechResult')).value
  }
  assert.equal(nativeResult, 'ok', `Native speech failed in the installed WebKitGTK package: ${nativeResult}\n${applicationLog}`)
  console.log('@claim:linux-ocr-package PASS')
  console.log(`PASS installed package: ${packagePath}`)
  console.log('PASS dependencies: tesseract-ocr, espeak-ng')
  console.log('PASS WebKitGTK: Web Speech absent; native speak_text completed')
} finally {
  await browser?.close()
  try { process.kill(-application.pid, 'SIGTERM') } catch {}
  rmSync(scratch, { recursive: true, force: true })
}
