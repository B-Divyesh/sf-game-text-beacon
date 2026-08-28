import './style.css'
import { demoKey, queueRead, sampleRead, type ReadItem } from './logic'

type Region = { x: number; y: number; width: number; height: number }
type DesktopSettings = { region: Region; hotkey: string }
type DisplayPreview = { pngBase64: string; width: number; height: number }
type DesktopBridge = {
  invoke: (command: string, args: Record<string, unknown>) => Promise<unknown>
  listen?: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>
}

declare global { interface Window { __BEACON_DESKTOP_BRIDGE__?: DesktopBridge } }

const app = document.querySelector<HTMLDivElement>('#app')!
const isDesktop = '__TAURI_INTERNALS__' in window || new URLSearchParams(location.search).has('app')
const isDemoRoute = () => location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1'

const listen = (selector: string, event: string, handler: (event: Event) => void) =>
  document.querySelector(selector)?.addEventListener(event, handler)

function setCanonical(path: string) {
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://game-text-beacon.sociobot.in${path}`)
}

function focusRoute() {
  const heading = document.querySelector<HTMLElement>('main h1')
  if (heading) { heading.tabIndex = -1; heading.focus() }
  const live = document.querySelector<HTMLElement>('.route-status')
  if (live && heading) live.textContent = `${document.title}. ${heading.textContent}`
}

function navigate(path: string) {
  history.pushState({}, '', path)
  render()
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  focusRoute()
}

function shell(content: string, title: string, description: string) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  setCanonical(location.pathname)
  app.innerHTML = `<a class="skip" href="#main">Skip to content</a>
    <header class="site-head"><a class="wordmark" href="/" data-link><span aria-hidden="true">⌜◉⌟</span> Game Text Beacon</a>
    <nav aria-label="Main navigation"><a href="/demo" data-link>Demo</a><a href="/privacy" data-link>Privacy</a><a href="/terms" data-link>Terms</a></nav></header>
    <div class="route-status" aria-live="polite" aria-atomic="true"></div>${content}
    <footer><p>Read game text aloud from a chosen region.</p><p><a href="/privacy" data-link>Privacy</a> · <a href="/terms" data-link>Terms</a> · Built by Param Factory · v0.1.1</p><p class="tiny">Notebook art is original generated product art.</p></footer>`
  document.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault(); navigate(link.getAttribute('href') || '/')
  }))
}

function demoBanner() {
  return `<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><button id="reset-demo" class="text-button">Reset demo</button><a href="/" data-link>Start for real</a></aside>`
}

function landing() {
  shell(`<main id="main" tabindex="-1">
    <section class="hero ink-lines"><div class="hero-copy"><p class="eyebrow">A local reading tool for PC games</p>
      <h1>Read game text aloud</h1>
      <p class="lede">For blind and low-vision players when a game only shows text on screen.</p>
      <div class="actions"><button class="primary" id="try-demo">Try it with sample data</button><span>Hear a sample objective right away.</span></div>
      <ul class="facts"><li>Free to use.</li><li>Made for windowed games.</li><li>Choose the text region yourself.</li></ul></div>
      <figure><img src="/beacon-notebook.webp" width="1024" height="1024" fetchpriority="high" decoding="async" alt="A notebook inside a blue hand-drawn screen selection frame." /><figcaption>Point the frame at the words you need.</figcaption></figure></section>
    <section class="live-note" aria-labelledby="preview-heading"><div><p class="eyebrow">Preview</p><h2 id="preview-heading">A reading queue, not game automation</h2><p>Beacon reads the selected words. It does not press game controls or change a game.</p></div><div class="sample-slip"><span>Sample objective</span><p>${sampleRead.text}</p><button id="preview-read">Read sample objective</button></div></section>
    <section class="steps" aria-labelledby="how-heading"><h2 id="how-heading">Read a region in three steps</h2><ol><li><strong>Draw a frame.</strong><span>Draw and resize one region over dialogue, a menu, or an objective.</span></li><li><strong>Press your hotkey.</strong><span>Beacon captures that region from a windowed or borderless game.</span></li><li><strong>Hear the result.</strong><span>Each result joins a queue you can repeat or stop.</span></li></ol></section>
    <section class="walkthrough" aria-labelledby="walkthrough-heading"><p class="eyebrow">Desktop walkthrough</p><h2 id="walkthrough-heading">Set up a reading frame</h2><div class="desktop-shots"><figure><div class="desktop-shot" aria-hidden="true"><b>Capture frame</b><span>960 × 260 px</span><i>Choose capture frame</i></div><figcaption><strong>1. Open Beacon.</strong> Your saved frame and default hotkey are ready.</figcaption></figure><figure><div class="desktop-shot picker-shot" aria-hidden="true"><b>Draw your capture frame</b><span class="mini-frame"></span><i>Display preview</i></div><figcaption><strong>2. Choose capture frame.</strong> Draw, move, or resize the frame on a fresh display preview.</figcaption></figure><figure><div class="desktop-shot" aria-hidden="true"><b>Reading queue</b><span>Find the weathered radio tower.</span><i>Text added locally</i></div><figcaption><strong>3. Save and read.</strong> Press the hotkey to add local OCR text to the queue.</figcaption></figure></div></section>
    <section class="download-note" aria-labelledby="install-heading"><p class="eyebrow">Desktop app</p><h2 id="install-heading">Install Game Text Beacon</h2><p id="download-status">Downloads are being published.</p><a id="download-link" class="primary link-button" hidden>Download desktop app</a><p class="tiny">Desktop packages are unsigned. macOS may require Control-click → Open. Windows may show a security warning.</p></section>
    <section class="limits" aria-labelledby="limits-heading"><h2 id="limits-heading">What Beacon does not do</h2><p>It does not automate play, bypass anti-cheat, work in exclusive fullscreen, or send screenshots to a cloud service.</p><p>Use it in single-player or accessibility-safe contexts. If a game’s anti-cheat policy is unclear, do not run it alongside that game.</p></section>
  </main>`, 'Game Text Beacon — Read game text aloud', 'Read unsupported game text aloud from a chosen screen region.')
  listen('#try-demo', 'click', () => navigate('/demo'))
  listen('#preview-read', 'click', () => speak(sampleRead.text, 'Sample objective is reading.'))
  void loadDownloads()
}

async function loadDownloads() {
  const statusNode = document.querySelector('#download-status')!
  const link = document.querySelector<HTMLAnchorElement>('#download-link')!
  try {
    const response = await fetch('/latest.json', { cache: 'no-store' })
    if (!response.ok) return
    const release = await response.json() as { assets?: Record<string, string> }
    const assets = Object.entries(release.assets || {})
    const agent = navigator.userAgent.toLowerCase()
    // Debian packages declare Tesseract as a dependency. Prefer that one so a
    // Linux download can complete the actual local OCR job after install.
    const extensions = agent.includes('win') ? ['.msi', '.exe'] : agent.includes('mac') ? ['.dmg'] : ['.deb']
    const asset = assets.find(([name]) => extensions.some((extension) => name.toLowerCase().endsWith(extension)))
    if (!asset) return
    statusNode.textContent = agent.includes('linux') ? `A package for this computer is ready: ${asset[0]}. It installs local Tesseract OCR too.` : `A package for this computer is ready: ${asset[0]}.`
    link.href = asset[1]; link.hidden = false
  } catch {
    // The calm, usable fallback above is intentional for an offline landing page.
  }
}

function demo() {
  shell(`<main id="main" tabindex="-1">${demoBanner()}<section class="demo-screen ink-lines"><div><p class="eyebrow">Sample run</p><h1>Hear a sample objective</h1><p class="lede">This shows the queue after Beacon reads a selected game region.</p><button class="primary" id="read-sample">Read sample objective</button><p class="status" id="demo-status" aria-live="polite">Ready to read the sample objective.</p></div><article class="read-card" aria-label="Sample reading result"><p class="notebook-label">Sample objective panel</p><p>${sampleRead.text}</p><div><button id="repeat-sample">Repeat</button><button id="stop-sample" class="quiet">Stop reading</button></div></article></section></main>`, 'Demo — Game Text Beacon', 'Try a local sample objective reading.')
  localStorage.setItem(demoKey('visited'), 'true')
  listen('#read-sample', 'click', () => speak(sampleRead.text, 'Sample objective is reading.'))
  listen('#repeat-sample', 'click', () => speak(sampleRead.text, 'Repeating sample objective.'))
  listen('#stop-sample', 'click', () => { speechSynthesis.cancel(); status('Reading stopped.') })
  listen('#reset-demo', 'click', () => { localStorage.removeItem(demoKey('visited')); status('Demo reset. The sample is ready again.') })
}

function info(kind: 'privacy' | 'terms') {
  const privacy = kind === 'privacy'
  shell(`<main id="main" tabindex="-1" class="legal"><p class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</p><h1>${privacy ? 'Your captures stay local' : 'Use Beacon safely'}</h1>
    ${privacy ? `<p>Game Text Beacon processes a selected screen region on your computer. It has no account, cloud OCR, or cloud screenshot upload.</p><h2>Stored settings</h2><p>The desktop app stores your saved region and hotkey on your device. Demo settings use a separate browser key and reset independently.</p>` : `<p>Game Text Beacon is free software for reading visual game text. You remain responsible for following each game’s rules.</p><h2>Anti-cheat guidance</h2><p>Use Beacon only where screen capture helpers are allowed. It does not bypass anti-cheat or alter a game. Do not use it in competitive multiplayer if the game policy forbids capture helpers.</p><h2>No warranty</h2><p>The software is provided as is. Text recognition can make mistakes. Check important text before acting on it.</p>`}
  </main>`, `${privacy ? 'Privacy' : 'Terms'} — Game Text Beacon`, privacy ? 'How Game Text Beacon handles local settings and captures.' : 'Terms and anti-cheat guidance for Game Text Beacon.')
}

function notFound() {
  shell(`<main id="main" tabindex="-1" class="not-found"><p class="eyebrow">Page not found</p><h1>This note is missing</h1><p>Try the home page to start a sample reading.</p><a class="primary link-button" href="/" data-link>Go to home</a></main>`, 'Page not found — Game Text Beacon', 'This Game Text Beacon page was not found.')
}

function status(message: string) { document.querySelector<HTMLElement>('.status')!.textContent = message }
function speak(text: string, message: string) {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.92
  speechSynthesis.speak(utterance)
  status(message)
}

async function desktop() {
  document.title = 'Game Text Beacon — Read game text aloud'
  app.innerHTML = `<main class="desktop-shell" id="main" tabindex="-1"><header class="app-head"><div><p class="eyebrow">Game Text Beacon</p><h1>Read a saved screen region</h1></div><span class="app-state">Local mode</span></header>
    <section class="app-grid"><section class="region-panel" aria-labelledby="region-title"><h2 id="region-title">Capture frame</h2><p>Choose capture frame to draw, move, and resize it on a fresh display preview. Beacon only captures this rectangle.</p><div class="frame" aria-label="Saved capture frame preview"><span>Saved game text frame</span><b id="frame-size">Loading saved frame…</b><small id="frame-position"></small></div><button class="primary" id="choose-frame">Choose capture frame</button><button id="read-frame">Read this frame</button><label>Capture hotkey <input id="hotkey" value="Ctrl+Shift+R" aria-describedby="hotkey-help" /></label><p id="hotkey-help" class="tiny">The displayed hotkey registers when Beacon starts and after you save it. A connected controller’s first button also reads the saved frame while Beacon is open.</p><button class="primary" id="save-settings">Save frame and hotkey</button><p id="app-status" class="status" aria-live="polite">Loading saved settings.</p></section>
    <section class="queue-panel" aria-labelledby="queue-title"><div class="queue-heading"><h2 id="queue-title">Reading queue</h2><button id="stop-all" class="quiet">Stop reading</button></div><div id="queue" class="queue-empty"><p>No reads yet.</p><span>Your captured text will appear here.</span></div></section></section>
    <section class="app-note"><h2>Before you use Beacon in a game</h2><p>Use windowed or borderless mode. Check the game’s anti-cheat policy. Beacon does not bypass anti-cheat and should not be used where capture helpers are forbidden.</p></section></main>`
  let settings = await invokeDesktop('get_settings', {}) as DesktopSettings
  let reads: ReadItem[] = []
  const appStatus = () => document.querySelector<HTMLElement>('#app-status')!
  const updateFrame = () => {
    document.querySelector('#frame-size')!.textContent = `${settings.region.width} × ${settings.region.height} px`
    document.querySelector('#frame-position')!.textContent = `Starts at ${settings.region.x}, ${settings.region.y} on the primary display.`
    document.querySelector<HTMLInputElement>('#hotkey')!.value = settings.hotkey
  }
  const saveSettings = async (message = 'Frame and hotkey saved. The hotkey now uses this frame.') => {
    settings.hotkey = document.querySelector<HTMLInputElement>('#hotkey')!.value.trim()
    if (!settings.hotkey) { appStatus().textContent = 'Enter a hotkey, then save it.'; return }
    try { await invokeDesktop('save_settings', { settings }); updateFrame(); appStatus().textContent = message }
    catch (error) { appStatus().textContent = `Could not save the frame and hotkey. ${String(error)}` }
  }
  updateFrame()
  appStatus().textContent = `${settings.hotkey} is ready for the saved frame.`
  const readFrame = async () => {
    appStatus().textContent = 'Reading the saved capture frame locally.'
    try { await addRead(await invokeDesktop('capture_region', { region: settings.region }) as string) }
    catch (error) { appStatus().textContent = String(error) }
  }
  listen('#choose-frame', 'click', () => { void chooseFrame() })
  listen('#read-frame', 'click', () => { void readFrame() })
  listen('#save-settings', 'click', () => { void saveSettings() })
  listen('#stop-all', 'click', () => { speechSynthesis.cancel(); appStatus().textContent = 'Reading stopped.' })
  window.addEventListener('beacon-read', (event) => { void addRead((event as CustomEvent<{ text: string }>).detail.text) })
  await listenDesktop<{ text: string }>('beacon-read', (event) => { void addRead(event.payload.text) })
  await listenDesktop<{ error: string }>('beacon-error', (event) => { appStatus().textContent = event.payload.error })
  async function chooseFrame() {
    appStatus().textContent = 'Taking a local display preview. Nothing leaves this computer.'
    try { openFramePicker(await invokeDesktop('capture_preview', {}) as DisplayPreview) }
    catch (error) { appStatus().textContent = `Could not open the frame picker. ${String(error)}` }
  }
  function openFramePicker(preview: DisplayPreview) {
    const dialog = document.createElement('dialog')
    dialog.className = 'frame-picker'
    dialog.innerHTML = `<form method="dialog" class="picker-head"><strong>Draw your capture frame</strong><button aria-label="Close frame picker">Close</button></form><p>Drag on the current display preview. Drag inside the blue frame to move it. Drag its corner to resize it.</p><div class="picker-stage" id="picker-stage"><img draggable="false" alt="Current primary display preview used to choose a local capture frame." src="data:image/png;base64,${preview.pngBase64}"><div class="selection" id="selection"><i class="resize-handle" aria-hidden="true"></i></div></div><div class="picker-actions"><button id="use-frame" class="primary">Use this capture frame</button><button id="cancel-frame">Cancel</button></div>`
    document.body.append(dialog); dialog.showModal()
    const stage = dialog.querySelector<HTMLElement>('#picker-stage')!
    const selection = dialog.querySelector<HTMLElement>('#selection')!
    let selected: Region = { ...settings.region }
    const draw = () => {
      const bounds = stage.getBoundingClientRect()
      selection.style.left = `${selected.x / preview.width * bounds.width}px`
      selection.style.top = `${selected.y / preview.height * bounds.height}px`
      selection.style.width = `${selected.width / preview.width * bounds.width}px`
      selection.style.height = `${selected.height / preview.height * bounds.height}px`
    }
    const toDisplay = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect()
      return { x: Math.max(0, Math.min(preview.width, (event.clientX - bounds.left) / bounds.width * preview.width)), y: Math.max(0, Math.min(preview.height, (event.clientY - bounds.top) / bounds.height * preview.height)) }
    }
    let mode: 'draw' | 'move' | 'resize' = 'draw'; let start = { x: 0, y: 0 }; let origin = { ...selected }
    stage.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement
      start = toDisplay(event); origin = { ...selected }
      mode = target.classList.contains('resize-handle') ? 'resize' : selection.contains(target) ? 'move' : 'draw'
      if (mode === 'draw') selected = { x: start.x, y: start.y, width: 1, height: 1 }
      stage.setPointerCapture(event.pointerId); draw(); event.preventDefault()
    })
    stage.addEventListener('pointermove', (event) => {
      if (!stage.hasPointerCapture(event.pointerId)) return
      const point = toDisplay(event)
      if (mode === 'move') { selected.x = Math.max(0, Math.min(preview.width - origin.width, origin.x + point.x - start.x)); selected.y = Math.max(0, Math.min(preview.height - origin.height, origin.y + point.y - start.y)) }
      else if (mode === 'resize') { selected.width = Math.max(20, Math.min(preview.width - selected.x, origin.width + point.x - start.x)); selected.height = Math.max(20, Math.min(preview.height - selected.y, origin.height + point.y - start.y)) }
      else { selected = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.max(20, Math.abs(point.x - start.x)), height: Math.max(20, Math.abs(point.y - start.y)) }; selected.width = Math.min(selected.width, preview.width - selected.x); selected.height = Math.min(selected.height, preview.height - selected.y) }
      draw()
    })
    stage.addEventListener('pointerup', (event) => { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId) })
    dialog.querySelector('#cancel-frame')?.addEventListener('click', () => dialog.close())
    dialog.querySelector('#use-frame')?.addEventListener('click', (event) => {
      event.preventDefault(); settings.region = Object.fromEntries(Object.entries(selected).map(([key, value]) => [key, Math.round(value)])) as Region
      dialog.close(); void saveSettings('Capture frame saved and hotkey updated for it.')
    })
    dialog.querySelector('img')?.addEventListener('load', draw)
    dialog.addEventListener('close', () => dialog.remove()); draw()
  }
  async function addRead(text: string) {
    reads = queueRead(reads, { id: crypto.randomUUID(), source: 'Screen region', text, at: new Date().toLocaleTimeString() })
    const queue = document.querySelector('#queue')!
    queue.className = ''
    queue.innerHTML = reads.map((read) => `<article class="read-item"><p class="notebook-label">${read.source} · ${read.at}</p><p>${escapeHtml(read.text)}</p><button data-read="${read.id}">Read again</button></article>`).join('')
    queue.querySelectorAll<HTMLButtonElement>('[data-read]').forEach((button) => button.addEventListener('click', () => {
      const read = reads.find((item) => item.id === button.dataset.read); if (read) speak(read.text, 'Reading selected text.')
    }))
    speak(text, 'Text added to the reading queue.')
  }
  let lastPress = false
  window.setInterval(() => { const controller = navigator.getGamepads?.()[0]; if (!controller) return; const pressed = Boolean(controller.buttons[0]?.pressed); if (pressed && !lastPress) void readFrame(); lastPress = pressed }, 100)
}

async function invokeDesktop(command: string, args: Record<string, unknown>) {
  const bridge = window.__BEACON_DESKTOP_BRIDGE__
  if (bridge) return bridge.invoke(command, args)
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(command, args)
}
async function listenDesktop<T>(event: string, handler: (event: { payload: T }) => void) {
  const bridge = window.__BEACON_DESKTOP_BRIDGE__
  if (bridge?.listen) return bridge.listen<T>(event, handler)
  const { listen } = await import('@tauri-apps/api/event')
  return listen<T>(event, handler)
}
function escapeHtml(value: string) { const d = document.createElement('div'); d.textContent = value; return d.innerHTML }

function render() {
  if (isDesktop) { void desktop(); return }
  if (location.pathname === '/' && isDemoRoute()) { navigate('/demo'); return }
  if (isDemoRoute()) return demo()
  if (location.pathname === '/') return landing()
  if (location.pathname === '/privacy') return info('privacy')
  if (location.pathname === '/terms') return info('terms')
  return notFound()
}
window.addEventListener('popstate', () => { render(); focusRoute() })
render()
