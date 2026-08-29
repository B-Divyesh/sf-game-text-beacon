import { expect, test } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { readFileSync } from 'node:fs'

test('the static 404 uses same-origin CSS under the production CSP and keeps the shared shell', async ({ page }) => {
  const notFound = readFileSync('public/404.html', 'utf8')
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/missing-note', (route) => route.fulfill({
    status: 404,
    contentType: 'text/html; charset=utf-8',
    headers: { 'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
    body: notFound
  }))
  const response = await page.goto('/missing-note')
  expect(response?.status()).toBe(404)
  await expect(page.locator('header .wordmark')).toBeVisible()
  await expect(page.locator('main h1')).toHaveText('This note is missing')
  await expect(page.locator('footer')).toContainText('Built by Param Factory')
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', '/404.css')
  expect(errors.filter((error) => /content security policy|inline style/i.test(error))).toEqual([])
})

test('@claim:sample-read starts the bundled sample and reports the observable reading state', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByRole('heading', { name: 'Hear a sample objective' })).toBeVisible()
  await expect(page.getByText('weathered radio tower')).toBeVisible()
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  await expect(page.locator('#demo-status')).toHaveText('Sample objective is reading.')
})

test('landing preview reads the bundled objective without a console or page error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  await expect(page.locator('#preview-status')).toHaveText('Sample objective is reading.')
  expect(errors).toEqual([])
})

test('@claim:demo-isolated writes and clears only demo storage during the demo flow', async ({ page }) => {
  await page.goto('/demo')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:game-text-beacon:visited'))).toBe('true')
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:game-text-beacon:visited'))).toBeNull()
  await expect(page.locator('#demo-status')).toContainText('Demo reset')
})

test('@claim:local-demo-network makes no third-party requests while using the demo', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  await expect(page.locator('#demo-status')).toContainText('reading')
  const origin = new URL(page.url()).origin
  expect(requests).not.toEqual([])
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true)
})

test('@claim:no-telemetry records no third-party request across the public sample flow', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await page.getByRole('button', { name: 'Try it with sample data' }).click()
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  const origin = new URL(page.url()).origin
  expect(requests).not.toEqual([])
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true)
})

test('@claim:no-payments lets a visitor use the complete sample flow without a checkout, account, or payment request', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await page.getByRole('button', { name: 'Try it with sample data' }).click()
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  await expect(page.locator('form, input[type="email"], input[type="password"], [data-payment], [data-checkout]')).toHaveCount(0)
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
})

test('@claim:no-cloud-screenshots keeps a frame preview inside the local desktop bridge with no third-party request', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as string[],
      async invoke(command: string) {
        this.calls.push(command)
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Shift+R', isRegistered: true, error: null }
        if (command === 'capture_preview') return { pngBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9J7hAAAAAASUVORK5CYII=', width: 1000, height: 600 }
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Choose capture frame' }).click()
  await expect(page.locator('dialog')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: string[] } }).__BEACON_DESKTOP_BRIDGE__.calls)).toEqual(['get_settings', 'get_hotkey_status', 'capture_preview'])
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
})

test('@claim:free-no-account lets a visitor use the sample without authentication or payment', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try it with sample data' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByRole('heading', { name: 'Hear a sample objective' })).toBeVisible()
  await expect(page.locator('form input, form button[type="submit"]')).toHaveCount(0)
})

test('navigation moves focus to the new page heading and updates canonical metadata', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.locator('h1')).toBeFocused()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/)
  await page.goBack()
  await expect(page.locator('h1')).toBeFocused()
})

test('download control remains hidden until a same-origin published manifest offers an asset', async ({ page }) => {
  await page.route('**/latest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'test', assets: {} }) }))
  await page.goto('/')
  await expect(page.locator('#download-link')).toBeHidden()
  await expect(page.locator('#download-status')).toHaveText('Downloads are being published.')
})

test('checked-in release manifest exposes the detected desktop download', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#download-link')).toBeVisible()
  await expect(page.locator('#download-link')).toHaveAttribute('href', /github\.com\/B-Divyesh\/sf-game-text-beacon\/releases\/download\/v[^/]+\//)
})

test('the Linux landing page selects the Debian package with local OCR and speech', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64)' }))
  await page.route('**/latest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'test', assets: {
    'Game.Text.Beacon_0.1.1_amd64.AppImage': 'https://example.test/beacon.AppImage',
    'Game.Text.Beacon_0.1.1_amd64.deb': 'https://example.test/beacon.deb'
  } }) }))
  await page.goto('/')
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://example.test/beacon.deb')
  await expect(page.locator('#download-status')).toContainText('includes local Tesseract OCR, English data, and eSpeak NG speech')
})

test('the Windows landing page says its offered package includes local OCR and English data', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }))
  await page.route('**/latest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'test', assets: {
    'Game.Text.Beacon_0.1.10_x64_en-US.msi': 'https://example.test/beacon.msi'
  } }) }))
  await page.goto('/')
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://example.test/beacon.msi')
  await expect(page.locator('#download-status')).toContainText('includes local Tesseract OCR and English data')
})

test('390px mobile layout has no horizontal overflow and keeps navigation, home, and demo controls touch-sized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const sizes = await page.locator('.wordmark, .site-head nav a, .demo-banner a, #reset-demo').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }
  }))
  expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true)
})

test('390px layout reflows at 200% text size, including a long Debian package filename', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64)' }))
  await page.route('**/latest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ assets: {
    'Game.Text.Beacon_0.1.5_amd64_with_local_tesseract_ocr_and_accessibility_repair.deb': 'https://example.test/beacon.deb'
  } }) }))
  for (const route of ['/', '/demo']) {
    await page.goto(route)
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('@claim:capture-frame lets a player draw, move, resize, and save a frame with pointer and keyboard', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as Array<{ command: string, args: Record<string, unknown> }>,
      settings: { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' },
      async invoke(command: string, args: Record<string, unknown>) {
        this.calls.push({ command, args })
        if (command === 'get_settings') return this.settings
        if (command === 'get_hotkey_status') return { hotkey: this.settings.hotkey, isRegistered: true, error: null }
        if (command === 'capture_preview') return { pngBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9J7hAAAAAASUVORK5CYII=', width: 1000, height: 600 }
        if (command === 'save_settings') { this.settings = (args as { settings: typeof this.settings }).settings; return }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Choose capture frame' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const editor = page.locator('#picker-stage')
  await expect(page.locator('#picker-help')).toContainText('Keyboard: focus the preview')
  await expect(editor).toHaveAttribute('aria-describedby', /picker-help picker-status/)
  const pickerAxe = await new AxeBuilder({ page }).analyze()
  expect(pickerAxe.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([])
  const editorBox = await editor.boundingBox()
  expect(editorBox).not.toBeNull()
  const box = editorBox!
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5)
  await page.mouse.up()
  const drawn = await page.locator('#frame-x, #frame-y, #frame-width, #frame-height').evaluateAll((inputs) => inputs.map((input) => Number((input as HTMLInputElement).value)))
  expect(drawn[2]).toBeGreaterThan(20)
  expect(drawn[3]).toBeGreaterThan(20)
  const selection = page.locator('#selection')
  const selectionBox = await selection.boundingBox()
  expect(selectionBox).not.toBeNull()
  await page.mouse.move(selectionBox!.x + selectionBox!.width / 2, selectionBox!.y + selectionBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(selectionBox!.x + selectionBox!.width / 2 + 20, selectionBox!.y + selectionBox!.height / 2 + 20)
  await page.mouse.up()
  const moved = await page.locator('#frame-x, #frame-y, #frame-width, #frame-height').evaluateAll((inputs) => inputs.map((input) => Number((input as HTMLInputElement).value)))
  expect(moved[0]).toBeGreaterThan(drawn[0])
  expect(moved[1]).toBeGreaterThan(drawn[1])
  const handle = page.locator('.resize-handle')
  const handleBox = await handle.boundingBox()
  expect(handleBox).not.toBeNull()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 20, handleBox!.y + handleBox!.height / 2 + 20)
  await page.mouse.up()
  const resized = await page.locator('#frame-x, #frame-y, #frame-width, #frame-height').evaluateAll((inputs) => inputs.map((input) => Number((input as HTMLInputElement).value)))
  expect(resized[2]).toBeGreaterThan(moved[2])
  expect(resized[3]).toBeGreaterThan(moved[3])
  await editor.focus()
  await expect(editor).toBeFocused()
  await page.keyboard.press('m')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#picker-status')).toContainText('Frame moved with keyboard')
  await page.keyboard.press('d')
  await expect(page.locator('#picker-status')).toContainText('New frame started')
  await page.keyboard.press('m')
  await page.keyboard.press('r')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(page.locator('#picker-status')).toContainText('Frame resized with keyboard')
  await page.getByRole('button', { name: 'Use this capture frame' }).click()
  await expect(page.locator('#app-status')).toContainText('Capture frame saved')
  const saved = await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { settings: { region: { x: number, y: number, width: number, height: number } } } }).__BEACON_DESKTOP_BRIDGE__.settings.region)
  expect(saved.width).toBeGreaterThanOrEqual(20)
  expect(saved.height).toBeGreaterThanOrEqual(20)
})

test('desktop settings startup rejection shows usable default settings and a retry recovery control', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    let attempts = 0
    const bridge = {
      async invoke(command: string) {
        if (command === 'get_settings') {
          attempts += 1
          if (attempts === 1) throw new Error('settings unavailable')
          return { region: { x: 12, y: 24, width: 320, height: 160 }, hotkey: 'Ctrl+Alt+B' }
        }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Alt+B', isRegistered: true, error: null }
        if (command === 'capture_region') return 'Recovered local text.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await expect(page.locator('#app-status')).toContainText('Using a new local frame')
  await expect(page.getByRole('button', { name: 'Retry saved settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Read this frame' }).click()
  await expect(page.locator('#queue')).toContainText('Recovered local text.')
  await page.getByRole('button', { name: 'Retry saved settings' }).click()
  await expect(page.locator('#app-status')).toContainText('Ctrl+Alt+B is ready')
  expect(errors).toEqual([])
})

test('startup hotkey conflict is announced and the suggested alternate recovers', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      settings: { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' },
      hotkeyStatus: { hotkey: 'Ctrl+Shift+R', isRegistered: false, error: 'That hotkey is unavailable: HotKey already registered.' },
      async invoke(command: string, args: Record<string, unknown>) {
        if (command === 'get_settings') return this.settings
        if (command === 'get_hotkey_status') return this.hotkeyStatus
        if (command === 'save_settings') {
          this.settings = (args as { settings: typeof this.settings }).settings
          this.hotkeyStatus = { hotkey: this.settings.hotkey, isRegistered: true, error: null }
        }
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  const hotkey = page.getByLabel('Capture hotkey')
  const status = page.getByRole('status')
  await expect(status).toContainText('Ctrl+Shift+R is not active')
  await expect(status).toContainText('Read this frame remains available')
  await expect(hotkey).toHaveAttribute('aria-invalid', 'true')
  const alternate = page.getByRole('button', { name: 'Try Ctrl+Alt+R' })
  await expect(alternate).toBeVisible()
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([])
  await alternate.click()
  await expect(hotkey).toHaveValue('Ctrl+Alt+R')
  await expect(hotkey).not.toHaveAttribute('aria-invalid', 'true')
  await expect(status).toHaveText('Ctrl+Alt+R is ready for the saved frame.')
  await expect(alternate).toBeHidden()
})

test('@claim:reading-queue queues consecutive native captures for speech without cancelling the current utterance', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as Array<{ command: string, text?: string }>,
      async invoke(command: string, args: { text?: string }) {
        this.calls.push({ command, text: args.text })
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Shift+R', isRegistered: true, error: null }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('beacon-read', { detail: { text: 'First capture.' } }))
    window.dispatchEvent(new CustomEvent('beacon-read', { detail: { text: 'Second capture.' } }))
  })
  await expect(page.locator('#queue')).toContainText('First capture.')
  await expect(page.locator('#queue')).toContainText('Second capture.')
  await expect(page.locator('#app-status')).toContainText('Text added to the reading queue.')
  await expect.poll(() => page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: Array<{ command: string, text?: string }> } }).__BEACON_DESKTOP_BRIDGE__.calls.filter((call) => call.command === 'speak_text'))).toEqual([
    { command: 'speak_text', text: 'First capture.' }, { command: 'speak_text', text: 'Second capture.' }
  ])
  await page.getByRole('button', { name: 'Stop reading' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: Array<{ command: string }> } }).__BEACON_DESKTOP_BRIDGE__.calls.at(-1)?.command)).toBe('stop_speech')
})

test('desktop speech falls back to the native bridge when WebKit speech globals are absent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined })
    const bridge = {
      calls: [] as Array<{ command: string, args: Record<string, unknown> }>,
      async invoke(command: string, args: Record<string, unknown>) {
        this.calls.push({ command, args })
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Shift+R', isRegistered: true, error: null }
        if (command === 'capture_region') return 'Native speech works without Web Speech.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Read this frame' }).click()
  await expect(page.locator('#queue')).toContainText('Native speech works without Web Speech.')
  await expect.poll(() => page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: Array<{ command: string }> } }).__BEACON_DESKTOP_BRIDGE__.calls.some((call) => call.command === 'speak_text'))).toBe(true)
  expect(errors).toEqual([])
})

test('@claim:gamepad-read reads the saved frame exactly once for one controller-button press', async ({ page }) => {
  await page.addInitScript(() => {
    const controller = { buttons: [{ pressed: false }] }
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [controller] })
    const bridge = {
      calls: [] as string[],
      async invoke(command: string) {
        this.calls.push(command)
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Shift+R', isRegistered: true, error: null }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge, __testController__: typeof controller }).__BEACON_DESKTOP_BRIDGE__ = bridge
    ;(window as unknown as { __testController__: typeof controller }).__testController__ = controller
  })
  await page.goto('/?app')
  await page.evaluate(() => { (window as unknown as { __testController__: { buttons: Array<{ pressed: boolean }> } }).__testController__.buttons[0].pressed = true })
  await expect(page.locator('#queue')).toContainText('Find the weathered radio tower.')
  await page.waitForTimeout(250)
  const calls = await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: string[] } }).__BEACON_DESKTOP_BRIDGE__.calls)
  expect(calls.filter((command) => command === 'capture_region')).toHaveLength(1)
  await expect(page.locator('#queue article')).toHaveCount(1)
})

test('@claim:no-game-automation sends a read request without any game-control command', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as string[],
      async invoke(command: string) {
        this.calls.push(command)
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'get_hotkey_status') return { hotkey: 'Ctrl+Shift+R', isRegistered: true, error: null }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Read this frame' }).click()
  const calls = await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: string[] } }).__BEACON_DESKTOP_BRIDGE__.calls)
  expect(calls).toEqual(['get_settings', 'get_hotkey_status', 'capture_region', 'speak_text'])
})

test('keyboard starts with the skip link and enters the demo with Enter', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.getByRole('button', { name: 'Try it with sample data' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/demo$/)
})

test('essential routes are accessible and have no serious axe findings', async ({ page }) => {
  for (const route of ['/', '/demo', '/privacy', '/terms', '/missing-note']) {
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))).toEqual([])
  }
})
