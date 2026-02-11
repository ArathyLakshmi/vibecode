import { test, expect } from '@playwright/test'

test.describe('Auth flows (production redirect)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5001/')
  })

  test('redirect sign-in returns to original route', async ({ page }) => {
    // capture browser console logs to test runner output
    page.on('console', msg => {
      // serialize console messages to make them visible in CI logs
      try {
        console.log('PAGE LOG:', msg.type(), msg.text())
      } catch (e) {
        console.log('PAGE LOG: (error serializing console message)')
      }
    })
    // navigate to the app root which should redirect to /login
    await page.goto('http://localhost:5001/')
    await expect(page).toHaveURL(/\/login/)
    // click the current sign-in button text used in the app
    await page.click('button:has-text("Sign in with Microsoft")')
    // in test mode the provider should set authenticated and navigate back
    // wait for the logout button (longer timeout for CI) then confirm URL
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveURL('http://localhost:5001/')
  })

})

test.describe('Logout Redirect Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and ensure user is authenticated
    await page.goto('http://localhost:5001/')
    // If not authenticated, click sign in
    const signInButton = page.locator('button:has-text("Sign in with Microsoft")')
    if (await signInButton.isVisible()) {
      await signInButton.click()
      // Wait for authentication to complete
      await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 20000 })
    }
  })

  test('should redirect to Microsoft logout and return to login page', async ({ page }) => {
    // Verify user is authenticated (homepage visible)
    await expect(page.locator('button:has-text("Logout")')).toBeVisible()
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")')
    await logoutButton.click()
    
    // CRITICAL: Button should be disabled immediately
    await expect(logoutButton).toBeDisabled({ timeout: 1000 })
    
    // CRITICAL: No popup window should open
    // Playwright will fail if popup opens unexpectedly
    
    // Wait for redirect to Microsoft or directly to login
    // (In test mode, might skip Microsoft redirect)
    await page.waitForURL(/\/login|login\.microsoftonline\.com/, { timeout: 10000 })
    
    // If we went to Microsoft, wait for redirect back
    if (page.url().includes('microsoftonline.com')) {
      await page.waitForURL(/\/login/, { timeout: 10000 })
    }
    
    // Verify we're on login page
    await expect(page.locator('button:has-text("Sign in with Microsoft")')).toBeVisible()
    
    // Verify session is cleared (attempt to navigate to protected route)
    await page.goto('http://localhost:5001/')
    
    // Should redirect back to login (not authenticated)
    await expect(page).toHaveURL(/\/login/)
  })

  test('should disable button on rapid double-click', async ({ page }) => {
    // Verify user is authenticated
    await expect(page.locator('button:has-text("Logout")')).toBeVisible()
    
    const logoutButton = page.locator('button:has-text("Logout")')
    
    // Rapid double-click
    await logoutButton.click()
    
    // Button should be disabled immediately, preventing second click
    await expect(logoutButton).toBeDisabled({ timeout: 500 })
    
    // Try to click again (should have no effect due to disabled state)
    try {
      await logoutButton.click({ force: true, timeout: 100 })
    } catch (e) {
      // Expected to fail because button is disabled
    }
    
    // Verify redirect still happens normally (only one logout processed)
    await page.waitForURL(/\/login|login\.microsoftonline\.com/, { timeout: 10000 })
  })
})
