import { expect, test } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

test('the demo starts with a usable sample reading', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByRole('heading', { name: 'Hear a sample objective' })).toBeVisible()
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible()
  await expect(page.getByText('weathered radio tower')).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
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
