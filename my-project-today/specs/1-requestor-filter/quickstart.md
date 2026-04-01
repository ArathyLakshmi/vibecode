# Quickstart: Implementing Requestor Filter Toggle

**Feature**: 1-requestor-filter | **Date**: 2026-02-12  
**Estimated Time**: 9-10 hours (including testing)

## Prerequisites

- ✅ Backend server running (.NET 8)
- ✅ Frontend development server running (React + Vite)
- ✅ Database with MeetingRequests table (RequestorEmail column exists)
- ✅ MSAL authentication configured
- ✅ Existing infinite scroll implementation

---

## Phase 1: Backend API Extension (1 hour)

### Step 1.1: Add Backend Tests (Test-First) - 30 min

**File**: `src/server/Tests/MeetingRequestsControllerTests.cs` (create new file)

1. Create test file:
```bash
cd src/server/Tests
touch MeetingRequestsControllerTests.cs
```

2. Add test class:
```csharp
using Xunit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Controllers;
using VibeCode.Server.Data;

public class MeetingRequestsControllerFilterTests : IDisposable
{
    private readonly MeetingRequestsDbContext _context;
    private readonly MeetingRequestsController _controller;

    public MeetingRequestsControllerFilterTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<MeetingRequestsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new MeetingRequestsDbContext(options);
        _controller = new MeetingRequestsController(_context, null, null);
        
        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        _context.MeetingRequests.AddRange(
            new MeetingRequest {
                Id = 1,
                Title = "John's Request 1",
                RequestorEmail = "john.doe@example.com",
                RequestorName = "John Doe",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            },
            new MeetingRequest {
                Id = 2,
                Title = "John's Request 2",
                RequestorEmail = "john.doe@example.com",
                RequestorName = "John Doe",
                Status = "Approved",
                CreatedAt = DateTime.UtcNow
            },
            new MeetingRequest {
                Id = 3,
                Title = "Jane's Request",
                RequestorEmail = "jane.smith@example.com",
                RequestorName = "Jane Smith",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            }
        );
        _context.SaveChanges();
    }

    [Fact]
    public async Task List_WithRequestorEmail_ReturnsOnlyMatchingRequests()
    {
        // Act
        var result = await _controller.List(requestorEmail: "john.doe@example.com");
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var data = okResult.Value as dynamic;
        Assert.Equal(2, data.totalCount);
    }

    [Fact]
    public async Task List_WithoutRequestorEmail_ReturnsAllRequests()
    {
        // Act
        var result = await _controller.List(requestorEmail: null);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var data = okResult.Value as dynamic;
        Assert.Equal(3, data.totalCount);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
```

3. Run tests (should fail):
```bash
cd src/server
dotnet test
```

**Expected**: Tests fail because filter parameter doesn't exist yet.

---

### Step 1.2: Update Backend Controller - 15 min

**File**: `src/server/Controllers/MeetingRequestsController.cs`

1. Add `requestorEmail` parameter to List method:

**Find this code**:
```csharp
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] string? classification,
    [FromQuery] string? category,
    [FromQuery] string? status,
    [FromQuery] string? startDate,
    [FromQuery] string? endDate,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20)
```

**Replace with**:
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
```

2. Add filter logic after existing filters:

**Find this code** (after existing filters):
```csharp
if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed)) 
    q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date <= ed.Date);
```

**Add after it**:
```csharp
// NEW: Filter by requestor email
if (!string.IsNullOrWhiteSpace(requestorEmail))
{
    q = q.Where(x => 
        (!string.IsNullOrEmpty(x.RequestorEmail) && x.RequestorEmail == requestorEmail) ||
        (!string.IsNullOrEmpty(x.RequestorName) && x.RequestorName == requestorEmail));
}
```

3. Run tests (should pass):
```bash
dotnet test
```

**Expected**: All tests pass.

---

### Step 1.3: Verify Backend with Manual Test - 15 min

1. Start backend server:
```bash
cd src/server
dotnet run
```

2. Test API with PowerShell:
```powershell
# Test with filter
$response = Invoke-RestMethod -Uri 'http://localhost:5000/api/meetingrequests?requestorEmail=user@example.com' -Method Get
Write-Output "Filtered count: $($response.totalCount)"
$response.items | Format-Table requestorEmail, title

# Test without filter (all requests)
$response2 = Invoke-RestMethod -Uri 'http://localhost:5000/api/meetingrequests' -Method Get
Write-Output "Total count: $($response2.totalCount)"
```

**Expected**: Filter returns subset, no filter returns all.

---

## Phase 2: Frontend Filter Toggle (2.7 hours)

### Step 2.1: Add Filter State - 10 min

**File**: `src/client/src/components/MeetingRequestsList.jsx`

1. Import Pivot components at top of file:

**Find**:
```javascript
import {
  FluentProvider,
  teamsLightTheme,
  Field,
  Input,
  Textarea,
  Spinner
} from '@fluentui/react-components'
```

**Add Pivot imports**:
```javascript
import {
  FluentProvider,
  teamsLightTheme,
  Field,
  Input,
  Textarea,
  Spinner,
  Pivot,
  PivotItem
} from '@fluentui/react-components'
```

2. Add filter state after existing state declarations:

**Find**:
```javascript
const [items, setItems] = React.useState([])
const [loading, setLoading] = React.useState(true)
const [loadingMore, setLoadingMore] = React.useState(false)
// ... other state ...
```

**Add after**:
```javascript
const [filterMode, setFilterMode] = React.useState("my-requests")  // NEW
```

3. Get user email from MSAL:

**Find**:
```javascript
const { accounts } = useMsal()
const user Roles = useRoles()
const userEmail = accounts && accounts.length > 0 ? accounts[0].username : ''
```

**Already exists** - no change needed. We'll use the existing `userEmail` variable.

---

### Step 2.2: Update Initial Load to Include Filter - 20 min

**File**: `src/client/src/components/MeetingRequestsList.jsx`

1. Find the initial load useEffect:

**Find**:
```javascript
// Load initial data
React.useEffect(() => {
  let cancelled = false
  async function load() {
    setLoading(true)
    setPage(1)
    setHasMore(true)
    try {
      const res = await fetch('/api/meetingrequests?page=1&pageSize=20')
```

**Replace with**:
```javascript
// Load initial data with filter
React.useEffect(() => {
  let cancelled = false
  async function load() {
    setLoading(true)
    setPage(1)
    setHasMore(true)
    try {
      // Build URL with filter parameter
      const requestorParam = filterMode === 'my-requests' && userEmail
        ? `&requestorEmail=${encodeURIComponent(userEmail)}`
        : ''
      const res = await fetch(`/api/meetingrequests?page=1&pageSize=20${requestorParam}`)
```

2. Update the dependency array:

**Find**:
```javascript
  }, [refreshTrigger])
```

**Replace with**:
```javascript
  }, [refreshTrigger, filterMode, userEmail])  // Added filterMode and userEmail
```

---

### Step 2.3: Update Infinite Scroll Load More - 15 min

**File**: `src/client/src/components/MeetingRequestsList.jsx`

1. Find the loadMore callback:

**Find**:
```javascript
const loadMore = React.useCallback(async () => {
  if (loadingMore || !hasMore || loading) return
  
  setLoadingMore(true)
  try {
    const res = await fetch(`/api/meetingrequests?page=${page}&pageSize=20`)
```

**Replace with**:
```javascript
const loadMore = React.useCallback(async () => {
  if (loadingMore || !hasMore || loading) return
  
  setLoadingMore(true)
  try {
    // Build URL with filter parameter
    const requestorParam = filterMode === 'my-requests' && userEmail
      ? `&requestorEmail=${encodeURIComponent(userEmail)}`
      : ''
    const res = await fetch(`/api/meetingrequests?page=${page}&pageSize=20${requestorParam}`)
```

2. Update the dependency array:

**Find**:
```javascript
}, [page, hasMore, loading, loadingMore])
```

**Replace with**:
```javascript
}, [page, hasMore, loading, loadingMore, filterMode, userEmail])  // Added filterMode and userEmail
```

---

### Step 2.4: Add Pivot UI Component - 25 min

**File**: `src/client/src/components/MeetingRequestsList.jsx`

1. Find the render section (after loading check):

**Find** (look for the section with status filter tabs):
```javascript
  return (
    <div>
      {/* Status filter tabs */}
      <div className="mb-4 border-b border-gray-200">
```

**Add BEFORE the status filter tabs**:
```javascript
  return (
    <div>
      {/* NEW: Requestor Filter Toggle */}
      <div className="mb-4">
        <Pivot
          aria-label="Filter meeting requests by requestor"
          selectedKey={filterMode}
          onLinkClick={(event, item) => {
            if (item && item.props.itemKey) {
              setFilterMode(item.props.itemKey)
            }
          }}
          style={{ marginBottom: '16px' }}
        >
          <PivotItem 
            headerText="My Requests" 
            itemKey="my-requests"
            data-testid="filter-my-requests"
          />
          <PivotItem 
            headerText="All Requests" 
            itemKey="all-requests"
            data-testid="filter-all-requests"
          />
        </Pivot>
      </div>
      
      {/* Status filter tabs */}
      <div className="mb-4 border-b border-gray-200">
```

---

### Step 2.5: Update Empty State Message - 15 min

**File**: `src/client/src/components/MeetingRequestsList.jsx`

1. Find the empty state section:

**Find**:
```javascript
  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No meeting requests found.</p>
      </div>
    )
  }
```

**Replace with**:
```javascript
  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>
          {filterMode === 'my-requests' 
            ? "You haven't created any meeting requests yet."
            : "No meeting requests found."}
        </p>
      </div>
    )
  }
```

---

### Step 2.6: Test Frontend - 20 min

1. Start frontend server:
```bash
cd src/client
npm run dev
```

2. Open browser to http://localhost:5173

3. Manual test checklist:
- [ ] Page loads with "My Requests" tab selected
- [ ] List shows only your requests (check requestor names)
- [ ] Click "All Requests" → list refreshes
- [ ] List shows requests from all users
- [ ] Count updates (e.g., "Showing 10 of 50" changes)
- [ ] Click "My Requests" → filters again
- [ ] Search works in both modes
- [ ] Scroll to trigger infinite scroll → respects filter

---

## Phase 3: Integration Testing (2 hours)

### Step 3.1: Add Frontend Unit Tests - 45 min

**File**: `src/client/src/components/MeetingRequestsList.test.jsx` (extend existing or create)

1. Add test for default filter:
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MsalProvider } from '@azure/msal-react'
import MeetingRequestsList from './MeetingRequestsList'

describe('Requestor Filter Toggle', () => {
  const mockMsalInstance = {
    getAllAccounts: () => [{
      username: 'test@example.com',
      name: 'Test User'
    }]
  }

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  test('defaults to "My Requests" filter', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalCount: 0, hasMore: false  })
    })

    render(
      <MsalProvider instance={mockMsalInstance}>
        <MeetingRequestsList />
      </MsalProvider>
    )

    await waitFor(() => {
      const myRequestsTab = screen.getByTestId('filter-my-requests')
      expect(myRequestsTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  test('includes requestorEmail in API call for "My Requests"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalCount: 0, hasMore: false })
    })

    render(
      <MsalProvider instance={mockMsalInstance}>
        <MeetingRequestsList />
      </MsalProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('requestorEmail=test%40example.com')
      )
    })
  })

  test('toggles to "All Requests" and omits requestorEmail', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalCount: 0, hasMore: false })
    })

    render(
      <MsalProvider instance={mockMsalInstance}>
        <MeetingRequestsList />
      </MsalProvider>
    )

    const allRequestsTab = screen.getByTestId('filter-all-requests')
    fireEvent.click(allRequestsTab)

    await waitFor(() => {
      const calls = global.fetch.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).not.toContain('requestorEmail')
    })
  })
})
```

2. Run tests:
```bash
npm test
```

---

### Step 3.2: Add E2E Tests - 75 min

**File**: `src/client/e2e/tests/requestor-filter.spec.ts` (create new file)

1. Create E2E test file:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Requestor Filter Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes auth is set up
    await page.goto('/')
  })

  test('defaults to "My Requests" filter', async ({ page }) => {
    const myRequestsTab = page.locator('[data-testid="filter-my-requests"]')
    await expect(myRequestsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('toggles to "All Requests"', async ({ page }) => {
    const allRequestsTab = page.locator('[data-testid="filter-all-requests"]')
    await allRequestsTab.click()
    
    await expect(allRequestsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('count updates when filter changes', async ({ page }) => {
    const countDisplay = page.locator('[data-testid="count-display"]')
    const initialCount = await countDisplay.textContent()
    
    await page.click('[data-testid="filter-all-requests"]')
    await page.waitForLoadState('networkidle')
    
    const newCount = await countDisplay.textContent()
    expect(initialCount).not.toBe(newCount)
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.keyboard.press('Tab')  // Focus filter
    await page.keyboard.press('ArrowRight')  // Move to "All Requests"
    await page.keyboard.press('Enter')  // Activate
    
    const allRequestsTab = page.locator('[data-testid="filter-all-requests"]')
    await expect(allRequestsTab).toHaveAttribute('aria-selected', 'true')
  })
})
```

2. Run E2E tests:
```bash
npx playwright test
```

---

## Phase 4: Accessibility & Polish (1.7 hours)

### Step 4.1: Accessibility Testing - 30 min

1. Install axe-core (if not already):
```bash
npm install --save-dev @axe-core/react
```

2. Run accessibility scan in browser:
- Open DevTools
- Install axe DevTools extension
- Run scan on meeting requests page
- Fix any issues found

3. Manual keyboard test:
- [ ] Tab to filter toggle
- [ ] Arrow keys switch options
- [ ] Enter/Space activates
- [ ] Visible focus indicator
- [ ] Screen reader announces changes

---

### Step 4.2: Performance Testing - 20 min

1. Measure toggle response time:
```javascript
// Add to browser console
let startTime = performance.now()
document.querySelector('[data-testid="filter-all-requests"]').click()
// Wait for list to update, then:
let endTime = performance.now()
console.log(`Toggle response: ${endTime - startTime}ms`)  // Should be <500ms
```

2. Test with large dataset:
- Seed database with 1000+ requests
- Test filter toggle performance
- Verify infinite scroll still works

---

### Step 4.3: Cross-Browser Testing - 30 min

Test in each browser:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Edge (latest)

Verify:
- Filter toggle renders correctly
- Filter functionality works
- Keyboard navigation works
- Performance is acceptable

---

### Step 4.4: Final Manual Testing - 20 min

Complete all user scenarios from spec:
- [ ] **Scenario 1**: Default view shows only user's requests
- [ ] **Scenario 2**: Toggle to view all requests
- [ ] **Scenario 3**: Toggle back to my requests
- [ ] **Scenario 4**: Filter persists with search
- [ ] **Scenario 5**: Filter works with infinite scroll
- [ ] **Scenario 6**: Empty state handling
- [ ] **Scenario 7**: Visual feedback on filter state

---

## Phase 5: Documentation & Deployment (1 hour)

### Step 5.1: Code Comments - 15 min

Add inline comments to key sections:

```javascript
// Requestor filter state - defaults to "My Requests" mode
// Resets to default on page refresh (session-based)
const [filterMode, setFilterMode] = React.useState("my-requests")

// Build API URL with requestor filter parameter
// Only include requestorEmail when in "my-requests" mode and user is authenticated
const requestorParam = filterMode === 'my-requests' && userEmail
  ? `&requestorEmail=${encodeURIComponent(userEmail)}`
  : ''
```

---

### Step 5.2: Update Documentation - 20 min

1. Update README or user guide:
- Describe filter feature
- Screenshot of toggle UI
- Explain "My Requests" vs "All Requests"

2. Add to CHANGELOG:
```markdown
## [Unreleased]
### Added
- Requestor filter toggle in meeting requests list
  - Defaults to "My Requests" (shows only user's own requests)
  - Toggle to "All Requests" to see all requests in system
  - Works with existing search and infinite scroll
  - Session-based filter (resets on page refresh)
```

---

### Step 5.3: Git Commit & PR - 15 min

1. Stage all changes:
```bash
git add .
```

2. Commit with descriptive message:
```bash
git commit -m "feat: Add requestor filter toggle to meeting requests list

- Add requestorEmail query parameter to backend API
- Implement Pivot toggle component with 'My Requests' and 'All Requests'
- Default filter shows only user's own requests
- Integrates with existing search and infinite scroll
- Session-based filter state (resets on refresh)
- Full test coverage (unit, integration, E2E)
- WCAG 2.1 AA accessible (keyboard navigation, ARIA labels)

Closes #[issue-number]"
```

3. Push and create PR:
```bash
git push origin 1-requestor-filter
```

4. Create PR on GitHub/Azure DevOps with description.

---

### Step 5.4: Deployment Checklist - 10 min

Pre-deployment checks:
- [ ] All tests passing (backend, frontend, E2E)
- [ ] No console errors or warnings
- [ ] Accessibility scan passes
- [ ] Performance within targets (<500ms toggle)
- [ ] Code reviewed and approved
- [ ] Database index created (if needed)

Deployment steps:
1. Merge PR to main branch
2. Build backend: `dotnet build --configuration Release`
3. Build frontend: `npm run build`
4. Deploy backend to server
5. Deploy frontend static files
6. Verify in production

Post-deployment verification:
- [ ] Filter toggle visible and functional
- [ ] Filter correctly filters requests
- [ ] Count updates properly
- [ ] No errors in logs

---

## Troubleshooting

### Issue: Filter not applying

**Symptoms**: Clicking toggle doesn't filter list

**Solutions**:
1. Check browser console for API errors
2. Verify `userEmail` has value (console.log it)
3. Check backend logs for filter parameter
4. Verify database has RequestorEmail populated

### Issue: Count not updating

**Symptoms**: "Showing X of Y" stays same after toggle

**Solutions**:
1. Verify API response includes totalCount
2. Check that setCount(data.totalCount) is called
3. Verify count display uses correct state variable

### Issue: Infinite scroll breaks after toggle

**Symptoms**: Scrolling doesn't load more after filter change

**Solutions**:
1. Verify page resets to 1 when filter changes
2. Check hasMore flag is set correctly
3. Verify loadMore includes filter parameter
4. Check Intersection Observer is still observing sentinel element

---

## Success Criteria (Final Check)

- [ ] Toggle control visible above list (FR-1)
- [ ] Default filter is "My Requests" (FR-2)
- [ ] User identity matches requestorEmail (FR-3)
- [ ] Toggle action refreshes list (FR-4)
- [ ] Pagination works with filter (FR-5)
- [ ] Count displays filtered total (FR-6)
- [ ] Search works within filter scope (FR-7)
- [ ] Filter persists during session (FR-8)
- [ ] Infinite scroll respects filter (FR-9)
- [ ] Visual state is clear (FR-10)
- [ ] Keyboard accessible (FR-11)
- [ ] Toggle response <500ms
- [ ] 100% keyboard operable
- [ ] Zero WCAG violations

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Backend API Extension | 1 hour |
| Frontend Filter Toggle | 2.7 hours |
| Integration Testing | 2 hours |
| Accessibility & Polish | 1.7 hours |
| Documentation & Deployment | 1 hour |
| **Total** | **8.4 hours** |

**With buffer**: 10-11 hours (includes breaks and unexpected issues)

---

**Implementation Complete!** 🎉

The requestor filter toggle is now fully functional, tested, and deployed.
