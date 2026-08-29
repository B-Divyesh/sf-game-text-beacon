import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

if (process.platform !== 'linux') {
  console.log('The packaged global-hotkey claim is Linux-only.')
  process.exit(0)
}

const packageDirectory = resolve('src-tauri/target/release/bundle/deb')
const packageName = readdirSync(packageDirectory).filter((name) => name.endsWith('.deb')).sort().at(-1)
assert(packageName, `No Debian package was found in ${packageDirectory}`)
const packagePath = join(packageDirectory, packageName)
const expectedVersion = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
const inspect = spawnSync('dpkg-deb', ['-f', packagePath, 'Version'], { encoding: 'utf8' })
assert.equal(inspect.status, 0, inspect.stderr)
assert.match(inspect.stdout, new RegExp(expectedVersion.replaceAll('.', '\\.')))

const privilege = process.getuid?.() === 0 ? [] : ['sudo']
const installer = privilege.length ? privilege[0] : 'apt-get'
const installArguments = privilege.length
  ? ['apt-get', 'install', '-y', '--reinstall', packagePath]
  : ['install', '-y', '--reinstall', packagePath]
const install = spawnSync(installer, installArguments, { encoding: 'utf8' })
assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`)
assert(existsSync('/usr/bin/game-text-beacon'), 'The packaged app was not installed')

const scratch = mkdtempSync(join(tmpdir(), 'game-text-beacon-hotkey-'))
const display = `:${100 + (process.pid % 500)}`
const displayEnvironment = { ...process.env, DISPLAY: display }
const alsaConfig = join(scratch, 'asound.conf')
writeFileSync(alsaConfig, 'pcm.!default { type null }\nctl.!default { type null }\n')
const processes = []
let inspectorBrowser
let targetBrowser

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
const stop = (child) => {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGTERM') } catch {
    try { child.kill('SIGTERM') } catch {}
  }
}
const waitForDisplay = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const probe = spawnSync('xdotool', ['getmouselocation'], { env: displayEnvironment, encoding: 'utf8' })
    if (probe.status === 0) return
    await delay(50)
  }
  throw new Error(`Xvfb did not start on ${display}`)
}
const appLogs = new Map()
const launchApp = (port, label) => {
  const config = join(scratch, label)
  mkdirSync(config, { recursive: true })
  const child = spawn('dbus-run-session', ['--', '/usr/bin/game-text-beacon'], {
    env: {
      ...displayEnvironment,
      ALSA_CONFIG_PATH: alsaConfig,
      GDK_BACKEND: 'x11',
      NO_AT_BRIDGE: '1',
      WEBKIT_DISABLE_COMPOSITING_MODE: '1',
      WEBKIT_INSPECTOR_HTTP_SERVER: `127.0.0.1:${port}`,
      XDG_CONFIG_HOME: config,
      XDG_DATA_HOME: config
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  appLogs.set(label, '')
  const capture = (chunk) => appLogs.set(label, `${appLogs.get(label)}${chunk}`)
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)
  processes.push(child)
  return child
}
const connectInspector = async (port, label) => {
  let inspectorHome = ''
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      if (response.ok) {
        inspectorHome = await response.text()
        if (/\/socket\/\d+\/\d+\/WebPage/.test(inspectorHome)) break
      }
    } catch {}
    await delay(100)
  }
  const socket = inspectorHome.match(/\/socket\/\d+\/\d+\/WebPage/)?.[0]
  assert(socket, `Could not find the ${label} WebKitGTK target.\n${appLogs.get(label)}`)
  const inspector = await inspectorBrowser.newPage()
  await inspector.goto(`http://127.0.0.1:${port}/Main.html?ws=127.0.0.1:${port}${socket}`)
  await inspector.waitForFunction(() => globalThis.WI?.assumingMainTarget?.()?.RuntimeAgent, null, { timeout: 15_000 })
  return {
    page: inspector,
    evaluate: (expression) => inspector.evaluate((source) => new Promise((resolveEvaluation) => {
      globalThis.WI.assumingMainTarget().RuntimeAgent.evaluate.invoke({
        expression: source,
        returnByValue: true,
        doNotPauseOnExceptionsAndMuteConsole: true
      }, (error, result) => resolveEvaluation(error ? { error } : result))
    }), expression)
  }
}
const waitForValue = async (evaluate, expression, predicate, label, timeout = 15_000) => {
  const started = Date.now()
  let value
  while (Date.now() - started < timeout) {
    const result = await evaluate(expression)
    value = result?.value
    if (predicate(value)) return value
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${String(value)}`)
}

try {
  const xvfb = spawn('Xvfb', [display, '-screen', '0', '1280x800x24', '-ac', '-nolisten', 'tcp'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  processes.push(xvfb)
  await waitForDisplay()

  inspectorBrowser = await chromium.launch({ headless: true })
  const basePort = 10_200 + (process.pid % 1_000) * 2

  launchApp(basePort, 'first')
  const first = await connectInspector(basePort, 'first')
  const firstStatus = await waitForValue(
    first.evaluate,
    "document.querySelector('#app-status')?.textContent || ''",
    (value) => typeof value === 'string' && value.includes('Ctrl+Shift+R is ready'),
    'the first packaged app to register Ctrl+Shift+R'
  )
  assert.match(firstStatus, /ready for the saved frame/)
  await first.page.close()

  launchApp(basePort + 1, 'second')
  const second = await connectInspector(basePort + 1, 'second')
  const conflictStatus = await waitForValue(
    second.evaluate,
    "document.querySelector('#app-status')?.textContent || ''",
    (value) => typeof value === 'string' && value.includes('Ctrl+Shift+R is not active'),
    'the packaged startup conflict to become visible'
  )
  assert.match(conflictStatus, /hotkey is unavailable|already registered/i)
  assert.match(conflictStatus, /Read this frame remains available/)
  assert.equal((await second.evaluate("document.querySelector('#hotkey')?.getAttribute('aria-invalid')")).value, 'true')
  assert.equal((await second.evaluate("document.querySelector('#try-alternate-hotkey')?.hidden")).value, false)

  await second.evaluate("document.querySelector('#try-alternate-hotkey').click(); 'clicked'")
  const recoveredStatus = await waitForValue(
    second.evaluate,
    "document.querySelector('#app-status')?.textContent || ''",
    (value) => typeof value === 'string' && value.includes('Ctrl+Alt+R is ready'),
    'the alternate packaged hotkey to register'
  )
  assert.match(recoveredStatus, /ready for the saved frame/)
  assert.equal((await second.evaluate("document.querySelector('#hotkey')?.getAttribute('aria-invalid')")).value, null)

  targetBrowser = await chromium.launch({
    headless: false,
    env: displayEnvironment,
    args: ['--no-sandbox', '--window-position=0,0', '--window-size=1280,800']
  })
  const target = await targetBrowser.newPage({ viewport: { width: 1280, height: 800 } })
  await target.setContent(`<!doctype html><html><head><title>Beacon Hotkey Target</title></head><body style="margin:0;background:white;color:black;font-family:Arial,sans-serif"><main style="padding:38px 100px"><h1 style="font-size:64px;line-height:1.1;margin:0 0 22px">NORTH GATE LOCKED</h1><p style="font-size:58px;line-height:1.1;margin:0">FIND RADIO TOWER</p></main></body></html>`)
  await target.bringToFront()

  let targetWindow = ''
  for (let attempt = 0; attempt < 100 && !targetWindow; attempt += 1) {
    const search = spawnSync('xdotool', ['search', '--onlyvisible', '--name', 'Beacon Hotkey Target'], { env: displayEnvironment, encoding: 'utf8' })
    targetWindow = search.status === 0 ? search.stdout.trim().split('\n').filter(Boolean).at(-1) || '' : ''
    if (!targetWindow) await delay(50)
  }
  assert(targetWindow, 'Could not find the separate window used as the hotkey capture target')
  const focus = spawnSync('xdotool', ['windowfocus', '--sync', targetWindow], { env: displayEnvironment, encoding: 'utf8' })
  assert.equal(focus.status, 0, focus.stderr)
  const focused = spawnSync('xdotool', ['getwindowfocus'], { env: displayEnvironment, encoding: 'utf8' })
  assert.equal(focused.stdout.trim(), targetWindow, 'The separate target window did not have focus')

  const hotkeyStarted = Date.now()
  const key = spawnSync('xdotool', ['key', '--delay', '40', 'ctrl+alt+r'], { env: displayEnvironment, encoding: 'utf8' })
  assert.equal(key.status, 0, key.stderr)
  const queueText = await waitForValue(
    second.evaluate,
    "document.querySelector('#queue')?.textContent || ''",
    (value) => typeof value === 'string' && /NORTH GATE LOCKED/i.test(value) && /FIND RADIO TOWER/i.test(value),
    'one real global-hotkey capture and OCR result',
    20_000
  )
  const elapsedMilliseconds = Date.now() - hotkeyStarted
  assert.match(queueText, /NORTH GATE LOCKED/i)
  assert.match(queueText, /FIND RADIO TOWER/i)
  assert.equal((await second.evaluate("document.querySelectorAll('#queue article').length")).value, 1)

  console.log('@claim:packaged-global-hotkey PASS')
  console.log('PASS conflict: the second packaged app announced that Ctrl+Shift+R was not active')
  console.log('PASS recovery: Try Ctrl+Alt+R registered an available alternate')
  console.log(`PASS real hotkey: another window stayed focused; one capture/read completed in ${elapsedMilliseconds} ms`)
  console.log('PASS OCR: NORTH GATE LOCKED / FIND RADIO TOWER')
} finally {
  await targetBrowser?.close()
  await inspectorBrowser?.close()
  for (const child of processes.reverse()) stop(child)
  await delay(250)
  rmSync(scratch, { recursive: true, force: true })
}
