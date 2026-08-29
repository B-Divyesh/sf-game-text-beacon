import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const base = 'https://game-text-beacon.sociobot.in'
const browser = await chromium.launch({ headless: true })
const report = { routes: [], demo: {}, keyboard: {}, mobile: {}, reducedMotion: {}, desktopShell: {} }

for (const path of ['/', '/demo', '/privacy', '/terms', '/missing-note']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors = []
  const requests = []
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('request', request => requests.push(request.url()))
  const response = await page.goto(base + path, { waitUntil: 'networkidle' })
  const axe = await new AxeBuilder({ page }).analyze()
  report.routes.push({
    path,
    status: response?.status(),
    title: await page.title(),
    lang: await page.locator('html').getAttribute('lang'),
    h1: await page.locator('h1').allTextContents(),
    main: await page.locator('main').count(),
    errors,
    requests,
    seriousCritical: axe.violations.filter(v => ['serious', 'critical'].includes(v.impact || '')).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
  })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  report.demo.primary = await page.getByRole('button', { name: 'Try it with sample data' }).isVisible()
  await page.getByRole('button', { name: 'Try it with sample data' }).click()
  await page.waitForLoadState('networkidle')
  report.demo.urlAfterClick = page.url()
  report.demo.banner = await page.getByText('Demo — sample data, nothing is saved').isVisible()
  report.demo.sample = await page.getByText(/weathered radio tower/).isVisible()
  report.demo.storageAfterEnter = await page.evaluate(() => Object.keys(localStorage))
  await page.getByRole('button', { name: 'Read sample objective' }).click()
  report.demo.statusAfterRead = await page.locator('#demo-status').innerText()
  await page.getByRole('button', { name: 'Reset demo' }).click()
  report.demo.storageAfterReset = await page.evaluate(() => Object.keys(localStorage))
  report.demo.statusAfterReset = await page.locator('#demo-status').innerText()
  await page.getByRole('link', { name: 'Start for real' }).click()
  report.demo.storageAfterLeave = await page.evaluate(() => Object.keys(localStorage))
  report.demo.requests = requests
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  const sequence = []
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    sequence.push(await page.evaluate(() => {
      const el = document.activeElement
      const style = getComputedStyle(el)
      return { tag: el?.tagName, text: el?.textContent?.trim(), outline: style.outline, outlineOffset: style.outlineOffset }
    }))
  }
  report.keyboard.tabSequence = sequence
  await page.keyboard.press('Enter')
  report.keyboard.enterUrl = page.url()
  await page.getByRole('link', { name: 'Privacy', exact: true }).first().click()
  report.keyboard.activeAfterRouteChange = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() }))
  await page.goBack()
  report.keyboard.activeAfterBack = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() }))
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const errors = []
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  report.mobile.overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
  report.mobile.smallTargets = await page.locator('a, button, input').evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect()
    return { text: element.textContent?.trim() || element.getAttribute('aria-label'), width: Math.round(r.width), height: Math.round(r.height) }
  }).filter(item => item.width < 44 || item.height < 44))
  report.mobile.errors = errors
  await page.screenshot({ path: '/tmp/game-text-beacon-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Try it with sample data' }).click()
  await page.screenshot({ path: '/tmp/game-text-beacon-mobile-demo.png', fullPage: true })
  await context.close()
}

{
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  report.reducedMotion.figure = await page.locator('.hero figure').evaluate(element => ({ animationName: getComputedStyle(element).animationName, animationDuration: getComputedStyle(element).animationDuration, transitionDuration: getComputedStyle(element).transitionDuration }))
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1120, height: 760 } })
  const page = await context.newPage()
  const errors = []
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  await page.goto(base + '/?app', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  report.desktopShell.h1 = await page.locator('h1').innerText()
  report.desktopShell.controls = await page.getByRole('button').allTextContents()
  report.desktopShell.inputs = await page.locator('input').count()
  await page.locator('#hotkey').fill('')
  await page.getByRole('button', { name: 'Save frame and hotkey' }).click()
  report.desktopShell.emptyHotkey = await page.locator('#app-status').innerText()
  report.desktopShell.errors = errors
  report.desktopShell.axe = (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact || '')).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
  await context.close()
}

console.log(JSON.stringify(report, null, 2))
await browser.close()
