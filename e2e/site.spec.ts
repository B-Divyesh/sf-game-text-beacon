import { expect, test } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

test('@claim:sample-read starts the bundled sample and reports the observable reading state', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByRole('heading', { name: 'Hear a sample objective' })).toBeVisible()
  await expect(page.getByText('weathered radio tower')).toBeVisible()
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  await expect(page.locator('#demo-status')).toHaveText('Sample objective is reading.')
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

test('@claim:linux-ocr-package selects the Debian package that installs local Tesseract OCR', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64)' }))
  await page.route('**/latest.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 'test', assets: {
    'Game.Text.Beacon_0.1.1_amd64.AppImage': 'https://example.test/beacon.AppImage',
    'Game.Text.Beacon_0.1.1_amd64.deb': 'https://example.test/beacon.deb'
  } }) }))
  await page.goto('/')
  await expect(page.locator('#download-link')).toHaveAttribute('href', 'https://example.test/beacon.deb')
  await expect(page.locator('#download-status')).toContainText('installs local Tesseract OCR')
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

test('@claim:capture-frame lets a player draw a frame and persist it through the desktop bridge', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as Array<{ command: string, args: Record<string, unknown> }>,
      settings: { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' },
      async invoke(command: string, args: Record<string, unknown>) {
        this.calls.push({ command, args })
        if (command === 'get_settings') return this.settings
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
  await page.locator('#picker-stage').click({ position: { x: 80, y: 80 } })
  await page.getByRole('button', { name: 'Use this capture frame' }).click()
  await expect(page.locator('#app-status')).toContainText('Capture frame saved')
  const calls = await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: Array<{ command: string }> } }).__BEACON_DESKTOP_BRIDGE__.calls.map((call) => call.command))
  expect(calls).toContain('save_settings')
})

test('@claim:reading-queue adds only recognized capture text to the visible reading queue', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as string[],
      async invoke(command: string) {
        this.calls.push(command)
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Read this frame' }).click()
  await expect(page.locator('#queue')).toContainText('Find the weathered radio tower.')
  await expect(page.locator('#app-status')).toContainText('Text added to the reading queue.')
})

test('@claim:no-game-automation sends a read request without any game-control command', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = {
      calls: [] as string[],
      async invoke(command: string) {
        this.calls.push(command)
        if (command === 'get_settings') return { region: { x: 100, y: 100, width: 400, height: 180 }, hotkey: 'Ctrl+Shift+R' }
        if (command === 'capture_region') return 'Find the weathered radio tower.'
      },
      async listen() { return () => undefined }
    }
    ;(window as unknown as { __BEACON_DESKTOP_BRIDGE__: typeof bridge }).__BEACON_DESKTOP_BRIDGE__ = bridge
  })
  await page.goto('/?app')
  await page.getByRole('button', { name: 'Read this frame' }).click()
  const calls = await page.evaluate(() => (window as unknown as { __BEACON_DESKTOP_BRIDGE__: { calls: string[] } }).__BEACON_DESKTOP_BRIDGE__.calls)
  expect(calls).toEqual(['get_settings', 'capture_region'])
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
