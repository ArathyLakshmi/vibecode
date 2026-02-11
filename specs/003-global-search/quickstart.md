# Quickstart Guide: Global Search

**Feature**: Global Search  
**Branch**: `003-global-search`  
**Last Updated**: February 10, 2026

## Prerequisites

- Node.js 16+ and npm installed
- .NET 8.0 SDK installed
- Git repository cloned
- Both frontend and backend dependencies installed

## Quick Start (Development)

### 1. Start the Development Environment

```powershell
# Terminal 1: Start backend server
cd src\server
dotnet run

# Terminal 2: Start frontend dev server
cd src\client
npm run dev
```

Backend runs at: `http://localhost:5000`  
Frontend runs at: `http://localhost:5173`

### 2. Verify Search Functionality

1. Open browser to `http://localhost:5173`
2. Sign in with your Azure AD credentials
3. Locate the search bar in the global navigation header
4. Type a search term (e.g., "board", "REF-", requestor name)
5. Observe meeting requests list filter in real-time
6. Clear the search to see all results again

### 3. Test Search Scenarios

**Basic Search:**
```
1. Type "board" → See only requests with "board" in any field
2. Clear search → See all requests
```

**Case-Insensitive:**
```
1. Type "BOARD" → Same results as "board"
2. Type "Board" → Same results as "board"
```

**Partial Matching:**
```
1. Type "meet" → Matches "meeting", "meetings", etc.
```

**No Results:**
```
1. Type "xyz123abc" → "No results found" message appears
```

**Reference Number Search:**
```
1. Type "REF-" → All requests with "REF-" in reference number
2. Type specific ref (e.g., "REF-001") → Exact match
```

---

## Implementation Overview

### MVP (Client-Side Search)

The MVP uses **client-side filtering** without backend API calls:

1. **SearchBar Component** (`src/client/src/components/shell/SearchBar.jsx`):
   - Controlled input with local state
   - Debounces user input (300ms delay)
   - Emits search term to parent via callback

2. **Parent Component** (Home or App):
   - Manages search state
   - Passes search term to MeetingRequestsList

3. **MeetingRequestsList Component**:
   - Receives search term as prop
   - Filters items array using JavaScript `.filter()`
   - Renders filtered results or "No results found"

### Search Algorithm (Client-Side)

```javascript
function matchesSearch(item, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') return true;
  
  const query = searchTerm.toLowerCase().trim();
  const searchableFields = [
    item.referenceNumber,
    item.requestorName,
    item.requestType,
    item.country,
    item.title,
    formatDate(item.meetingDate)
  ];
  
  return searchableFields.some(field =>
    String(field || '').toLowerCase().includes(query)
  );
}
```

---

## Running Tests

### E2E Tests (Playwright)

```powershell
cd src\client

# Run all E2E tests
npm run e2e

# Run search tests only
npx playwright test tests/search.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test
npx playwright test -g "filters meeting requests by search term"
```

### Integration Tests (Backend - Future)

```powershell
cd src\server
dotnet test --filter "Category=Search"
```

---

## File Structure

### Frontend Components

```
src/client/src/
├── components/
│   ├── shell/
│   │   ├── Header.jsx              # Includes SearchBar
│   │   └── SearchBar.jsx           # NEW: Search input component
│   └── MeetingRequestsList.jsx     # MODIFIED: Accepts searchTerm prop
└── e2e/tests/
    └── search.spec.ts               # NEW: E2E tests
```

### Backend (Future)

```
src/server/
├── Controllers/
│   └── MeetingRequestsController.cs # MODIFIED: Add search parameter
└── Tests/Integration/
    └── SearchTests.cs               # NEW: Search API tests
```

---

## Configuration

### Environment Variables

No new environment variables required for MVP.

### Feature Flags

No feature flags required.

---

## Debugging

### Frontend Debugging

**Check Search State:**
```javascript
// Add to parent component
console.log('Search term:', searchTerm);
console.log('Filtered results:', filteredItems);
```

**Verify Debounce:**
```javascript
// Add to useEffect
useEffect(() => {
  console.log('Debounce triggered for:', searchTerm);
  // ... rest of code
}, [searchTerm]);
```

**Inspect Props:**
- Use React DevTools to inspect SearchBar and MeetingRequestsList props
- Check `searchTerm` prop value in MeetingRequestsList

### Backend Debugging (Future)

```csharp
// Add to Search endpoint
_logger.LogInformation("Search request: term={SearchTerm}", searchTerm);
```

---

## Common Issues & Solutions

### Issue: Search not filtering results

**Cause**: Search term not passed to MeetingRequestsList  
**Solution**: Verify prop drilling: SearchBar → Parent → MeetingRequestsList

```javascript
// Parent component must pass searchTerm prop
<MeetingRequestsList searchTerm={searchTerm} />
```

### Issue: Search is too slow/laggy

**Cause**: Debounce delay too short or missing  
**Solution**: Ensure 300ms debounce is implemented

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    // Execute search
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### Issue: Special characters cause errors

**Cause**: Unescaped regex or improper string handling  
**Solution**: Use `.includes()` not regex; it handles special chars safely

```javascript
// CORRECT
String(field).toLowerCase().includes(query)

// INCORRECT (don't use)
new RegExp(query, 'i').test(field)
```

### Issue: "No results found" doesn't appear

**Cause**: Missing conditional render in MeetingRequestsList  
**Solution**: Add check for empty filtered array

```javascript
{filteredItems.length === 0 && (
  <div>No results found</div>
)}
```

---

## Performance Benchmarks

### Client-Side Search (MVP)

| Dataset Size | Search Time | Notes |
|--------------|-------------|-------|
| 100 records  | <10ms       | Instant |
| 500 records  | <25ms       | Very fast |
| 1000 records | <50ms       | Fast |
| 2000 records | ~100ms      | Acceptable |
| 5000 records | ~250ms      | Consider server-side |

**Threshold**: Migrate to server-side search if dataset exceeds 2000 records or search time > 200ms.

---

## Next Steps

### For Developers

1. **Implement MVP**: Follow tasks in [tasks.md](tasks.md) (once generated)
2. **Write E2E Tests**: Test search scenarios before implementing UI
3. **Implement SearchBar Component**: Controlled input with debounce
4. **Modify MeetingRequestsList**: Add filtering logic
5. **Manual Testing**: Verify all acceptance scenarios

### Future Enhancements

1. **Server-Side Search**: Implement backend API endpoint per [contracts/search-api.json](contracts/search-api.json)
2. **Search Highlighting**: Highlight matched terms in results (User Story 3)
3. **Search History**: Store recent searches in localStorage
4. **Advanced Filters**: Add dropdown filters for country, request type
5. **URL Persistence**: Store search term in URL query params

---

## Resources

- **Feature Spec**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contract**: [contracts/search-api.json](contracts/search-api.json)

---

## Support & Questions

**Expected Performance**: <50ms search for <1000 records  
**Browser Compatibility**: Modern browsers (Chrome, Firefox, Edge, Safari)  
**Authentication**: Search requires authenticated user session  
**Data Scope**: Meeting requests only (MVP)

---

## Verification Checklist

Before considering the feature complete:

- [ ] Search bar visible in global navigation when authenticated
- [ ] Typing in search bar filters meeting requests list
- [ ] Search is case-insensitive
- [ ] Partial matching works (e.g., "meet" matches "meeting")
- [ ] Clearing search shows all results
- [ ] "No results found" message appears when no matches
- [ ] Search debounces properly (300ms delay)
- [ ] All E2E tests pass
- [ ] Search works across all meeting request fields
- [ ] Loading state shows during search (if applicable)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
