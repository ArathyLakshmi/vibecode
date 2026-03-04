import { test, expect } from '@playwright/test'

test.describe('Auth flows (Azure AD)', () => {
  const username = process.env.AZURE_TEST_USERNAME
  const password = process.env.AZURE_TEST_PASSWORD

  test.beforeAll(() => {
    if (!username || !password) {
      test.skip(true, 'AZURE_TEST_USERNAME/AZURE_TEST_PASSWORD not set')
    }
  })

  test('real Azure AD redirect sign-in', async ({ page }) => {
    // expose page console logs so server-side logs and test provider messages appear
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()))

    await page.goto('http://localhost:5001/')
    await expect(page).toHaveURL(/\/login/)
    await page.click('button:has-text("Sign in with Microsoft")')

    // Wait for redirect to Microsoft login
    await page.waitForURL(/login.microsoftonline.com/, { timeout: 30000 })

    // Helpers
    const clickIf = async (selector: string) => {
      try {
        await page.click(selector, { timeout: 7000 })
      } catch (e) {
        /* ignore if not found */
      }
    }

    // Fill username/email
    const userSel = 'input[name="loginfmt"], input[type="email"]'
    await page.waitForSelector(userSel, { timeout: 15000 })
    await page.fill(userSel, username)
    // click Next (various possible selectors)
    await clickIf('input[type="submit"]')
    await clickIf('button#idSIButton9')
    await clickIf('button:has-text("Next")')

    // Fill password
    const passSel = 'input[name="passwd"], input[type="password"]'
    await page.waitForSelector(passSel, { timeout: 15000 })
    await page.fill(passSel, password)
    // click Sign in
    await clickIf('input[type="submit"]')
    await clickIf('button#idSIButton9')

    // Optional "Stay signed in?" — click the primary button if shown
    await clickIf('button#idSIButton9')

    // Wait for redirect back to the app root and verify logout button
    await page.waitForURL('http://localhost:5001/', { timeout: 60000 })
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 20000 })
  })
})
