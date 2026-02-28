# Data Model: Global Search

**Feature**: Global Search  
**Phase**: 1 (Design - Data Model)  
**Date**: February 10, 2026

## Entities

### SearchQuery
**Description**: Represents a user's search input and associated metadata.

**Fields**:
- `term`: string - The user-entered search text (trimmed, non-empty)
- `timestamp`: DateTime - When the search was initiated (client-side)
- `scope`: string - Search scope identifier (default: "meetingRequests")

**Validation Rules**:
- `term`: Required, minimum 1 character after trimming, maximum 500 characters
- `term`: Leading/trailing whitespace automatically trimmed per FR-014
- `scope`: Read-only, always "meetingRequests" for MVP

**State Transitions**:
- `Idle` → `Pending` when user starts typing (debounce timer active)
- `Pending` → `Executing` when debounce timer expires and search runs
- `Executing` → `Complete` when filtered results are available
- `Executing` → `Error` if search fails (future backend search only)
- `Complete` → `Idle` when search is cleared
- `*` → `Idle` when user clears the search input

---

### SearchState
**Description**: Client-side state tracking the current search operation.

**Fields**:
- `searchTerm`: string - Current value of the search input (controlled component)
- `isSearching`: boolean - True while search is executing (shows loading indicator)
- `hasError`: boolean - True if search failed (future use)
- `errorMessage`: string | null - Error message to display (future use)
- `resultCount`: number - Count of matching results
- `lastSearchTime`: DateTime | null - Timestamp of last completed search

**Validation Rules**:
- `searchTerm`: No client-side validation; empty string is valid (shows all results)
- `isSearching`: Read-only, managed by component state
- `resultCount`: Read-only, derived from filtered results length

**State Relationships**:
- When `searchTerm` is empty, `resultCount` equals total items
- When `searchTerm` is non-empty, `resultCount` equals filtered items length
- `isSearching` is true only during debounce wait or future API call

---

### SearchResult
**Description**: Individual meeting request record that matches the search query.

**Fields**: (Inherits from existing MeetingRequest entity)
- `id`: number - Unique identifier
- `referenceNumber`: string - Meeting request reference (searchable)
- `requestorName`: string - Name of requestor (searchable)
- `requestType`: string - Type of request (searchable)
- `country`: string - Country (searchable)
- `title`: string - Meeting title (searchable)
- `meetingDate`: string/Date - Meeting date (searchable as formatted string)
- `matchedFields`: string[] - (Optional, P3) List of field names that matched the query

**Validation Rules**:
- All validation inherited from MeetingRequest entity
- No additional validation required for search results

**Transformation**:
- Client-side: All fields converted to lowercase strings for comparison
- Matching: Query term matches if ANY field contains the search term (case-insensitive)

---

## Data Flow

### Client-Side Search (MVP)

```
User Input → SearchBar Component
    ↓
SearchBar.onChange() → setSearchTerm(value)
    ↓
useEffect (debounce 300ms)
    ↓
Filter Logic: items.filter(item => matchesSearchTerm(item, searchTerm))
    ↓
Filtered Results → MeetingRequestsList Component
    ↓
Render Filtered Results or "No results found"
```

### Future Server-Side Search

```
User Input → SearchBar Component
    ↓
SearchBar.onChange() → setSearchTerm(value)
    ↓
useEffect (debounce 300ms)
    ↓
API Call: GET /api/meetingrequests?search={term}
    ↓
Backend: MeetingRequestsController.Search(term)
    ↓
Entity Framework: .Where(m => EF.Functions.Like(m.Field, $"%{term}%"))
    ↓
Filtered Results → Response JSON
    ↓
Frontend: Parse Response → Update State
    ↓
MeetingRequestsList Component
    ↓
Render Filtered Results or "No results found"
```

---

## State Management

### Component State (React useState)

**SearchBar Component**:
```javascript
const [searchTerm, setSearchTerm] = useState('');
```

**Parent Component** (Home or App):
```javascript
const [searchTerm, setSearchTerm] = useState('');
const [isSearching, setIsSearching] = useState(false);

// Debounce logic
useEffect(() => {
  setIsSearching(true);
  const timer = setTimeout(() => {
    // Trigger search
    setIsSearching(false);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

**MeetingRequestsList Component**:
- Receives `searchTerm` as prop
- Filters `items` array based on `searchTerm`
- Displays filtered results

---

## Search Matching Logic

### Case-Insensitive Partial Match (MVP)

**Algorithm**:
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
    formatDate(item.meetingDate) // Date as formatted string
  ];
  
  return searchableFields.some(field =>
    String(field || '').toLowerCase().includes(query)
  );
}
```

**Characteristics**:
- **Case-insensitive**: "Board" matches "board", "BOARD"
- **Partial matching**: "meet" matches "meeting", "Meet the Board"
- **All fields**: Matches across any searchable field
- **Null-safe**: Handles null/undefined field values
- **Whitespace handling**: Trims query before matching

---

## Edge Cases & Handling

### Empty Search
- **Input**: `searchTerm = ""`
- **Behavior**: Show all meeting requests (no filtering)
- **Implementation**: Early return `true` in filter function

### No Matches
- **Input**: `searchTerm = "xyz123"` (no matches)
- **Behavior**: Display "No results found" message
- **Implementation**: `filteredItems.length === 0` check in MeetingRequestsList

### Special Characters
- **Input**: `searchTerm = "@#$%"`
- **Behavior**: Match literally (no escaping needed for client-side)
- **Future Backend**: Parameterized queries prevent SQL injection

### Very Long Search
- **Input**: `searchTerm` length > 500 characters
- **Behavior**: (Future) Truncate to 500 characters with warning
- **Current**: No validation, relies on reasonable user input

### Whitespace-Only Search
- **Input**: `searchTerm = "   "`
- **Behavior**: Trimmed to empty, shows all results
- **Implementation**: `.trim()` before matching

---

## Performance Considerations

### Client-Side Filtering
- **Dataset Size**: Optimized for <1000 records
- **Time Complexity**: O(n * m) where n = items, m = searchable fields
- **Expected Performance**: <50ms for 1000 records on modern hardware

**Optimization**: If performance degrades:
1. Memoize filtered results with useMemo
2. Virtualize long result lists (react-window)
3. Migrate to server-side search

---

## Future Enhancements

### 1. Highlighted Matches (User Story 3)
- **Addition**: `matchedFields` array in SearchResult
- **UI**: Highlight matched text in result rows
- **Implementation**: String replacement with `<mark>` tags or CSS class

### 2. Search History
- **Entity**: `SearchHistory[]` stored in localStorage
- **Fields**: `term`, `timestamp`, `resultCount`
- **UI**: Dropdown with recent searches

### 3. Advanced Filters
- **Entity**: `SearchFilters` with `country`, `requestType`, `dateRange`
- **Behavior**: AND logic with text search
- **UI**: Filter chips or sidebar

### 4. Server-Side Search
- **API Contract**: Defined in `contracts/search-api.json`
- **Backend Entity**: No new entities, uses existing MeetingRequest
- **Pagination**: `page`, `pageSize` query parameters

---

## Summary

**Data Model Status**: ✅ Complete

**Key Entities**:
1. SearchQuery: User input and metadata
2. SearchState: Client-side search operation state
3. SearchResult: Filtered meeting request (extends existing entity)

**Design Decisions**:
- Client-side filtering with React state management (MVP)
- Simple partial string matching across all fields
- Debounced search with 300ms delay
- No new backend entities required for MVP
- Clear state transitions and error handling defined

**Next Phase**: Generate API contracts and quickstart guide.
