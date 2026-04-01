# Research: Requestor Filter Toggle

**Feature**: 1-requestor-filter | **Phase**: 0 - Research | **Date**: 2026-02-12

## Overview

This document resolves all NEEDS CLARIFICATION items from the planning phase and provides researched technology decisions for implementing the requestor filter toggle feature.

---

## Research Task 1: Backend Filtering Implementation Patterns

**Question**: Best practice for filtering by user identity in ASP.NET Core with Entity Framework?

### Research Findings

**Option A: Query parameter `?requestorEmail=user@example.com`**
- **Pros**: Explicit, self-documenting, easy to test, follows REST conventions
- **Cons**: Slightly longer URL
- **Example**: `GET /api/meetingrequests?page=1&requestorEmail=user@example.com`

**Option B: Boolean flag `?myRequests=true`**
- **Pros**: Shorter URL, clear intent
- **Cons**: Requires backend to resolve "my" to current user, adds authentication dependency to API layer
- **Example**: `GET /api/meetingrequests?page=1&myRequests=true`

**Option C: Header-based filtering (e.g., `X-Filter-Requestor`)**
- **Pros**: Keeps URL clean
- **Cons**: Not RESTful, harder to test, less discoverable
- **Example**: `GET /api/meetingrequests?page=1` with header `X-Filter-Requestor: user@example.com`

### LINQ Query Optimization

**Current query structure** (from existing code):
```csharp
var q = _db.MeetingRequests.AsQueryable();
// Apply filters
var result = await q
    .OrderByDescending(x => x.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

**Proposed optimization** (add WHERE clause):
```csharp
// Add requestor filter if provided
if (!string.IsNullOrWhiteSpace(requestorEmail))
{
    q = q.Where(x => x.RequestorEmail == requestorEmail || x.RequestorName == requestorEmail);
}
```

**Index considerations**:
- RequestorEmail column likely needs index for performance
- Check existing migrations - MeetingRequests table may already have index
- If not, add non-clustered index: `CREATE INDEX IX_MeetingRequests_RequestorEmail ON MeetingRequests (RequestorEmail)`

**Backwards compatibility**:
- Optional query parameter (nullable string)
- When `requestorEmail` is null or empty, no filter applied (existing behavior)
- No breaking changes for existing API consumers

### Decision

**✅ SELECTED: Option A - Query parameter `?requestorEmail=user@example.com`**

**Rationale**:
- Most RESTful and explicit approach
- Easy to test (just pass query parameter)
- Frontend has user email available from MSAL context
- No backend authentication complexity
- Compatible with existing pagination parameters
- Self-documenting API (clear what filter does from URL)

**Implementation**:
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
    var q = _db.MeetingRequests.AsQueryable();
    
    // Existing filters...
    
    // NEW: Requestor filter
    if (!string.IsNullOrWhiteSpace(requestorEmail))
    {
        q = q.Where(x => 
            (!string.IsNullOrEmpty(x.RequestorEmail) && x.RequestorEmail == requestorEmail) ||
            (!string.IsNullOrEmpty(x.RequestorName) && x.RequestorName == requestorEmail));
    }
    
    // Pagination...
}
```

---

## Research Task 2: User Identity Extraction

**Question**: How to reliably get current user's email from MSAL authentication?

### Research Findings

**Frontend (React + MSAL)**:

Current MSAL integration in the app:
```javascript
const { accounts } = useMsal()
const userEmail = accounts && accounts.length > 0 ? accounts[0].username : ''
```

**Available user identity fields** in MSAL account object:
- `username`: Primary email address (e.g., "user@example.com") ✅ **Most reliable**
- `name`: Display name (e.g., "John Doe")
- `localAccountId`: Azure AD object ID (GUID)
- `homeAccountId`: Tenant-specific ID

**Backend (ASP.NET Core)**:

Current authentication in the app (from MeetingRequestsController.cs):
```csharp
if (User?.Identity?.IsAuthenticated == true)
{
    resolvedRequestor = User.FindFirst("name")?.Value 
        ?? User.FindFirst("preferred_username")?.Value 
        ?? User.Identity?.Name;
}
```

**Available claims** from MSAL token:
- `"email"`: Email address ✅ **Most common**
- `"preferred_username"`: Email or UPN ✅ **Fallback**
- `"name"`: Display name
- `"oid"`: Object ID (GUID)

### Matching Strategy

**Frontend stores**: `RequestorEmail` field when creating meeting request  
**Frontend sends**: `accounts[0].username` (email) as filter parameter  
**Backend filters**: `WHERE RequestorEmail == requestorEmail`

**Edge cases**:
- User has no email in MSAL token: Fall back to `preferred_username` or display name
- RequestorEmail field is null in database: No match (request won't appear in "My Requests")
- Multiple accounts signed in: Use active account (`accounts[0]`)

### Decision

**✅ SELECTED: Use `accounts[0].username` (frontend) and match against `RequestorEmail` (backend)**

**Rationale**:
- `username` in MSAL is the most reliable email field
- Existing code already uses this pattern when creating requests
- Consistent matching between request creation and filtering
- Simple string comparison (no GUID lookups or complex joins)

**Implementation**:

**Frontend**:
```javascript
const { accounts } = useMsal()
const userEmail = accounts?.[0]?.username || ''

// In API call
const url = filterMode === 'my-requests' && userEmail
  ? `/api/meetingrequests?page=${page}&pageSize=20&requestorEmail=${encodeURIComponent(userEmail)}`
  : `/api/meetingrequests?page=${page}&pageSize=20`
```

**Backend** (no changes needed, existing field already populated):
```csharp
// Already set when creating request:
RequestorEmail = User.FindFirst("email")?.Value 
    ?? User.FindFirst("preferred_username")?.Value
```

---

## Research Task 3: Fluent UI Toggle Component Selection

**Question**: Which Fluent UI component best represents a two-state filter toggle?

### Research Findings

**Option A: `Pivot` component**
- **Description**: Tab-like selection between options
- **Appearance**: Horizontal tabs with underline indicator for selected tab
- **Accessibility**: Built-in ARIA roles, keyboard navigation (arrow keys)
- **Use case**: Mutually exclusive views/filters
- **Example**: 
  ```jsx
  <Pivot selectedKey={filterMode} onLinkClick={(item) => setFilterMode(item.props.itemKey)}>
    <PivotItem headerText="My Requests" itemKey="my-requests" />
    <PivotItem headerText="All Requests" itemKey="all-requests" />
  </Pivot>
  ```
- **Pros**: ✅ Clear visual separation, ✅ Standard pattern for view switching, ✅ Accessible
- **Cons**: Takes more horizontal space

**Option B: `ToggleButton` component**
- **Description**: Button with pressed/unpressed state
- **Appearance**: Single button that changes appearance when clicked
- **Accessibility**: ARIA pressed state
- **Use case**: Binary on/off states
- **Example**:
  ```jsx
  <ToggleButton
    checked={filterMode === 'all-requests'}
    onClick={() => setFilterMode(filterMode === 'my-requests' ? 'all-requests' : 'my-requests')}
  >
    {filterMode === 'my-requests' ? 'My Requests' : 'All Requests'}
  </ToggleButton>
  ```
- **Pros**: ✅ Compact, ✅ Clear for binary choice
- **Cons**: ❌ Less clear which mode is active (just shows current label)

**Option C: `MenuButton` with selection indicator**
- **Description**: Dropdown menu with checkmark for selected option
- **Appearance**: Button that opens menu, selected item has checkmark
- **Accessibility**: Menu role, keyboard navigation
- **Use case**: Selection from multiple options
- **Pros**: ✅ Compact, ✅ Extensible (can add more filter options later)
- **Cons**: ❌ Requires extra click (open menu, then select), ❌ Overkill for 2 options

**Option D: `Switch` component**
- **Description**: iOS-style toggle switch
- **Appearance**: Sliding toggle (off/on)
- **Accessibility**: Switch role, keyboard toggle
- **Use case**: Boolean on/off states
- **Pros**: ✅ Very compact, ✅ Clear visual feedback
- **Cons**: ❌ Typically for settings (not filters), ❌ Doesn't show both option labels simultaneously

### Visual Comparison from Spec Requirements

**From spec.md Success Criteria**:
- "Users can identify the current filter state within 1 second"
- "Visual indicators: color, background, border, or icon"
- "Clear visual feedback about the current filter mode"

**Best match**: `Pivot` component shows both options and clearly indicates which is active.

### Decision

**✅ SELECTED: `Pivot` component from Fluent UI**

**Rationale**:
- **Clearest UX**: Both filter options always visible, active option clearly highlighted
- **Familiar pattern**: Users recognize tabs as view/filter switching
- **Accessibility**: Built-in keyboard navigation (Tab to focus, Arrow keys to switch)
- **Fluent UI standard**: Matches Microsoft 365 / SharePoint patterns
- **Meets spec**: Users can identify filter state within 1 second (clear underline + color)
- **Future-proof**: Easy to add 3rd option later if needed (e.g., "Team Requests")

**Implementation**:
```jsx
import { Pivot, PivotItem } from '@fluentui/react-components'

<Pivot
  aria-label="Filter meeting requests by requestor"
  selectedKey={filterMode}
  onLinkClick={(event, item) => {
    if (item) {
      setFilterMode(item.props.itemKey)
    }
  }}
>
  <PivotItem headerText="My Requests" itemKey="my-requests" />
  <PivotItem headerText="All Requests" itemKey="all-requests" />
</Pivot>
```

**Styling**: Use default Fluent UI theme styling (no custom CSS needed), integrates with existing Teams light theme.

---

## Research Task 4: Filter State Management Strategy

**Question**: Should filter state be in React component state, context, URL query parameter, or sessionStorage?

### Research Findings

**Option A: React useState in component**
- **Storage**: Component-level state
- **Persistence**: Lost on component unmount or page refresh
- **Complexity**: Simple (one line of code)
- **Example**: `const [filterMode, setFilterMode] = useState("my-requests")`
- **Pros**: ✅ Simple, ✅ Matches spec ("resets on refresh"), ✅ No side effects
- **Cons**: ❌ Lost on navigation (if component unmounts)

**Option B: URL query parameter**
- **Storage**: Browser URL (e.g., `?filter=my-requests`)
- **Persistence**: Persists across refresh, bookmarkable, back/forward navigation
- **Complexity**: Medium (need useSearchParams from react-router)
- **Example**: `const [searchParams, setSearchParams] = useSearchParams()`
- **Pros**: ✅ Shareable URLs, ✅ Browser history
- **Cons**: ❌ **Violates spec** ("resets on refresh"), ❌ More complex

**Option C: sessionStorage**
- **Storage**: Browser session storage
- **Persistence**: Persists during session, lost on tab close
- **Complexity**: Medium (need useEffect to sync)
- **Example**: `sessionStorage.setItem('filterMode', filterMode)`
- **Pros**: ✅ Survives navigation, ✅ Tab-scoped
- **Cons**: ❌ **Violates spec** ("resets on page refresh"), ❌ More complex

**Option D: React Context**
- **Storage**: Global state provider
- **Persistence**: Lost on refresh
- **Complexity**: High (need Context provider, useContext hook)
- **Pros**: ✅ Shared across components
- **Cons**: ❌ Overkill for single component, ❌ Still resets on refresh

### Spec Requirement Analysis

From spec.md FR-8:
> "The filter state must persist during the user's session (navigating away and back maintains the selection) but reset to "My Requests" on full page refresh."

**Key phrase**: "navigating away and back maintains the selection"

**Interpretation options**:
1. **Session = React component lifecycle** (state lost on unmount)
2. **Session = Browser tab session** (state persists via sessionStorage until tab close)

**Clarification**: In the context of a Single Page Application (SPA):
- "Navigating away" typically means routing to different page *within the SPA*
- SPA doesn't unmount root components during route changes
- MeetingRequestsList component stays mounted when navigating to detail drawer

**Conclusion**: Option A (React useState) likely sufficient for SPA navigation.

### Decision

**✅ SELECTED: Option A - React useState in MeetingRequestsList component**

**Rationale**:
- **Simplest implementation**: One line of code
- **Meets spec**: Resets on page refresh (hard reload) ✅
- **SPA-compatible**: Component stays mounted during typical navigation (drawer open/close)
- **No side effects**: No storage APIs, no URL pollution
- **Easy to test**: Just assert component state

**Implementation**:
```javascript
export default function MeetingRequestsList({ /* props */ }) {
  const [filterMode, setFilterMode] = useState("my-requests")  // Default to my requests
  const { accounts } = useMsal()
  const userEmail = accounts?.[0]?.username || ''
  
  // Effect to reload data when filter changes
  useEffect(() => {
    setPage(1)
    setItems([])
    setHasMore(true)
    loadData()
  }, [filterMode])
  
  // ...
}
```

**If session persistence across hard navigation is required later**: Easy to upgrade to sessionStorage by adding:
```javascript
const [filterMode, setFilterMode] = useState(() => {
  return sessionStorage.getItem('filterMode') || 'my-requests'
})

useEffect(() => {
  sessionStorage.setItem('filterMode', filterMode)
}, [filterMode])
```

---

## Research Task 5: Integration with Infinite Scroll

**Question**: How to reset infinite scroll pagination when filter changes?

### Research Findings

**Current infinite scroll implementation** (from MeetingRequestsList.jsx):
```javascript
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
const [items, setItems] = useState([])

const loadMore = useCallback(async () => {
  if (loadingMore || !hasMore || loading) return
  setLoadingMore(true)
  const res = await fetch(`/api/meetingrequests?page=${page}&pageSize=20`)
  const data = await res.json()
  setItems(prev => [...prev, ...data.items])
  setHasMore(data.hasMore)
  setPage(prevPage => prevPage + 1)
  setLoadingMore(false)
}, [page, hasMore, loading, loadingMore])

// Intersection Observer triggers loadMore
```

**Issue when filter changes**:
- If user has scrolled to page 5 with "All Requests" active
- Then toggles to "My Requests"
- Current page=5, but filtered dataset might only have 2 pages
- Need to reset to page 1 and clear items array

**Option A: useEffect watching filterMode**
```javascript
useEffect(() => {
  // Reset pagination state
  setPage(1)
  setItems([])
  setHasMore(true)
  setLoading(true)
  
  // Load first page with new filter
  loadData()
}, [filterMode])
```
- **Pros**: ✅ Clean separation, ✅ Automatic, ✅ Works with initial load
- **Cons**: Need separate loadData function (not just loadMore)

**Option B: Inline reset in toggle handler**
```javascript
const handleToggle = (newMode) => {
  setFilterMode(newMode)
  setPage(1)
  setItems([])
  setHasMore(true)
  loadData()
}
```
- **Pros**: ✅ Explicit, ✅ Clear cause-effect
- **Cons**: ❌ Duplicates initial load logic, ❌ Misses updates from other sources

**Option C: Reset only page and items, let existing useEffect reload**
```javascript
useEffect(() => {
  setPage(1)
  setItems([])
  // Existing load useEffect will trigger
}, [filterMode])
```
- **Pros**: ✅ Reuses existing load logic
- **Cons**: ❌ Depends on useEffect ordering (fragile)

### Intersection Observer Considerations

**Issue**: When items array is cleared, sentinel element may move above viewport, not triggering observer.

**Solution**: Rely on initial load useEffect to load page 1, observer handles subsequent pages normally.

### Decision

**✅ SELECTED: Option A - useEffect watching filterMode**

**Rationale**:
- **Clean separation**: Filter change logic in one place
- **Automatic**: Works for any filter mode change (not just toggle click)
- **Testable**: Can verify behavior by changing filterMode in tests
- **Reusable**: Similar pattern works for other filter types in future

**Implementation**:
```javascript
// Separate function for loading data (initial or filtered)
const loadData = useCallback(async () => {
  setLoading(true)
  try {
    const requestorParam = filterMode === 'my-requests' && userEmail
      ? `&requestorEmail=${encodeURIComponent(userEmail)}`
      : ''
    const res = await fetch(`/api/meetingrequests?page=1&pageSize=20${requestorParam}`)
    const data = await res.json()
    setItems(data.items || [])
    setCount(data.totalCount)
    setHasMore(data.hasMore)
    setPage(2)  // Next page to load
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [filterMode, userEmail])

// Reload when filter changes
useEffect(() => {
  loadData()
}, [filterMode, loadData])

// loadMore function for infinite scroll (unchanged logic)
const loadMore = useCallback(async () => {
  if (loadingMore || !hasMore || loading) return
  setLoadingMore(true)
  const requestorParam = filterMode === 'my-requests' && userEmail
    ? `&requestorEmail=${encodeURIComponent(userEmail)}`
    : ''
  const res = await fetch(`/api/meetingrequests?page=${page}&pageSize=20${requestorParam}`)
  const data = await res.json()
  setItems(prev => [...prev, ...data.items])
  setHasMore(data.hasMore)
  setPage(prevPage => prevPage + 1)
  setLoadingMore(false)
}, [page, hasMore, loading, loadingMore, filterMode, userEmail])
```

**Key points**:
- `loadData`: Loads page 1 with current filter (used for initial load and filter changes)
- `loadMore`: Appends next page with current filter (used for infinite scroll)
- Both functions include `requestorParam` based on `filterMode` and `userEmail`
- Filter change triggers `loadData`, which resets state and loads fresh page 1

---

## Summary of Research Decisions

| Research Task | Decision | Rationale |
|---------------|----------|-----------|
| **Backend filtering** | `?requestorEmail=user@example.com` query parameter | RESTful, explicit, easy to test, backwards compatible |
| **User identity** | `accounts[0].username` (frontend), match `RequestorEmail` (backend) | Most reliable, consistent with request creation |
| **Toggle component** | Fluent UI `Pivot` component | Clearest UX, accessible, familiar pattern, meets 1s identification goal |
| **State management** | React `useState` in component | Simple, meets spec (resets on refresh), sufficient for SPA |
| **Pagination reset** | `useEffect` watching `filterMode`, call `loadData()` | Clean, automatic, testable, reusable pattern |

---

## Additional Considerations

### Performance

**Database query performance**:
- Add index on `RequestorEmail` column if not exists
- Typical query: `SELECT * FROM MeetingRequests WHERE RequestorEmail = 'user@example.com' ORDER BY CreatedAt DESC`
- Expected: <100ms for datasets up to 10,000 requests

**Frontend performance**:
- Toggle click → API call → render: Target <500ms
- Fluent UI Pivot renders instantly (no heavy computation)
- API call is bottleneck (network + database query)

### Accessibility

**Keyboard navigation**:
- Tab key focuses Pivot component
- Arrow keys (Left/Right) switch between options
- Enter/Space activates selected option
- Fluent UI provides built-in keyboard support

**Screen reader**:
- `aria-label="Filter meeting requests by requestor"` on Pivot
- Pivot announces: "My Requests, selected" or "All Requests"
- State change announced automatically

**WCAG 2.1 AA compliance**:
- ✅ Color contrast: Fluent UI default theme meets contrast ratios
- ✅ Touch target size: Pivot tabs are 44x44px minimum
- ✅ Focus indicators: Visible focus outline on Pivot
- ✅ Semantic markup: Proper ARIA roles (tablist, tab, tabpanel)

### Error Handling

**Scenarios**:
1. **User not authenticated**: `userEmail` is empty → don't apply filter, show all requests
2. **API returns error**: Show error message, don't update items array
3. **RequestorEmail field is null**: Request won't match filter (intentional, requestor unknown)
4. **Network failure**: Show error, keep previous items visible

**Implementation**:
```javascript
try {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  setItems(data.items || [])
} catch (err) {
  setError(`Failed to load requests: ${err.message}`)
  // Keep previous items visible
}
```

---

## Next Steps

With research complete:
1. ✅ All technology decisions made
2. ✅ Implementation patterns documented
3. ✅ No NEEDS CLARIFICATION remaining
4. ➡️ **Ready for Phase 1**: Generate data-model.md, contracts/README.md, and quickstart.md

**Phase 1 will produce**:
- Data model for filter state and API contract
- API endpoint specification
- Component interface contract
- Step-by-step implementation guide
