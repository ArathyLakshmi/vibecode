import { test, expect } from '@playwright/test'

test.describe('App Shell', () => {
  test('desktop: header, nav links, and footer are visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(process.env.BASE_URL || 'http://localhost:5001/')

    const header = page.locator('header[role="banner"]')
    await expect(header).toBeVisible()

    // Primary nav links
    await expect(page.locator('nav')).toContainText('Home')
    await expect(page.locator('nav')).toContainText('Dashboard')
    await expect(page.locator('nav')).toContainText('Meetings')
    await expect(page.locator('nav')).toContainText('Settings')

    // Footer
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('Privacy')
  })

  test('mobile: hamburger toggles navigation and links are focusable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto(process.env.BASE_URL || 'http://localhost:5001/')

    const toggle = page.getByRole('button', { name: /toggle navigation/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    // menu should show links
    const mobileMenu = page.locator('#primary-mobile')
    await expect(mobileMenu).toBeVisible()
    const meetingsLink = mobileMenu.getByText('Meetings')
    await expect(meetingsLink).toBeVisible()
    await meetingsLink.focus()
    await expect(meetingsLink).toBeFocused()
  })

  test('accessibility: no critical axe violations on shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(process.env.BASE_URL || 'http://localhost:5001/')

    // inject axe-core
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' })
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
    })

    const critical = results.violations.filter((v: any) => v.impact === 'critical')
    expect(critical.length).toBe(0)
  })
})
