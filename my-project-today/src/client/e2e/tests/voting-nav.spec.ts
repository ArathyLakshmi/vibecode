import { test, expect } from '@playwright/test'

/**
 * E2E tests for Voting Platform Navigation Link
 * Feature: 001-voting-platform-nav
 * 
 * NOTE: These tests require proper authentication setup with different user roles.
 * Test users needed:
 * - User with 'voting' role
 * - User with 'admin' role  
 * - User without 'voting' or 'admin' roles
 */

test.describe('Voting Platform Navigation - User Story 1: Permission-Based Access', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // Navigate to app and authenticate
    // TODO: Set up authentication with specific roles per test
    await page.goto(BASE_URL)
  })

  test('[US1] shows link to users with voting role', async ({ page }) => {
    // Given: User with 'voting' role is authenticated
    // TODO: Mock or set up user with 'voting' role
    
    // When: User views the navigation menu
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    
    // Then: "Voting Platform" link is visible
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
  })

  test('[US1] shows link to users with admin role', async ({ page }) => {
    // Given: User with 'admin' role is authenticated
    // TODO: Mock or set up user with 'admin' role
    
    // When: User views the navigation menu
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    
    // Then: "Voting Platform" link is visible
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
  })

  test('[US1] hides link from users without required roles', async ({ page }) => {
    // Given: User without 'voting' or 'admin' roles is authenticated
    // TODO: Mock or set up user with only 'user' role (no voting/admin)
    
    // When: User views the navigation menu
    const nav = page.locator('nav[aria-label="Primary"]')
    await expect(nav).toBeVisible()
    
    // Then: "Voting Platform" link is NOT visible
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).not.toBeVisible()
  })

  test('[US1] navigates to voting platform when clicked', async ({ page }) => {
    // Given: User with 'voting' or 'admin' role sees the link
    // TODO: Mock or set up user with required role
    
    // When: User clicks "Voting Platform" link
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
    await votingLink.click()
    
    // Then: User is navigated to /voting-platform
    await expect(page).toHaveURL('/voting-platform')
    
    // And: Voting Platform page content is visible
    await expect(page.locator('h1')).toContainText('Voting Platform')
  })
})

test.describe('Voting Platform Navigation - User Story 2: Active State', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up user with voting or admin role
    await page.goto(BASE_URL)
  })

  test('[US2] displays active state on voting platform page', async ({ page }) => {
    // Given: User is on the voting platform page
    await page.goto('/voting-platform')
    
    // When: User views the navigation menu
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
    
    // Then: Link shows active styling
    await expect(votingLink).toHaveAttribute('aria-current', 'page')
    
    // And: Visual active state is present (check for active CSS class)
    const className = await votingLink.getAttribute('class')
    expect(className).toMatch(/border-indigo-600|font-semibold/)
  })

  test('[US2] removes active state when navigating away', async ({ page }) => {
    // Given: User is on the voting platform page
    await page.goto('/voting-platform')
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    
    // Verify initial active state
    await expect(votingLink).toHaveAttribute('aria-current', 'page')
    
    // When: User navigates to a different page
    await page.click('a:has-text("Home")')
    await expect(page).toHaveURL('/')
    
    // Then: Voting Platform link no longer has active state
    await expect(votingLink).not.toHaveAttribute('aria-current', 'page')
  })
})

test.describe('Voting Platform Navigation - User Story 3: Mobile Support', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    // TODO: Set up user with voting or admin role
    await page.goto(BASE_URL)
  })

  test('[US3] appears in mobile menu', async ({ page }) => {
    // Given: User with voting role on mobile device
    
    // When: User opens the hamburger menu
    const menuButton = page.getByRole('button', { name: /toggle navigation/i })
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    
    // Then: "Voting Platform" link appears in mobile menu
    const mobileMenu = page.locator('#primary-mobile')
    await expect(mobileMenu).toBeVisible()
    
    const votingLink = mobileMenu.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
  })

  test('[US3] navigates from mobile menu', async ({ page }) => {
    // Given: Mobile menu is open with voting link visible
    const menuButton = page.getByRole('button', { name: /toggle navigation/i })
    await menuButton.click()
    
    const mobileMenu = page.locator('#primary-mobile')
    const votingLink = mobileMenu.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
    
    // When: User clicks the voting link
    await votingLink.click()
    
    // Then: User navigates to voting platform
    await expect(page).toHaveURL('/voting-platform')
    
    // And: Mobile menu closes
    await expect(mobileMenu).not.toBeVisible()
  })

  test('[US3] shows active state in mobile menu', async ({ page }) => {
    // Given: User is on voting platform page
    await page.goto('/voting-platform')
    
    // When: User opens mobile menu
    const menuButton = page.getByRole('button', { name: /toggle navigation/i })
    await menuButton.click()
    
    // Then: Voting Platform link shows active state
    const mobileMenu = page.locator('#primary-mobile')
    const votingLink = mobileMenu.locator('a', { hasText: 'Voting Platform' })
    
    await expect(votingLink).toHaveAttribute('aria-current', 'page')
    
    // And: Visual active state is present
    const className = await votingLink.getAttribute('class')
    expect(className).toMatch(/bg-indigo-50|text-indigo-600|font-semibold/)
  })
})

test.describe('Voting Platform Navigation - Accessibility', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test.beforeEach(async ({ page }) => {
    // TODO: Set up user with voting or admin role
    await page.goto(BASE_URL)
  })

  test('[ACC] is keyboard accessible', async ({ page }) => {
    // Given: User is on the home page
    await page.goto('/')
    
    // When: User tabs to the voting link
    // Note: May need multiple Tab presses depending on DOM order
    const votingLink = page.locator('a', { hasText: 'Voting Platform' })
    await expect(votingLink).toBeVisible()
    
    // Focus the link
    await votingLink.focus()
    
    // Then: Link receives keyboard focus
    await expect(votingLink).toBeFocused()
    
    // When: User presses Enter
    await page.keyboard.press('Enter')
    
    // Then: Navigation occurs
    await expect(page).toHaveURL('/voting-platform')
  })

  test('[ACC] meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    
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
    
    // Filter for violations related to navigation
    const navViolations = results.violations.filter((v: any) => 
      v.nodes.some((node: any) => 
        node.html.includes('Voting Platform') || 
        node.target.some((t: string) => t.includes('nav'))
      )
    )
    
    expect(navViolations.length).toBe(0)
  })
})

test.describe('Voting Platform Navigation - Cross-Browser Compatibility', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5001/'

  test('[COMPAT] renders correctly across viewports', async ({ page }) => {
    // TODO: Set up user with voting or admin role
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(BASE_URL)
    
    const desktopNav = page.locator('nav[aria-label="Primary"]')
    await expect(desktopNav).toBeVisible()
    
    const desktopLink = desktopNav.locator('a', { hasText: 'Voting Platform' })
    await expect(desktopLink).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(desktopLink).toBeVisible()
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Mobile: link should be in hamburger menu
    const menuButton = page.getByRole('button', { name: /toggle navigation/i })
    await menuButton.click()
    
    const mobileMenu = page.locator('#primary-mobile')
    const mobileLink = mobileMenu.locator('a', { hasText: 'Voting Platform' })
    await expect(mobileLink).toBeVisible()
  })
})
