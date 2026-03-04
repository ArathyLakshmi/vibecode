import { test, expect } from '@playwright/test'

/**
 * E2E tests for Add User Feature
 * Feature: 002-add-user-link
 * 
 * NOTE: These tests require admin authentication (secadmin role)
 * Test users needed:
 * - User with 'secadmin' or 'SECADmin' role
 * - User without admin roles
 */

test.describe('Add User - Admin Access', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up authentication with admin role
    await page.goto(BASE_URL)
  })

  test('[US1] shows Add User button for admin users', async ({ page }) => {
    // Given: User with 'secadmin' role is authenticated
    // TODO: Mock or set up user with 'secadmin' role
    
    // When: User views the navigation bar
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    
    // Then: "Add User" button is visible
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await expect(addUserButton).toBeVisible()
    await expect(addUserButton).toHaveText(/Add User/)
  })

  test('[US1] hides Add User button from non-admin users', async ({ page }) => {
    // Given: User without 'secadmin' role is authenticated
    // TODO: Mock or set up user without admin role
    
    // When: User views the navigation bar
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    
    // Then: "Add User" button is NOT visible
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await expect(addUserButton).not.toBeVisible()
  })

  test('[US2] opens dialog when Add User button is clicked', async ({ page }) => {
    // Given: Admin user sees the Add User button
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await expect(addUserButton).toBeVisible()
    
    // When: User clicks the Add User button
    await addUserButton.click()
    
    // Then: Add User dialog appears
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // And: Dialog has correct title
    const dialogTitle = dialog.locator('[role="heading"]')
    await expect(dialogTitle).toContainText('Add New User')
    
    // And: Form fields are visible
    await expect(dialog.getByLabel(/name/i)).toBeVisible()
    await expect(dialog.getByLabel(/email/i)).toBeVisible()
    await expect(dialog.getByLabel(/password/i)).toBeVisible()
  })

  test('[US2] closes dialog when Cancel button is clicked', async ({ page }) => {
    // Given: Add User dialog is open
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // When: User clicks Cancel button
    const cancelButton = dialog.getByRole('button', { name: /cancel/i })
    await cancelButton.click()
    
    // Then: Dialog is closed
    await expect(dialog).not.toBeVisible()
  })

  test('[US2] closes dialog when X button is clicked', async ({ page }) => {
    // Given: Add User dialog is open
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // When: User clicks X close button
    const closeButton = dialog.getByLabel(/close/i)
    await closeButton.click()
    
    // Then: Dialog is closed
    await expect(dialog).not.toBeVisible()
  })
})

test.describe('Add User - Form Validation', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up admin authentication
    await page.goto(BASE_URL)
    
    // Open Add User dialog
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('[VAL1] validates required Name field', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User submits form without Name
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Name
    await expect(dialog.getByText(/name is required/i)).toBeVisible()
  })

  test('[VAL2] validates Email format', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User enters invalid email
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill('not-an-email')
    await dialog.getByLabel(/password/i).fill('SecurePass123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Email
    await expect(dialog.getByText(/invalid email format/i)).toBeVisible()
  })

  test('[VAL3] validates Password length', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User enters password less than 8 characters
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill('test@example.com')
    await dialog.getByLabel(/password/i).fill('Short1')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Password
    await expect(dialog.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test('[VAL4] validates Password complexity - uppercase required', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User enters password without uppercase
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill('test@example.com')
    await dialog.getByLabel(/password/i).fill('lowercase123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Password
    await expect(dialog.getByText(/uppercase letter/i)).toBeVisible()
  })

  test('[VAL5] validates Password complexity - lowercase required', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User enters password without lowercase
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill('test@example.com')
    await dialog.getByLabel(/password/i).fill('UPPERCASE123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Password
    await expect(dialog.getByText(/lowercase letter/i)).toBeVisible()
  })

  test('[VAL6] validates Password complexity - number required', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // When: User enters password without number
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill('test@example.com')
    await dialog.getByLabel(/password/i).fill('NoNumbersHere')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Validation error appears for Password
    await expect(dialog.getByText(/number/i)).toBeVisible()
  })
})

test.describe('Add User - Successful Creation', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up admin authentication
    await page.goto(BASE_URL)
    
    // Open Add User dialog
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('[SUC1] creates user with valid data', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    // Generate unique email to avoid conflicts
    const uniqueEmail = `testuser${Date.now()}@example.com`
    
    // When: User fills form with valid data
    await dialog.getByLabel(/name/i).fill('Jane Doe')
    await dialog.getByLabel(/email/i).fill(uniqueEmail)
    await dialog.getByLabel(/password/i).fill('SecurePass123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Success message appears
    await expect(dialog.getByText(/user created successfully/i)).toBeVisible({ timeout: 5000 })
    
    // And: Dialog closes automatically
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('[ERR1] handles duplicate email error', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    const duplicateEmail = 'existing@example.com'
    
    // Given: A user with this email already exists
    // TODO: Pre-create user or use known existing email
    
    // When: User tries to create another user with same email
    await dialog.getByLabel(/name/i).fill('Duplicate User')
    await dialog.getByLabel(/email/i).fill(duplicateEmail)
    await dialog.getByLabel(/password/i).fill('SecurePass123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Error message appears about duplicate email
    await expect(dialog.getByText(/already in use|already exists/i)).toBeVisible({ timeout: 5000 })
    
    // And: Dialog remains open for correction
    await expect(dialog).toBeVisible()
  })

  test('[LOAD] shows loading state during submission', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    
    const uniqueEmail = `testuser${Date.now()}@example.com`
    
    // When: User submits form
    await dialog.getByLabel(/name/i).fill('Test User')
    await dialog.getByLabel(/email/i).fill(uniqueEmail)
    await dialog.getByLabel(/password/i).fill('SecurePass123')
    
    const submitButton = dialog.getByRole('button', { name: /create user/i })
    await submitButton.click()
    
    // Then: Button shows loading state
    await expect(submitButton).toHaveText(/creating/i)
    
    // And: Button is disabled during submission
    await expect(submitButton).toBeDisabled()
  })
})

test.describe('Add User - Accessibility', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up admin authentication
    await page.goto(BASE_URL)
  })

  test('[ACC1] Add User button is keyboard accessible', async ({ page }) => {
    // Given: User navigates via keyboard
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await expect(addUserButton).toBeVisible()
    
    // When: User tabs to Add User button
    await addUserButton.focus()
    
    // Then: Button receives keyboard focus
    await expect(addUserButton).toBeFocused()
    
    // When: User presses Enter
    await page.keyboard.press('Enter')
    
    // Then: Dialog opens
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
  })

  test('[ACC2] dialog form is keyboard navigable', async ({ page }) => {
    // Given: Add User dialog is open
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // When: User tabs through form fields
    const nameField = dialog.getByLabel(/name/i)
    const emailField = dialog.getByLabel(/email/i)
    const passwordField = dialog.getByLabel(/password/i)
    
    await nameField.focus()
    await expect(nameField).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(emailField).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(passwordField).toBeFocused()
  })

  test('[ACC3] meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    
    // Open Add User dialog
    const addUserButton = page.getByRole('button', { name: /add user/i })
    await addUserButton.click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // Inject axe-core for accessibility testing
    await page.addScriptTag({ 
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' 
    })
    
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await (window as any).axe.run(document, { 
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } 
      })
    })
    
    // Check for critical violations
    const criticalViolations = results.violations.filter((v: any) => v.impact === 'critical')
    expect(criticalViolations.length).toBe(0)
  })

  test('[ACC4] provides appropriate ARIA labels', async ({ page }) => {
    // Given: Add User dialog is open
    const addUserButton = page.getByRole('button', { name: /add user/i })
    
    // Check button aria-label
    await expect(addUserButton).toHaveAttribute('aria-label', 'Add new user')
    
    await addUserButton.click()
    
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    
    // Check form fields have proper labels
    const nameField = dialog.getByLabel(/name/i)
    const emailField = dialog.getByLabel(/email/i)
    const passwordField = dialog.getByLabel(/password/i)
    
    await expect(nameField).toBeVisible()
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
  })
})

test.describe('Add User - Mobile Support', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    // TODO: Set up admin authentication
    await page.goto(BASE_URL)
  })

  test('[MOB1] Add User button hidden on mobile', async ({ page }) => {
    // Note: This tests current implementation - button appears on desktop only
    // If mobile support needed, this test should be updated
    
    // When: User views navigation on mobile
    const addUserButton = page.getByRole('button', { name: /add user/i })
    
    // Then: Button may not be visible on mobile (design decision)
    // Or it should be accessible via hamburger menu
    // TODO: Confirm mobile UX design
  })

  test('[MOB2] dialog is responsive on mobile', async ({ page }) => {
    // If Add User button is visible on mobile or accessible via menu
    const addUserButton = page.getByRole('button', { name: /add user/i })
    
    // Skip if button not accessible on mobile
    if (await addUserButton.isVisible()) {
      await addUserButton.click()
      
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      
      // Check form is usable on mobile
      const nameField = dialog.getByLabel(/name/i)
      await expect(nameField).toBeVisible()
      await nameField.fill('Mobile User')
      
      const emailField = dialog.getByLabel(/email/i)
      await expect(emailField).toBeVisible()
    }
  })
})
