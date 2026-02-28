# Research: Global Search

**Feature**: Global Search  
**Phase**: 0 (Research & Technology Choices)  
**Date**: February 10, 2026

## Technology Decisions

### Frontend Search Implementation

**Decision**: Implement client-side filtering with React state management (useState/useEffect) and debounced input handling.

**Rationale**:
- Meeting requests data is already fetched and displayed in `MeetingRequestsList.jsx`
- For datasets under 1000 records, client-side filtering provides instant feedback without additional API calls
- React's built-in hooks provide sufficient state management without external libraries
- Debouncing prevents excessive re-renders and maintains responsive UX

**Alternatives Considered**:
1. Server-side search API: Rejected for MVP because data is already client-side and dataset size is small
2. Redux/Zustand for state: Rejected as unnecessary - local component state is sufficient
3. Third-party search library (Fuse.js, FlexSearch): Rejected to minimize dependencies; simple string matching is adequate

---

### Search Algorithm

**Decision**: JavaScript `String.prototype.toLowerCase()` + `includes()` for case-insensitive partial matching across all meeting request fields.

**Rationale**:
- Native JavaScript string methods are fast enough for datasets <1000 records
- Case-insensitive matching handled by converting both query and field values to lowercase
- Partial matching via `includes()` supports user expectation ("meet" matches "meeting")
- No tokenization or advanced ranking needed for initial MVP

**Alternatives Considered**:
1. Regular expressions: Rejected as more complex and slower for simple substring matching
2. Fuzzy matching (Levenshtein distance): Rejected to keep MVP simple; can add later if needed
3. Server-side full-text search: Deferred to future iteration when server-side pagination

 is implemented

---

### Debouncing Strategy

**Decision**: Custom React hook using `useEffect` cleanup with 300ms delay.

**Rationale**:
- 300ms provides good balance between responsiveness and reducing unnecessary re-renders
- React's `useEffect` cleanup function provides built-in debounce mechanism without external library
- Standard pattern in React applications

**Alternatives Considered**:
1. Lodash debounce: Rejected to avoid additional dependency when native solution is simple
2. Immediate search on every keystroke: Rejected due to excessive re-renders and poor UX for fast typists
3. Search button (no real-time): Rejected to preserve modern, responsive UX expected by users

---

### Backend Search Endpoint (Future)

**Decision**: For future server-side search, use Entity Framework Core `.Where()` with `EF.Functions.Like()` for SQL LIKE queries.

**Rationale**:
- Entity Framework Core is already in use for database access
- `EF.Functions.Like()` translates to SQL LIKE, providing efficient database-level filtering
- Supports parameterized queries preventing SQL injection
- Maintains consistency with existing data access patterns

**Alternatives Considered**:
1. Raw SQL queries: Rejected to maintain ORM abstraction and type safety
2. Full-text search (SQLite FTS): Deferred - not needed for current dataset size
3. Elasticsearch/external search service: Rejected as over-engineering for current scale

---

### UI Component Structure

**Decision**: Create `SearchBar.jsx` as a controlled component in `src/client/src/components/shell/`, pass search term to parent via callback.

**Rationale**:
- Controlled component pattern is React best practice for form inputs
- Placing in `shell/` directory keeps global navigation components together
- Lifting state up to shared parent allows `MeetingRequestsList` to re-render with filtered results
- Clear separation of concerns: SearchBar handles input, parent handles filtering logic

**Alternatives Considered**:
1. Context API for search state: Rejected as unnecessary for single-level prop passing
2. Inline search in Header.jsx: Rejected to maintain single responsibility principle
3. Search state in URL query params: Deferred to future iteration for shareable search links

---

### Testing Strategy

**Decision**: Playwright E2E tests for search UI flows, manual testing for MVP backend endpoint (when implemented).

**Rationale**:
- Playwright is already configured for E2E testing in this project
- E2E tests cover user-facing search scenarios (type text, see filtered results, clear search)
- MVP uses client-side filtering, so no backend endpoint to test initially
- When backend search is added, xUnit integration tests will cover API contract

**Test Coverage**:
1. E2E: User types search term → filtered results appear
2. E2E: User clears search → all results appear
3. E2E: No matches → "No results found" message
4. E2E: Search is case-insensitive
5. E2E: Partial matching works
6. (Future) Integration: Backend API search endpoint returns correct filtered results

**Alternatives Considered**:
1. Jest/React Testing Library for component tests: Deferred to focus on E2E user value first
2. Visual regression tests: Deferred as search UI is straightforward
3. Performance testing: Not needed for <1000 records, can add later if dataset grows

---

## Technical Unknowns Resolved

### 1. Search Scope
**Question**: Should search cover only meeting requests, or all application data?  
**Resolution**: Meeting requests only for MVP. Scope can be expanded later with multi-entity search.

### 2. Search Location
**Question**: Where should the search bar be placed in the UI?  
**Resolution**: Global navigation header (in `Header.jsx`), always visible when authenticated. Spec requirement FR-001 mandates global navigation placement.

### 3. Performance Requirements
**Question**: What is acceptable search response time?  
**Resolution**: <2 seconds per spec (SC-002). Client-side filtering meets this comfortably for <1000 records.

### 4. Error Handling
**Question**: How should search errors be displayed?  
**Resolution**: For client-side filtering, no API errors expected. Future backend search will show inline error message in results area per FR-012.

### 5. Search State Persistence
**Question**: Should search persist across page reloads or navigation?  
**Resolution**: Persist during session but not across reloads per FR-008. URL query params deferred to future iteration.

---

## Dependencies & Integration Points

### Frontend Dependencies
- **Existing**: React, React Router, Tailwind CSS
- **No new dependencies required** for MVP

### Backend Dependencies (Future)
- **Existing**: Entity Framework Core, SQLite
- **No new dependencies required** for future backend search

### Integration Points
1. `MeetingRequestsList.jsx`: Receives search term prop, filters displayed results
2. `Header.jsx` or parent component: Manages search state, passes term to list
3. (Future) `MeetingRequestsController.cs`: Add GET endpoint with search query parameter

---

## Best Practices & Patterns

### 1. Debounce Hook Pattern
```javascript
// Custom hook for debounced search
useEffect(() => {
  const timer = setTimeout(() => {
    // Execute search
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### 2. Case-Insensitive Search Pattern
```javascript
const query = searchTerm.toLowerCase().trim();
const matches = items.filter(item =>
  Object.values(item).some(val =>
    String(val).toLowerCase().includes(query)
  )
);
```

### 3. Controlled Input Pattern
```javascript
<input
  type="text"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="Search meeting requests..."
/>
```

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Client-side filtering slow for large datasets | Low | Medium | Monitor performance; migrate to server-side if >1000 records |
| Special characters break search | Low | Low | Sanitize input, test edge cases |
| Search state lost on navigation | Low | Low | Documented as expected behavior per FR-008 |
| Users expect advanced features (filters, sorting with search) | Medium | Low | Phase feature, deliver MVP first |

---

## Summary

All technical decisions documented and unknowns resolved. Ready for Phase 1 (Design).

**Key Takeaways**:
- Client-side filtering sufficient for MVP (dataset <1000 records)
- No new dependencies required
- Standard React patterns (controlled components, useEffect debounce)
- E2E tests with Playwright
- Future backend endpoint will use Entity Framework Core LIKE queries
