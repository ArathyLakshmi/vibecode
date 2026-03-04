# API & Component Contracts: Requestor Filter Toggle

**Feature**: 1-requestor-filter | **Phase**: 1 - Design | **Date**: 2026-02-12

## Overview

This document defines all contracts (API endpoints, component interfaces, test scenarios) for the requestor filter toggle feature.

---

## 1. Backend API Contract

### Endpoint: GET /api/meetingrequests

**Description**: Retrieves paginated list of meeting requests with optional requestor filtering.

**URL**: `/api/meetingrequests`

**Method**: `GET`

**Authentication**: Optional (works with or without auth token)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `classification` | string | No | null | Filter by classification |
| `category` | string | No | null | Filter by category |
| `status` | string | No | null | Filter by status |
| `startDate` | string (ISO 8601) | No | null | Filter by meeting date >= startDate |
| `endDate` | string (ISO 8601) | No | null | Filter by meeting date <= endDate |
| `page` | integer | No | 1 | Page number (minimum: 1) |
| `pageSize` | integer | No | 20 | Items per page (min: 1, max: 100) |
| **`requestorEmail`** | **string** | **No** | **null** | **NEW: Filter by requestor email** |

**Request Examples**:

```http
# Get all requests (no filter)
GET /api/meetingrequests?page=1&pageSize=20
```

```http
# Get only user's requests
GET /api/meetingrequests?page=1&pageSize=20&requestorEmail=john.doe%40example.com
```

```http
# Get user's pending requests
GET /api/meetingrequests?page=1&pageSize=20&requestorEmail=john.doe%40example.com&status=pending
```

**Response Format**:

**Status**: `200 OK`

**Content-Type**: `application/json`

**Body**:
```json
{
  "items": [
    {
      "id": 1,
      "title": "Board Meeting Q4 2024",
      "meetingDate": "2024-12-15T00:00:00Z",
      "alternateDate": null,
      "category": "Governance",
      "subcategory": "Board Meeting",
      "classification": "Regular",
      "description": "Quarterly board meeting",
      "comments": "",
      "status": "Pending",
      "isDraft": false,
      "referenceNumber": "REQ-2024-001",
      "requestorName": "John Doe",
      "requestorEmail": "john.doe@example.com",
      "requestType": "Meeting",
      "country": "US",
      "createdAt": "2024-11-01T10:00:00Z",
      "createdBy": "john.doe@example.com",
      "updatedAt": "2024-11-05T14:30:00Z",
      "updatedBy": "admin@example.com"
    }
    // ... more items
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 42,        // Total items matching filter
  "totalPages": 3,
  "hasMore": true
}
```

**Error Responses**:

| Status | Condition | Response Body |
|--------|-----------|---------------|
| `400 Bad Request` | Invalid page/pageSize | `{ "error": "Invalid pagination parameters" }` |
| `500 Internal Server Error` | Database error | `{ "error": "Internal server error" }` |

**Backend Implementation Contract**:

```csharp
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] string? classification,
    [FromQuery] string? category,
    [FromQuery] string? status,
    [FromQuery] string? startDate,
    [FromQuery] string? endDate,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string? requestorEmail = null)  // NEW PARAMETER
{
    // Validate pagination
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    var q = _db.MeetingRequests.AsQueryable();
    
    // Apply existing filters...
    
    // NEW: Apply requestor filter
    if (!string.IsNullOrWhiteSpace(requestorEmail))
    {
        q = q.Where(x => 
            (!string.IsNullOrEmpty(x.RequestorEmail) && x.RequestorEmail == requestorEmail) ||
            (!string.IsNullOrEmpty(x.RequestorName) && x.RequestorName == requestorEmail));
    }
    
    // Apply pagination...
    var totalCount = await q.CountAsync();
    var result = await q
        .OrderByDescending(x => x.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(x => new { /* projection */ })
        .ToListAsync();
    
    return Ok(new
    {
        items = result,
        page,
        pageSize,
        totalCount,
        totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
        hasMore = page * pageSize < totalCount
    });
}
```

**Backwards Compatibility**:
- ✅ When `requestorEmail` is null/empty, existing behavior is preserved (returns all requests)
- ✅ Existing clients without `requestorEmail` parameter continue working
- ✅ No breaking changes to response format

---

## 2. Frontend Component Contract

### Component: MeetingRequestsList

**File**: `src/client/src/components/MeetingRequestsList.jsx`

**Purpose**: Displays paginated list of meeting requests with filter toggle.

**Props** (unchanged):
```typescript
interface MeetingRequestsListProps {
  searchTerm?: string         // Search query string
  isSearching?: boolean       // Loading state for search
  refreshTrigger?: number     // Counter to force data refresh
  onEdit?: (item: MeetingRequest) => void  // Callback when edit button clicked
}
```

**Internal State** (extended):
```typescript
interface MeetingRequestsListState {
  // Existing state
  items: MeetingRequest[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  count: number | null
  page: number
  hasMore: boolean
  
  // NEW: Filter state
  filterMode: "my-requests" | "all-requests"  // Current filter mode
}
```

**Event Handlers** (new):
```typescript
// Toggle filter mode
function handleFilterToggle(newMode: "my-requests" | "all-requests"): void
```

**Render Contract**:

HTML structure will include new filter toggle:
```jsx
<div className="meeting-requests-container">
  {/* NEW: Filter Toggle */}
  <Pivot
    aria-label="Filter meeting requests by requestor"
    selectedKey={filterMode}
    onLinkClick={handleFilterToggle}
    data-testid="filter-toggle"
  >
    <PivotItem headerText="My Requests" itemKey="my-requests" data-testid="filter-my-requests" />
    <PivotItem headerText="All Requests" itemKey="all-requests" data-testid="filter-all-requests" />
  </Pivot>
  
  {/* Existing: Status filter tabs */}
  {/* ... */}
  
  {/* Existing: Count display */}
  <div data-testid="count-display">
    Showing {items.length} of {count ?? items.length} meeting request(s)
  </div>
  
  {/* Existing: Meeting requests table */}
  {/* ... */}
</div>
```

**Test IDs**:
| Element | data-testid | Description |
|---------|-------------|-------------|
| Pivot container | `filter-toggle` | Filter toggle control |
| "My Requests" tab | `filter-my-requests` | My Requests option |
| "All Requests" tab | `filter-all-requests` | All Requests option |
| Count display | `count-display` | "Showing X of Y" text |
| Meeting request row | `meeting-request-card` | Individual request row (existing) |

**API Call Logic**:
```javascript
// Construct URL with filter parameter
function buildApiUrl(page, pageSize, filterMode, userEmail) {
  let url = `/api/meetingrequests?page=${page}&pageSize=${pageSize}`
  
  if (filterMode === 'my-requests' && userEmail) {
    url += `&requestorEmail=${encodeURIComponent(userEmail)}`
  }
  
  return url
}

// Load data with filter
async function loadData() {
  const url = buildApiUrl(1, 20, filterMode, userEmail)
  const response = await fetch(url)
  const data = await response.json()
  // Update state...
}
```

**State Transitions**:
```text
Initial State:
  filterMode = "my-requests"
  userEmail = accounts[0].username
  items = []
  loading = true
  
  → Load data with requestorEmail parameter
  → items = API response
  → loading = false

User clicks "All Requests":
  filterMode = "all-requests"
  page = 1
  items = []
  loading = true
  
  → Load data without requestorEmail parameter
  → items = API response
  → loading = false

User clicks "My Requests":
  filterMode = "my-requests"
  page = 1
  items = []
  loading = true
  
  → Load data with requestorEmail parameter
  → items = API response
  → loading = false
```

---

## 3. Test Contracts

### Backend API Tests

**File**: `src/server/Tests/MeetingRequestsControllerTests.cs` (new file)

**Test Cases**:

```csharp
public class MeetingRequestsControllerFilterTests
{
    [Fact]
    public async Task List_WithRequestorEmail_ReturnsOnlyMatchingRequests()
    {
        // Arrange
        var requestor = "john.doe@example.com";
        // Seed database with requests from multiple users
        
        // Act
        var result = await _controller.List(requestorEmail: requestor);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<PaginatedResponse>(okResult.Value);
        Assert.All(response.Items, item => 
            Assert.Equal(requestor, item.RequestorEmail));
    }
    
    [Fact]
    public async Task List_WithoutRequestorEmail_ReturnsAllRequests()
    {
        // Arrange
        // Seed database with requests from multiple users
        
        // Act
        var result = await _controller.List(requestorEmail: null);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<PaginatedResponse>(okResult.Value);
        Assert.True(response.TotalCount > 0);
        // Should include requests from all users
    }
    
    [Fact]
    public async Task List_WithRequestorEmail_UpdatesTotalCount()
    {
        // Arrange
        var requestor = "john.doe@example.com";
        // Seed 5 requests for john.doe, 10 requests for others
        
        // Act
        var result = await _controller.List(requestorEmail: requestor);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<PaginatedResponse>(okResult.Value);
        Assert.Equal(5, response.TotalCount);
    }
    
    [Fact]
    public async Task List_WithRequestorEmail_WorksWithPagination()
    {
        // Arrange
        var requestor = "john.doe@example.com";
        // Seed 25 requests for john.doe
        
        // Act
        var page1 = await _controller.List(page: 1, pageSize: 20, requestorEmail: requestor);
        var page2 = await _controller.List(page: 2, pageSize: 20, requestorEmail: requestor);
        
        // Assert
        var page1Result = Assert.IsType<OkObjectResult>(page1);
        var page1Data = Assert.IsType<PaginatedResponse>(page1Result.Value);
        Assert.Equal(20, page1Data.Items.Count);
        Assert.True(page1Data.HasMore);
        
        var page2Result = Assert.IsType<OkObjectResult>(page2);
        var page2Data = Assert.IsType<PaginatedResponse>(page2Result.Value);
        Assert.Equal(5, page2Data.Items.Count);
        Assert.False(page2Data.HasMore);
    }
}
```

**Test Coverage Requirements**:
- ✅ Filter by requestor email returns only matching requests
- ✅ No filter returns all requests (backwards compatibility)
- ✅ Total count reflects filtered dataset
- ✅ HasMore flag correct with filter active
- ✅ Pagination works with filter
- ✅ Invalid email returns empty array (not error)

---

### Frontend Component Tests

**File**: `src/client/src/components/MeetingRequestsList.test.jsx` (extend existing)

**Test Cases**:

```javascript
describe('MeetingRequestsList - Filter Toggle', () => {
  it('renders with "My Requests" as default filter', () => {
    render(<MeetingRequestsList />)
    const myRequestsTab = screen.getByTestId('filter-my-requests')
    expect(myRequestsTab).toHaveAttribute('aria-selected', 'true')
  })
  
  it('changes filter mode when toggle is clicked', async () => {
    render(<MeetingRequestsList />)
    const allRequestsTab = screen.getByTestId('filter-all-requests')
    
    fireEvent.click(allRequestsTab)
    
    await waitFor(() => {
      expect(allRequestsTab).toHaveAttribute('aria-selected', 'true')
    })
  })
  
  it('includes requestorEmail parameter in API call for "My Requests"', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalCount: 0, hasMore: false })
    })
    global.fetch = mockFetch
    
    render(<MeetingRequestsList />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('requestorEmail=user@example.com')
      )
    })
  })
  
  it('omits requestorEmail parameter for "All Requests"', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalCount: 0, hasMore: false })
    })
    global.fetch = mockFetch
    
    render(<MeetingRequestsList />)
    const allRequestsTab = screen.getByTestId('filter-all-requests')
    fireEvent.click(allRequestsTab)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('requestorEmail')
      )
    })
  })
  
  it('resets pagination when filter changes', async () => {
    render(<MeetingRequestsList />)
    
    // Scroll to page 3
    // ... scrolling logic ...
    
    const allRequestsTab = screen.getByTestId('filter-all-requests')
    fireEvent.click(allRequestsTab)
    
    await waitFor(() => {
      // Should fetch page 1 after filter change
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      )
    })
  })
  
  it('updates count display when filter changes', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({  // My Requests
        ok: true,
        json: async () => ({ items: [], totalCount: 5, hasMore: false })
      })
      .mockResolvedValueOnce({  // All Requests
        ok: true,
        json: async () => ({ items: [], totalCount: 50, hasMore: false })
      })
    global.fetch = mockFetch
    
    render(<MeetingRequestsList />)
    
    await waitFor(() => {
      expect(screen.getByText(/0 of 5/)).toBeInTheDocument()
    })
    
    const allRequestsTab = screen.getByTestId('filter-all-requests')
    fireEvent.click(allRequestsTab)
    
    await waitFor(() => {
      expect(screen.getByText(/0 of 50/)).toBeInTheDocument()
    })
  })
})
```

**Test Coverage Requirements**:
- ✅ Default filter is "My Requests"
- ✅ Toggle changes filter mode
- ✅ API calls include/exclude requestorEmail based on mode
- ✅ Pagination resets when filter changes
- ✅ Count display updates with filtered total
- ✅ Search works with filter active
- ✅ Infinite scroll respects filter

---

### E2E Tests

**File**: `src/client/e2e/tests/requestor-filter.spec.ts` (new file)

**Test Cases**:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Requestor Filter Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[name="email"]', 'john.doe@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })
  
  test('default filter shows only user\'s requests', async ({ page }) => {
    // Arrange: Seed database with requests from multiple users
    
    // Act: Navigate to meeting requests list
    await page.goto('/meeting-requests')
    
    // Assert: Only user's requests are visible
    const rows = page.locator('[data-testid="meeting-request-card"]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    
    // Verify all visible requests belong to current user
    for (let i = 0; i < count; i++) {
      const requestorEmail = await rows.nth(i).getAttribute('data-requestor-email')
      expect(requestorEmail).toBe('john.doe@example.com')
    }
  })
  
  test('toggle to "All Requests" shows requests from all users', async ({ page }) => {
    await page.goto('/meeting-requests')
    
    // Act: Click "All Requests" tab
    await page.click('[data-testid="filter-all-requests"]')
    
    // Wait for API call and re-render
    await page.waitForLoadState('networkidle')
    
    // Assert: Requests from multiple users are visible
    const rows = page.locator('[data-testid="meeting-request-card"]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    
    // Should see requests from other users
    const requestorEmails = []
    for (let i = 0; i < Math.min(count, 5); i++) {
      const email = await rows.nth(i).getAttribute('data-requestor-email')
      requestorEmails.push(email)
    }
    expect(new Set(requestorEmails).size).toBeGreaterThan(1)  // Multiple unique requestors
  })
  
  test('toggle back to "My Requests" filters again', async ({ page }) => {
    await page.goto('/meeting-requests')
    await page.click('[data-testid="filter-all-requests"]')
    await page.waitForLoadState('networkidle')
    
    // Act: Toggle back to "My Requests"
    await page.click('[data-testid="filter-my-requests"]')
    await page.waitForLoadState('networkidle')
    
    // Assert: Only user's requests again
    const rows = page.locator('[data-testid="meeting-request-card"]')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const requestorEmail = await rows.nth(i).getAttribute('data-requestor-email')
      expect(requestorEmail).toBe('john.doe@example.com')
    }
  })
  
  test('search works within filter mode', async ({ page }) => {
    await page.goto('/meeting-requests')
    
    // Act: Toggle to "All Requests"
    await page.click('[data-testid="filter-all-requests"]')
    await page.waitForLoadState('networkidle')
    
    // Act: Search for keyword
    await page.fill('[data-testid="search-input"]', 'Board Meeting')
    await page.waitForLoadState('networkidle')
    
    // Assert: Results are from all users (filter still active)
    const rows = page.locator('[data-testid="meeting-request-card"]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    
    // Should match search term
    for (let i = 0; i < count; i++) {
      const title = await rows.nth(i).locator('.title').textContent()
      expect(title.toLowerCase()).toContain('board meeting')
    }
  })
  
  test('infinite scroll respects filter', async ({ page }) => {
    await page.goto('/meeting-requests')
    
    // Act: Scroll to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForLoadState('networkidle')
    
    // Assert: Page 2 requests are also filtered by requestor
    const rows = page.locator('[data-testid="meeting-request-card"]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(20)  // Should have loaded page 2
    
    // Verify all rows still match filter
    for (let i = 0; i < count; i++) {
      const requestorEmail = await rows.nth(i).getAttribute('data-requestor-email')
      expect(requestorEmail).toBe('john.doe@example.com')
    }
  })
  
  test('keyboard navigation works for toggle', async ({ page }) => {
    await page.goto('/meeting-requests')
    
    // Act: Tab to filter toggle, use arrow keys
    await page.keyboard.press('Tab')  // Focus filter toggle
    await page.keyboard.press('ArrowRight')  // Move to "All Requests"
    await page.keyboard.press('Enter')  // Activate
    
    await page.waitForLoadState('networkidle')
    
    // Assert: Filter changed to "All Requests"
    const allRequestsTab = page.locator('[data-testid="filter-all-requests"]')
    await expect(allRequestsTab).toHaveAttribute('aria-selected', 'true')
  })
})
```

**Test Coverage Requirements**:
- ✅ Default view shows only user's requests
- ✅ Toggle to "All Requests" shows all requests
- ✅ Toggle back filters again
- ✅ Search operates within filter scope
- ✅ Infinite scroll respects filter
- ✅ Keyboard navigation works
- ✅ Empty state displays correctly

---

## 4. Accessibility Contract

**WCAG 2.1 AA Requirements**:

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 1.3.1 Info and Relationships | Semantic markup | Use Fluent UI `Pivot` with built-in ARIA roles |
| 2.1.1 Keyboard | All functionality accessible via keyboard | Tab to focus, Arrow keys to switch, Enter to activate |
| 2.4.7 Focus Visible | Visible focus indicator | Fluent UI provides default focus outline |
| 3.2.2 On Input | Predictable behavior | Toggle triggers expected filter change, no surprises |
| 4.1.2 Name, Role, Value | ARIA labels | `aria-label="Filter meeting requests by requestor"` on Pivot |
| 4.1.3 Status Messages | Announce state changes | Screen reader announces "My Requests, selected" |

**ARIA Attributes**:
```html
<div role="tablist" aria-label="Filter meeting requests by requestor">
  <button role="tab" aria-selected="true">My Requests</button>
  <button role="tab" aria-selected="false">All Requests</button>
</div>
```

**Keyboard Shortcuts**:
- `Tab`: Focus toggle control
- `Arrow Left/Right`: Switch between options
- `Enter` or `Space`: Activate selected option
- `Escape`: (Optional) Close if implemented as dropdown

**Screen Reader Announcements**:
- Initial: "Filter meeting requests by requestor, My Requests, selected"
- After toggle: "All Requests, selected"
- Loading state: "Loading meeting requests"
- Count update: "Showing 20 of 142 meeting requests"

---

## Summary

**Contracts Defined**:
1. ✅ **Backend API**: GET endpoint with `requestorEmail` parameter
2. ✅ **Frontend Component**: Internal state, event handlers, render structure
3. ✅ **Backend Tests**: 4 test cases covering filter logic
4. ✅ **Frontend Tests**: 6 test cases covering component behavior
5. ✅ **E2E Tests**: 6 test scenarios covering user workflows
6. ✅ **Accessibility**: WCAG 2.1 AA compliance with ARIA labels

**Next**: Create `quickstart.md` with step-by-step implementation guide.
