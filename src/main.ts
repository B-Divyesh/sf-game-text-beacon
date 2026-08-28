import './style.css'
import { demoKey, queueRead, sampleRead, type ReadItem } from './logic'

const app = document.querySelector<HTMLDivElement>('#app')!
const isDesktop = '__TAURI_INTERNALS__' in window || new URLSearchParams(location.search).has('app')
const isDemoRoute = () => location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1'

const listen = (selector: string, event: string, handler: (event: Event) => void) =>
  document.querySelector(selector)?.addEventListener(event, handler)

function navigate(path: string) {
  history.pushState({}, '', path)
  render()
  document.querySelector('h1')?.focus()
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}

function shell(content: string, title: string, description: string) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  app.innerHTML = `<a class="skip" href="#main">Skip to content</a>
    <header class="site-head"><a class="wordmark" href="/" data-link><span aria-hidden="true">⌜◉⌟</span> Game Text Beacon</a>
    <nav aria-label="Main navigation"><a href="/demo" data-link>Demo</a><a href="/privacy" data-link>Privacy</a><a href="/terms" data-link>Terms</a></nav></header>
    <div class="route-status" aria-live="polite" aria-atomic="true"></div>${content}
    <footer><p>Read game text aloud from a chosen region.</p><p><a href="/privacy" data-link>Privacy</a> · <a href="/terms" data-link>Terms</a> · Built by Param Factory · v0.1.0</p><p class="tiny">Notebook art is original generated product art.</p></footer>`
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
    <section class="steps" aria-labelledby="how-heading"><h2 id="how-heading">Read a region in three steps</h2><ol><li><strong>Set a frame.</strong><span>Move and size one region over dialogue, a menu, or an objective.</span></li><li><strong>Press your hotkey.</strong><span>Beacon captures that region from a windowed or borderless game.</span></li><li><strong>Hear the result.</strong><span>Each result joins a queue you can repeat or stop.</span></li></ol></section>
    <section class="download-note" aria-labelledby="install-heading"><p class="eyebrow">Desktop app</p><h2 id="install-heading">Install Game Text Beacon</h2><p id="download-status">Checking for a desktop download.</p><a id="download-link" class="primary link-button" hidden>Download desktop app</a><p class="tiny">Desktop packages are unsigned. macOS may require Control-click → Open. Windows may show a security warning.</p></section>
    <section class="limits" aria-labelledby="limits-heading"><h2 id="limits-heading">What Beacon does not do</h2><p>It does not automate play, bypass anti-cheat, work in exclusive fullscreen, or send screenshots to a cloud service.</p><p>Use it in single-player or accessibility-safe contexts. If a game’s anti-cheat policy is unclear, do not run it alongside that game.</p></section>
  </main>`, 'Game Text Beacon — Read game text aloud', 'Read unsupported game text aloud from a chosen screen region.')
  listen('#try-demo', 'click', () => navigate('/demo'))
  listen('#preview-read', 'click', () => speak(sampleRead.text, 'Sample objective is reading.'))
  void loadDownloads()
}

async function loadDownloads() {
  const statusNode = document.querySelector('#download-status')!
  const link = document.querySelector<HTMLAnchorElement>('#download-link')!
  const cacheKey = 'game-text-beacon:release'
  const fallback = 'https://github.com/B-Divyesh/sf-game-text-beacon/releases'
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') as { at: number; assets: { name: string; browser_download_url: string }[] } | null
    let release = cached
    if (!release || Date.now() - release.at > 3_600_000) {
      const response = await fetch('https://api.github.com/repos/B-Divyesh/sf-game-text-beacon/releases/latest')
      if (!response.ok) throw new Error('No published release')
      const data = await response.json() as { assets: { name: string; browser_download_url: string }[] }
      release = { at: Date.now(), assets: data.assets }
      localStorage.setItem(cacheKey, JSON.stringify(release))
    }
    const agent = navigator.userAgent.toLowerCase()
    const extensions = agent.includes('win') ? ['.msi', '.exe'] : agent.includes('mac') ? ['.dmg'] : ['.appimage', '.deb']
    const asset = release.assets.find((entry) => extensions.some((extension) => entry.name.toLowerCase().endsWith(extension)))
    if (!asset) throw new Error('No package for this platform')
    statusNode.textContent = `A package for this computer is ready: ${asset.name}.`
    link.href = asset.browser_download_url; link.hidden = false
  } catch {
    statusNode.innerHTML = `Downloads are being published. <a href="${fallback}" target="_blank" rel="noreferrer">Open the release page (opens in a new tab)</a>.`
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
    ${privacy ? `<p>Game Text Beacon is designed to process a selected screen region on your computer. It has no account, analytics, cloud OCR, or cloud screenshot upload.</p><h2>Stored settings</h2><p>The app stores your region and reading settings on your device. Demo settings use a separate browser key and reset independently.</p><h2>Support</h2><p>The published app does not send support data automatically.</p>` : `<p>Game Text Beacon is free software for reading visual game text. You remain responsible for following each game’s rules.</p><h2>Anti-cheat guidance</h2><p>Use Beacon only where screen capture overlays are allowed. It does not bypass anti-cheat or alter a game. Do not use it in competitive multiplayer if the game policy forbids overlays.</p><h2>No warranty</h2><p>The software is provided as is. Text recognition can make mistakes. Check important text before acting on it.</p>`}
  </main>`, `${privacy ? 'Privacy' : 'Terms'} — Game Text Beacon`, privacy ? 'How Game Text Beacon handles local settings and captures.' : 'Terms and anti-cheat guidance for Game Text Beacon.')
}

function notFound() {
  shell(`<main id="main" tabindex="-1" class="not-found"><p class="eyebrow">Page not found</p><h1>This note is missing</h1><p>Try the home page to start a sample reading.</p><a class="primary link-button" href="/" data-link>Go to home</a></main>`, 'Page not found — Game Text Beacon', 'This Game Text Beacon page was not found.')
}

function status(message: string) { document.querySelector('.status')!.textContent = message }
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
    <section class="app-grid"><section class="region-panel" aria-labelledby="region-title"><h2 id="region-title">Capture frame</h2><p>Set the frame over text, then press the hotkey. The app only captures this rectangle.</p><div class="frame" aria-label="Selected region preview"><span>Selected game text</span><b id="frame-size">960 × 260 px</b></div><div class="nudge-row" aria-label="Move the frame"><button data-move="up">Move up</button><button data-move="left">Move left</button><button data-move="right">Move right</button><button data-move="down">Move down</button></div><button class="primary" id="read-frame">Read this frame</button><label>Capture hotkey <input id="hotkey" value="Ctrl+Shift+R" aria-describedby="hotkey-help" /></label><p id="hotkey-help" class="tiny">Use a key combination not used by your game. A connected controller’s first button also reads the frame while Beacon is open.</p><button class="primary" id="save-hotkey">Save hotkey</button><p id="app-status" class="status" aria-live="polite">Ready. Choose a frame and press the hotkey.</p></section>
    <section class="queue-panel" aria-labelledby="queue-title"><div class="queue-heading"><h2 id="queue-title">Reading queue</h2><button id="stop-all" class="quiet">Stop reading</button></div><div id="queue" class="queue-empty"><p>No reads yet.</p><span>Your captured text will appear here.</span></div></section></section>
    <section class="app-note"><h2>Before you use Beacon in a game</h2><p>Use windowed or borderless mode. Check the game’s anti-cheat policy. Beacon does not bypass anti-cheat and should not be used where overlays are forbidden.</p></section></main>`
  let region = { x: 100, y: 100, width: 960, height: 260 }
  let reads: ReadItem[] = []
  const updateFrame = () => document.querySelector('#frame-size')!.textContent = `${region.width} × ${region.height} px`
  document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.move
    if (direction === 'up') region.y -= 20
    if (direction === 'down') region.y += 20
    if (direction === 'left') region.x -= 20
    if (direction === 'right') region.x += 20
    updateFrame(); (document.querySelector('#app-status')!).textContent = `Frame moved. It begins at ${region.x}, ${region.y}.`
  }))
  const readFrame = async () => {
    (document.querySelector('#app-status')!).textContent = 'Reading the capture frame locally.'
    try { await addRead(await invokeDesktop('capture_region', { region }) as string) } catch (error) { (document.querySelector('#app-status')!).textContent = String(error) }
  }
  listen('#read-frame', 'click', () => { void readFrame() })
  listen('#stop-all', 'click', () => { speechSynthesis.cancel(); (document.querySelector('#app-status')!).textContent = 'Reading stopped.' })
  listen('#save-hotkey', 'click', async () => {
    const hotkey = (document.querySelector<HTMLInputElement>('#hotkey')!).value.trim()
    if (!hotkey) { (document.querySelector('#app-status')!).textContent = 'Enter a hotkey, then save it.'; return }
    try { await invokeDesktop('set_hotkey', { hotkey, region }); (document.querySelector('#app-status')!).textContent = `${hotkey} is ready. Press it to capture the frame.` } catch (error) { (document.querySelector('#app-status')!).textContent = `Could not save the hotkey. ${String(error)}` }
  })
  window.addEventListener('beacon-read', ((event: CustomEvent<{ text: string }>) => addRead(event.detail.text)) as EventListener)
  const { listen: listenTauri } = await import('@tauri-apps/api/event')
  await listenTauri<{ text: string }>('beacon-read', (event) => { void addRead(event.payload.text) })
  await listenTauri<{ error: string }>('beacon-error', (event) => {
    (document.querySelector('#app-status')!).textContent = event.payload.error
  })
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
  window.setInterval(() => {
    const controller = navigator.getGamepads?.()[0]
    if (!controller) return
    const pressed = Boolean(controller.buttons[0]?.pressed)
    if (pressed && !lastPress) void readFrame()
    lastPress = pressed
  }, 100)
}

async function invokeDesktop(command: string, args: Record<string, unknown>) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(command, args)
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
window.addEventListener('popstate', render)
render()
