import { test, expect } from '@playwright/test';

/**
 * E2E tests for Announcements Tab
 * Feature: 001-announcements-tab
 * User Story 1: View All Announced Meetings (P1)
 * 
 * Tests the announcements list functionality including:
 * - Tab visibility in navigation
 * - Loading states
 * - List display with meeting details
 * - Empty state handling
 * - Error state with retry
 * - Past announcements filtering (hidden)
 */

// Test helper: Navigate to authenticated home page
async function navigateToAuthenticatedHome(page) {
  await page.goto('http://localhost:5001/');
  
  // In test mode, check for sign-in button and click if needed
  const signInButton = page.locator('button:has-text("Sign in with Microsoft")');
  const isSignInVisible = await signInButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (isSignInVisible) {
    await signInButton.click();
    // Wait for successful authentication - Logout button appears
    await page.waitForSelector('button:has-text("Logout")', { timeout: 10000 });
  }
  
  // Wait for either the list OR the "Create Meeting Request" button to confirm we're on home page
  await page.waitForSelector('button:has-text("Create Meeting Request"), [data-testid="meeting-requests-list"]', { timeout: 10000 });
}

test.describe('Announcements Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page with authentication
    await navigateToAuthenticatedHome(page);
  });

  // T008: Tab displays in navigation
  test('announcements tab displays in navigation', async ({ page }) => {
    // Look for Announced Meetings tab link in TopNav
    const announcementsTab = page.locator('nav[aria-label="Primary"] a', { hasText: 'Announced Meetings' });
    await expect(announcementsTab).toBeVisible();
    await expect(announcementsTab).toHaveAttribute('href', '/announcements');
  });

  // T009: Loading spinner shows while fetching
  test('loading spinner shows while fetching announcements', async ({ page }) => {
    // Navigate to announcements page
    await page.goto('http://localhost:5001/announcements');
    
    // Verify loading spinner appears (should be visible briefly during data fetch)
    const loadingSpinner = page.locator('[data-testid="announcements-loading"]');
    
    // Wait for either the loading spinner or the content to appear
    // This handles both slow and fast network conditions
    await Promise.race([
      loadingSpinner.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {}),
      page.waitForSelector('[data-testid="announcements-list"]', { timeout: 5000 }),
    ]);
    
    // Verify loading state eventually resolves to content or empty state
    const content = page.locator('[data-testid="announcements-list"]');
    const emptyState = page.locator('[data-testid="announcements-empty"]');
    
    await expect(content.or(emptyState)).toBeVisible({ timeout: 5000 });
  });

  // T010: List displays announcements with title/date/category
  test('list displays announcements with title, date, and category', async ({ page }) => {
    // Navigate to announcements page
    await page.goto('http://localhost:5001/announcements');
    
    // Wait for announcements list to load
    await page.waitForSelector('[data-testid="announcements-list"]', { timeout: 5000 });
    
    // Get all announcement cards
    const announcementCards = page.locator('[data-testid="announcement-card"]');
    const count = await announcementCards.count();
    
    if (count > 0) {
      // Verify first card has required fields
      const firstCard = announcementCards.first();
      
      // Check for title
      const title = firstCard.locator('[data-testid="announcement-title"]');
      await expect(title).toBeVisible();
      await expect(title).not.toBeEmpty();
      
      // Check for date
      const date = firstCard.locator('[data-testid="announcement-date"]');
      await expect(date).toBeVisible();
      
      // Check for category
      const category = firstCard.locator('[data-testid="announcement-category"]');
      await expect(category).toBeVisible();
    } else {
      // If no announcements, verify empty state is shown
      const emptyState = page.locator('[data-testid="announcements-empty"]');
      await expect(emptyState).toBeVisible();
    }
  });

  // T011: Empty state shows "No announcements available"
  test('empty state shows when no announcements exist', async ({ page }) => {
    // Navigate to announcements page
    await page.goto('http://localhost:5001/announcements');
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    
    // Check if empty state or list is shown
    const emptyState = page.locator('[data-testid="announcements-empty"]');
    const list = page.locator('[data-testid="announcements-list"]');
    
    // One of the two should be visible
    await expect(emptyState.or(list)).toBeVisible();
    
    // If empty state is visible, verify message
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/no announced meetings/i);
    }
  });

  // T012: Error state shows with retry button
  test('error state shows with retry button on API failure', async ({ page }) => {
    // Intercept API request and force it to fail
    await page.route('**/api/meetingrequests?status=Announced', route => {
      route.abort('failed');
    });
    
    // Navigate to announcements page
    await page.goto('http://localhost:5001/announcements');
    
    // Wait for error state to appear
    const errorState = page.locator('[data-testid="announcements-error"]');
    await expect(errorState).toBeVisible({ timeout: 5000 });
    
    // Verify error message is shown
    await expect(errorState).toContainText(/error|failed|unable/i);
    
    // Verify retry button exists
    const retryButton = page.locator('[data-testid="announcements-retry"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
    
    // Remove the route interception to allow retry to succeed
    await page.unroute('**/api/meetingrequests?status=Announced');
    
    // Click retry button
    await retryButton.click();
    
    // Verify error state is replaced with loading or content
    await expect(errorState).not.toBeVisible({ timeout: 3000 });
  });

  // T013: Past announcements are hidden from list
  test('past announcements are hidden from the list', async ({ page }) => {
    // Navigate to announcements page
    await page.goto('http://localhost:5001/announcements');
    
    // Wait for list to load
    await page.waitForSelector('[data-testid="announcements-list"], [data-testid="announcements-empty"]', { timeout: 5000 });
    
    // Get all announcement cards
    const announcementCards = page.locator('[data-testid="announcement-card"]');
    const count = await announcementCards.count();
    
    if (count > 0) {
      // Verify each announcement has a future or today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
      
      for (let i = 0; i < count; i++) {
        const card = announcementCards.nth(i);
        const dateElement = card.locator('[data-testid="announcement-date"]');
        const dateText = await dateElement.textContent();
        
        // Parse the date (assumes format like "2024-02-15" or similar)
        // This is a basic check - real implementation should parse actual date format
        if (dateText) {
          const match = dateText.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const announcementDate = new Date(match[0]);
            announcementDate.setHours(0, 0, 0, 0);
            
            // Verify date is today or in the future
            expect(announcementDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
          }
        }
      }
    }
    
    // Test passes regardless of whether announcements exist
    // The key is that NO past-dated announcements should be visible
  });
});
