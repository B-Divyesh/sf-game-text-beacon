import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

if (process.platform !== 'linux') {
  console.log('The five-title compatibility trial is Linux-only.')
  process.exit(0)
}

const titles = [
  {
    name: 'OpenTTD', version: '13.4', executable: '/usr/games/openttd',
    arguments: ['-r', '1280x720', '-s', 'null', '-m', 'null', '-x'], window: 'OpenTTD',
    region: { x: 620, y: 270, width: 200, height: 55 }, expected: /Play\s+Heightmap/i
  },
  {
    name: 'Neverball', version: '1.6.0', executable: '/usr/games/neverball', arguments: [], window: 'Neverball',
    region: { x: 280, y: 330, width: 260, height: 75 }, expected: /Hel\s*p/i
  },
  {
    name: 'GNOME Sudoku', version: '46.0', executable: '/usr/games/gnome-sudoku', arguments: [], window: 'Sudoku',
    region: { x: 160, y: 70, width: 420, height: 330 }, expected: /Select Game Difficulty/i
  },
  {
    name: 'Pingus', version: '0.7.6', executable: '/usr/games/pingus',
    arguments: ['--window', '--geometry=1280x720', '--disable-sound', '--disable-music', '--no-cfg-file'], window: 'Pingus',
    region: { x: 385, y: 290, width: 540, height: 80 }, expected: /Story/i
  },
  {
    name: 'GNOME Mines', version: '40.1', executable: '/usr/games/gnome-mines', arguments: [], window: 'Mines',
    region: { x: 100, y: 90, width: 420, height: 160 }, expected: /10\s+mines/i
  }
]

assert(existsSync('/usr/bin/game-text-beacon'), 'Install the built Game Text Beacon Debian package first')
const expectedVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
const installedVersion = spawnSync('dpkg-query', ['-W', '-f=${Version}', 'game-text-beacon'], { encoding: 'utf8' })
assert.equal(installedVersion.status, 0, 'The Game Text Beacon Debian package is not installed')
assert.match(installedVersion.stdout, new RegExp(`^${expectedVersion.replaceAll('.', '\\.')}(-|$)`), 'The installed package is not the current build')
for (const title of titles) assert(existsSync(title.executable), `Install the compatibility fixture: ${title.executable}`)

const scratch = mkdtempSync(join(tmpdir(), 'game-text-beacon-five-title-'))
const display = `:${100 + (process.pid % 500)}`
const environment = {
  ...process.env,
  ALSA_CONFIG_PATH: join(scratch, 'asound.conf'),
  DISPLAY: display,
  GDK_BACKEND: 'x11',
  GTK_A11Y: 'none',
  LIBGL_ALWAYS_SOFTWARE: '1',
  NO_AT_BRIDGE: '1',
  SDL_AUDIODRIVER: 'dummy',
  XDG_CONFIG_HOME: join(scratch, 'config'),
  XDG_DATA_HOME: join(scratch, 'data'),
  XDG_RUNTIME_DIR: join(scratch, 'runtime')
}
for (const directory of [environment.XDG_CONFIG_HOME, environment.XDG_DATA_HOME, environment.XDG_RUNTIME_DIR]) mkdirSync(directory, { recursive: true })
chmodSync(environment.XDG_RUNTIME_DIR, 0o700)
writeFileSync(environment.ALSA_CONFIG_PATH, 'pcm.!default { type null }\nctl.!default { type null }\n')
const children = []
let inspectorBrowser
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
const stop = (child) => {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGTERM') } catch {
    try { child.kill('SIGTERM') } catch {}
  }
}
const waitForValue = async (evaluate, expression, predicate, label, timeout = 15_000) => {
  const started = Date.now()
  let value
  while (Date.now() - started < timeout) {
    value = (await Promise.race([
      evaluate(expression),
      delay(5_000).then(() => { throw new Error(`Evaluation stalled while waiting for ${label}`) })
    ]))?.value
    if (predicate(value)) return value
    await delay(50)
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${String(value)}`)
}

try {
  const xvfb = spawn('Xvfb', [display, '-screen', '0', '1280x800x24', '-ac', '-nolisten', 'tcp'], { detached: true, stdio: 'ignore' })
  children.push(xvfb)
  await waitForValue(
    async () => ({ value: spawnSync('xdotool', ['getmouselocation'], { env: environment }).status }),
    '', (value) => value === 0, 'Xvfb', 5_000
  )

  const port = 12_200 + (process.pid % 1_000)
  const app = spawn('dbus-run-session', ['--', '/usr/bin/game-text-beacon'], {
    env: { ...environment, WEBKIT_DISABLE_COMPOSITING_MODE: '1', WEBKIT_INSPECTOR_HTTP_SERVER: `127.0.0.1:${port}` },
    detached: true,
    stdio: 'ignore'
  })
  children.push(app)
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
  assert(socket, 'Could not find the packaged WebKitGTK target')
  inspectorBrowser = await chromium.launch({ headless: true })
  const inspector = await inspectorBrowser.newPage()
  await inspector.goto(`http://127.0.0.1:${port}/Main.html?ws=127.0.0.1:${port}${socket}`)
  await inspector.waitForFunction(() => globalThis.WI?.assumingMainTarget?.()?.RuntimeAgent, null, { timeout: 15_000 })
  const evaluate = (expression) => inspector.evaluate((source) => new Promise((resolveEvaluation) => {
    globalThis.WI.assumingMainTarget().RuntimeAgent.evaluate.invoke({
      expression: source,
      returnByValue: true,
      doNotPauseOnExceptionsAndMuteConsole: true
    }, (error, result) => resolveEvaluation(error ? { error } : result))
  }), expression)
  await waitForValue(evaluate, "document.querySelector('#app-status')?.textContent || ''", (value) => value?.includes('Ctrl+Shift+R is ready'), 'the packaged hotkey')

  const results = []
  for (const title of titles) {
    console.log(`Starting ${title.name} ${title.version}`)
    const userDirectory = join(scratch, title.name.toLowerCase().replaceAll(' ', '-'))
    mkdirSync(userDirectory, { recursive: true })
    const extraArguments = title.name === 'Pingus' ? [`--userdir=${userDirectory}`] : []
    const game = spawn(title.executable, [...title.arguments, ...extraArguments], { env: environment, detached: true, stdio: 'ignore' })
    children.push(game)

    const findWindow = () => {
      for (const field of ['--name', '--class']) {
        const search = spawnSync('xdotool', ['search', '--onlyvisible', field, title.window], { env: environment, encoding: 'utf8' })
        const windowId = search.status === 0 ? search.stdout.trim().split('\n').filter(Boolean).at(-1) || '' : ''
        if (windowId) return windowId
      }
      return ''
    }
    let windowId = await waitForValue(async () => ({ value: findWindow() }), '', Boolean, `${title.name} window`)
    await delay(3_000)
    windowId = findWindow()
    assert(windowId, `${title.name} closed before its capture settings were saved`)
    const geometry = spawnSync('xdotool', ['getwindowgeometry', '--shell', windowId], { env: environment, encoding: 'utf8' })
    assert.equal(geometry.status, 0, geometry.stderr)
    const windowX = Number(geometry.stdout.match(/^X=(\d+)$/m)?.[1] || 0)
    const windowY = Number(geometry.stdout.match(/^Y=(\d+)$/m)?.[1] || 0)

    const settings = JSON.stringify({ region: { ...title.region, x: title.region.x + windowX, y: title.region.y + windowY }, hotkey: 'Ctrl+Shift+R' })
    await evaluate(`window.__compatSave = 'pending'; window.__TAURI_INTERNALS__.invoke('save_settings', {settings: ${settings}}).then(() => window.__compatSave = 'ok').catch((error) => window.__compatSave = 'error:' + String(error)); 'started'`)
    await waitForValue(evaluate, 'window.__compatSave', (value) => value === 'ok', `${title.name} capture settings`)

    let passed = 0
    const timings = []
    const texts = []
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = (await evaluate("document.querySelectorAll('#queue article').length")).value
      const windowId = findWindow()
      assert(windowId, `${title.name} closed before attempt ${attempt + 1}`)
      const focus = spawnSync('xdotool', ['windowraise', windowId, 'windowfocus', '--sync', windowId], { env: environment, encoding: 'utf8' })
      assert.equal(focus.status, 0, focus.stderr)
      const started = Date.now()
      const key = spawnSync('xdotool', ['key', '--delay', '40', 'ctrl+shift+r'], { env: environment, encoding: 'utf8' })
      assert.equal(key.status, 0, key.stderr)
      try {
        const result = await waitForValue(
          evaluate,
          `JSON.stringify({count: document.querySelectorAll('#queue article').length, text: document.querySelector('#queue article:last-child')?.textContent || ''})`,
          (value) => {
            if (typeof value !== 'string') return false
            const observed = JSON.parse(value)
            return observed.count > count
          }, `${title.name} attempt ${attempt + 1}`, 3_000
        )
        const elapsed = Date.now() - started
        const text = JSON.parse(result).text.replace(/\s+/g, ' ').trim()
        const accurate = title.expected.test(text)
        if (accurate && elapsed < 3_000) passed += 1
        timings.push(elapsed)
        texts.push(text)
        console.log(`  attempt ${attempt + 1}: ${accurate ? 'accurate' : 'wrong text'}, ${elapsed} ms`)
      } catch (error) {
        timings.push(3_000)
        const status = (await evaluate("document.querySelector('#app-status')?.textContent || ''"))?.value
        texts.push(`TIMEOUT: ${error.message}; status: ${status}`)
        console.log(`  attempt ${attempt + 1}: timeout`)
      }
    }
    results.push({ title: title.name, version: title.version, expected: title.expected.source, passed, timings, texts })
    stop(game)
    await delay(250)
    if (game.exitCode === null) {
      try { process.kill(-game.pid, 'SIGKILL') } catch {}
    }
  }

  for (const result of results) {
    console.log(`${result.title} ${result.version}: ${result.passed}/5 under 3000 ms; timings ${result.timings.join(', ')} ms; sample "${result.texts[0]}"`)
    assert(result.passed >= 4, `${result.title} did not reach 80% accurate reads under three seconds`)
  }
  const passed = results.reduce((total, result) => total + result.passed, 0)
  assert(passed >= 20, `Only ${passed}/25 five-title trials passed`)
  console.log(`PASS five-title compatibility: ${passed}/25 accurate reads completed under 3000 ms`)
} finally {
  await inspectorBrowser?.close()
  for (const child of children.reverse()) stop(child)
  await delay(250)
  rmSync(scratch, { recursive: true, force: true })
}
