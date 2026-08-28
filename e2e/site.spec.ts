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
  await page.goto('/')
  await expect(page.locator('#download-link')).toBeHidden()
  await expect(page.locator('#download-status')).toHaveText('Downloads are being published.')
})

test('390px mobile layout has no horizontal overflow and keeps navigation and demo controls touch-sized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const sizes = await page.locator('.site-head nav a, .demo-banner a, #reset-demo').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }
  }))
  expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true)
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
