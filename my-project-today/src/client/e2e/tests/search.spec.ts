import { test, expect } from '@playwright/test';

/**
 * E2E tests for Global Search functionality
 * Feature: 003-global-search
 * Tests basic text search, case-insensitive matching, and partial matching
 */

// Test helper: Navigate to authenticated home page
async function navigateToAuthenticatedHome(page) {
  await page.goto('http://localhost:5174/');
  // Wait for authentication to complete and home page to load
  await page.waitForSelector('[data-testid="meeting-requests-list"]', { timeout: 10000 });
}

// Test helper: Type in search bar
async function typeInSearchBar(page, searchTerm: string) {
  const searchInput = page.locator('[data-testid="search-input"]');
  await searchInput.fill(searchTerm);
}

test.describe('Global Search', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page with authentication
    await navigateToAuthenticatedHome(page);
  });

  // T011: Search bar is visible in global navigation
  test('search bar is visible in global navigation', async ({ page }) => {
    const searchBar = page.locator('[data-testid="search-input"]');
    await expect(searchBar).toBeVisible();
  });

  // T012: Typing "board" filters results to show only matching items
  test('typing "board" filters results to show only matching items', async ({ page }) => {
    // Get initial count of meeting requests
    const allRequests = page.locator('[data-testid="meeting-request-item"]');
    const initialCount = await allRequests.count();
    
    // Type "board" in search bar
    await typeInSearchBar(page, 'board');
    
    // Wait for filtering to occur
    await page.waitForTimeout(500);
    
    // Verify filtered results contain "board" (case-insensitive)
    const filteredRequests = page.locator('[data-testid="meeting-request-item"]');
    const filteredCount = await filteredRequests.count();
    
    // Should have fewer results (unless all items contain "board")
    if (initialCount > 0) {
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
      
      // Verify each visible item contains "board" in some field
      for (let i = 0; i < filteredCount; i++) {
        const itemText = await filteredRequests.nth(i).textContent();
        expect(itemText?.toLowerCase()).toContain('board');
      }
    }
  });

  // T013: Clearing search shows all meeting requests
  test('clearing search shows all meeting requests', async ({ page }) => {
    // Get initial count
    const allRequests = page.locator('[data-testid="meeting-request-item"]');
    const initialCount = await allRequests.count();
    
    // Type search term
    await typeInSearchBar(page, 'board');
    await page.waitForTimeout(500);
    
    // Clear search
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Verify all results are shown again
    const restoredCount = await allRequests.count();
    expect(restoredCount).toBe(initialCount);
  });

  // T014: Searching for non-existent term shows "No results found"
  test('searching for non-existent term shows "No results found"', async ({ page }) => {
    // Search for a term that definitely won't match
    await typeInSearchBar(page, 'xyz123abcNonExistent999');
    await page.waitForTimeout(500);
    
    // Verify "No results found" message appears
    const noResultsMessage = page.locator('[data-testid="no-results-message"]');
    await expect(noResultsMessage).toBeVisible();
    await expect(noResultsMessage).toContainText(/no results found/i);
  });

  // T015: Search is case-insensitive ("BOARD" matches "board")
  test('search is case-insensitive', async ({ page }) => {
    // Search with lowercase
    await typeInSearchBar(page, 'board');
    await page.waitForTimeout(500);
    const lowercaseResults = page.locator('[data-testid="meeting-request-item"]');
    const lowercaseCount = await lowercaseResults.count();
    
    // Clear and search with uppercase
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.clear();
    await typeInSearchBar(page, 'BOARD');
    await page.waitForTimeout(500);
    const uppercaseResults = page.locator('[data-testid="meeting-request-item"]');
    const uppercaseCount = await uppercaseResults.count();
    
    // Should return same number of results
    expect(uppercaseCount).toBe(lowercaseCount);
  });

  // T016: Partial matching works ("meet" matches "meeting")
  test('partial matching works', async ({ page }) => {
    // Search for partial term
    await typeInSearchBar(page, 'meet');
    await page.waitForTimeout(500);
    
    // Verify results contain "meet" as substring
    const filteredRequests = page.locator('[data-testid="meeting-request-item"]');
    const count = await filteredRequests.count();
    
    if (count > 0) {
      // Check that at least one result contains "meet" (could be part of "meeting")
      const firstItemText = await filteredRequests.first().textContent();
      expect(firstItemText?.toLowerCase()).toContain('meet');
    }
  });

  // T017: Searching by reference number finds specific request
  test('searching by reference number finds specific request', async ({ page }) => {
    // Get the first meeting request's reference number
    const firstRequest = page.locator('[data-testid="meeting-request-item"]').first();
    const referenceElement = firstRequest.locator('[data-testid="reference-number"]');
    
    // Check if any requests exist
    const requestCount = await page.locator('[data-testid="meeting-request-item"]').count();
    if (requestCount > 0) {
      const referenceNumber = await referenceElement.textContent();
      
      if (referenceNumber) {
        // Search for that reference number
        await typeInSearchBar(page, referenceNumber.trim());
        await page.waitForTimeout(500);
        
        // Verify the specific request is shown
        const searchResults = page.locator('[data-testid="meeting-request-item"]');
        const resultCount = await searchResults.count();
        expect(resultCount).toBeGreaterThan(0);
        
        // Verify the result contains the reference number
        const resultText = await searchResults.first().textContent();
        expect(resultText).toContain(referenceNumber.trim());
      }
    }
  });
});
