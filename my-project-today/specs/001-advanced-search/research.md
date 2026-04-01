# Research: Advanced Search & Filtering

**Feature**: 001-advanced-search  
**Date**: March 3, 2026  
**Phase**: 0 (Outline & Research)

## Overview

This document consolidates research findings for implementing advanced search functionality in the Meeting Requests Management system. Research covers technology choices, architectural patterns, performance optimization strategies, and testing approaches.

---

## Research Areas

### 1. Complex Query Building with Entity Framework Core

**Decision**: Use dynamic LINQ expression building via `IQueryable<T>`  
**Rationale**: 
- EF Core's LINQ provider translates expressions to optimized SQL at query time
- Allows composition of filters without string concatenation (SQL injection safe)
- Supports parameterized queries automatically
- Type-safe at compile time

**Implementation Pattern**:
```csharp
public IQueryable<MeetingRequest> ApplyFilters(
    IQueryable<MeetingRequest> query,
    SearchFilterDto filters)
{
    if (filters.Categories?.Any() == true)
        query = query.Where(m => filters.Categories.Contains(m.Category));
    
    if (filters.Statuses?.Any() == true)
        query = query.Where(m => filters.Statuses.Contains(m.Status));
    
    if (filters.DateStart.HasValue)
        query = query.Where(m => m.MeetingDate >= filters.DateStart.Value);
    
    // ... additional filters
    
    return query;
}
```

**Alternatives Considered**:
- Raw SQL with string building → Rejected (SQL injection risk, type-unsafe)
- Stored procedures → Rejected (less flexible, harder to test)
- Dapper with dynamic SQL → Rejected (no compile-time safety)

**Best Practices**:
- Apply filters in order of selectivity (most restrictive first)
- Use indexed columns for WHERE clauses
- Avoid `Contains()` on large text fields without full-text indexing
- Paginate results before materializing to avoid loading large datasets

---

### 2. Boolean Search Query Parsing

**Decision**: Implement recursive descent parser for Boolean operators (AND, OR, NOT) and field-specific syntax  
**Rationale**:
- Simple grammar: `term | "phrase" | field:value | expr AND expr | expr OR expr | NOT expr`
- Can be implemented in ~200 LOC without external dependencies
- Full control over operator precedence and error messages

**Parsing Strategy**:
1. Tokenize input string (quotes, operators, field prefixes)
2. Build abstract syntax tree (AST) using recursive descent
3. Transform AST to LINQ expression tree
4. Combine with other filters using `AndAlso`/`OrElse`

**Example Grammar**:
```
query      := orExpr
orExpr     := andExpr ('OR' andExpr)*
andExpr    := notExpr ('AND' notExpr)*
notExpr    := 'NOT' term | term
term       := field ':' value | '"' phrase '"' | word
```

**Alternatives Considered**:
- Lucene.NET → Rejected (over-engineered for simple Boolean search, 5MB dependency)
- Regex-based parsing → Rejected (complex, error-prone with nested expressions)
- Full-text search extension → Rejected (SQLite FTS requires schema changes to existing tables)

**Security Considerations**:
- Sanitize field names against whitelist (prevent internal field access)
- Limit query complexity (max 20 terms, max 3 nesting levels)
- Validate input length (max 500 characters per spec)

---

### 3. Database Schema for Saved Searches

**Decision**: Single `SavedSearches` table with JSON filter criteria column  
**Rationale**:
- Filter structure is flexible and evolves over time
- EF Core supports JSON column serialization/deserialization
- SQLite JSON functions enable querying if needed in future
- Simpler schema than normalized filter criteria tables

**Schema**:
```sql
CREATE TABLE SavedSearches (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId TEXT NOT NULL,              -- From MSAL claims
    Name TEXT NOT NULL,                 -- User-defined name (max 50 chars)
    FilterCriteria TEXT NOT NULL,       -- JSON object
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NOT NULL,
    UNIQUE(UserId, Name)                -- Prevent duplicate names per user
);
CREATE INDEX IX_SavedSearches_UserId ON SavedSearches(UserId);
```

**FilterCriteria JSON Structure**:
```json
{
  "categories": ["Technical", "Operations"],
  "statuses": ["Pending", "Approved"],
  "classifications": ["Confidential"],
  "requestorEmails": ["user@example.com"],
  "textQuery": "annual review",
  "dateRangeStart": "2026-03-01",
  "dateRangeEnd": "2026-03-31",
  "fieldFilters": {
    "title": "budget",
    "ref": "01234"
  }
}
```

**Alternatives Considered**:
- Separate tables for filter types → Rejected (complex joins, over-normalized)
- Store as query string → Rejected (hard to parse, validate, display)
- Store compiled LINQ expressions → Rejected (not serializable)

**Migration Strategy**:
- Add table via EF Core migration
- No data migration needed (new feature)
- Backwards compatible (existing searches not affected)

---

### 4. Search History Storage Strategy

**Decision**: Client-side localStorage with JSON serialization  
**Rationale**:
- No backend storage needed (reduces complexity)
- Instant access (no API call)
- Persists across sessions
- Privacy-friendly (user-specific, not synced)

**Storage Format**:
```javascript
// Key: 'searchHistory_' + userId
{
  "searches": [
    {
      "id": "uuid-v4",
      "filters": { /* FilterCriteriaDTO */ },
      "timestamp": "2026-03-03T14:30:00Z",
      "resultCount": 42
    }
    // ... max 10 most recent
  ]
}
```

**Implementation**:
```javascript
const MAX_HISTORY = 10;

function addToSearchHistory(filters, resultCount) {
  const history = getSearchHistory();
  const entry = {
    id: crypto.randomUUID(),
    filters: filters,
    timestamp: new Date().toISOString(),
    resultCount: resultCount
  };
  
  history.searches.unshift(entry);
  if (history.searches.length > MAX_HISTORY) {
    history.searches = history.searches.slice(0, MAX_HISTORY);
  }
  
  localStorage.setItem(`searchHistory_${userId}`, JSON.stringify(history));
}
```

**Alternatives Considered**:
- Backend table → Rejected (unnecessary complexity for ephemeral data)
- Session storage → Rejected (doesn't persist across sessions)
- IndexedDB → Rejected (over-engineered for small dataset)

**Best Practices**:
- Handle localStorage quota exceeded errors gracefully
- Validate JSON structure on read (corrupted data handling)
- Clear history on auth state changes (user logout)
- Don't store sensitive search terms in localStorage (privacy concern if shared device)

---

### 5. Export to CSV/PDF Libraries

**Decision**: 
- **CSV**: Manual string building (no library needed)
- **PDF**: jsPDF 4.2.0 (already in dependencies)

**CSV Export Rationale**:
- CSV is simple text format (~50 LOC implementation)
- No external dependency needed
- Browser `Blob` + `URL.createObjectURL()` for download
- Proper escaping for quotes and commas

**CSV Implementation**:
```javascript
function exportToCSV(data, filename) {
  const headers = ['Reference', 'Title', 'Date', 'Category', 'Status', 'Requestor'];
  const rows = data.map(item => [
    escapeCsv(item.referenceNumber),
    escapeCsv(item.title),
    formatDate(item.meetingDate),
    escapeCsv(item.category),
    escapeCsv(item.status),
    escapeCsv(item.requestorName)
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

**PDF Export Rationale**:
- jsPDF already in package.json
- autoTable plugin for table formatting
- Client-side generation (no backend processing)

**Alternatives Considered**:
- Papa Parse (CSV library) → Rejected (unnecessary dependency for simple format)
- Backend PDF generation (C# library) → Rejected (increases server load, complicates architecture)
- HTML-to-PDF services → Rejected (external service dependency, cost)

**Performance Considerations**:
- Limit export to 1,000 records (per spec)
- Show loading indicator during export (>100 records takes ~1-2s)
- Use Web Workers for large exports (future enhancement)

---

### 6. Date Range Preset Calculations

**Decision**: Pure JavaScript functions using native `Date` API  
**Rationale**:
- No external date library needed (moment.js, date-fns)
- Native Date API sufficient for preset calculations
- Reduces bundle size

**Preset Implementation Examples**:
```javascript
const DatePresets = {
  TODAY: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },
  
  THIS_WEEK: () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  },
  
  LAST_30_DAYS: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  
  // ... other presets
};
```

**Alternatives Considered**:
- date-fns → Rejected (122KB for simple date calculations)
- moment.js → Rejected (deprecated, 289KB, mutable API)
- Day.js → Considered acceptable if complexity grows

**Timezone Handling**:
- Use user's local timezone for all date calculations
- Store dates in ISO 8601 format in database (UTC)
- Backend converts to date-only comparison (ignores time)

---

### 7. SQLite Query Performance Optimization

**Decision**: Add composite indexes for common filter combinations  
**Rationale**:
- SQLite uses only one index per query (no index intersection)
- Composite indexes cover multiple WHERE clauses in single scan
- Query planner prefers indexes with higher selectivity

**Recommended Indexes**:
```sql
-- Existing indexes
CREATE INDEX IX_MeetingRequests_ReferenceNumber ON MeetingRequests(ReferenceNumber);
CREATE INDEX IX_MeetingRequests_RequestorEmail ON MeetingRequests(RequestorEmail);

-- New indexes for advanced search
CREATE INDEX IX_MeetingRequests_Category_Status_Date 
    ON MeetingRequests(Category, Status, MeetingDate);

CREATE INDEX IX_MeetingRequests_Status_Date 
    ON MeetingRequests(Status, MeetingDate);

CREATE INDEX IX_MeetingRequests_RequestorEmail_Date_Status 
    ON MeetingRequests(RequestorEmail, MeetingDate, Status);

CREATE INDEX IX_MeetingRequests_Classification 
    ON MeetingRequests(Classification);
```

**Index Selection Strategy**:
- Analyze slow query log in production
- Use `EXPLAIN QUERY PLAN` to verify index usage
- Monitor index size vs. performance gain
- Drop unused indexes after analysis

**Query Optimization Techniques**:
- Avoid `LIKE '%term%'` (full table scan, use `LIKE 'term%'` when possible)
- Use `COUNT(*)` with filters instead of loading all records
- Paginate with `SKIP/TAKE` (OFFSET/LIMIT in SQL)
- Cache filter option lists (categories, statuses) to reduce repeated queries

**Alternatives Considered**:
- Full-text search (FTS5 extension) → Rejected (requires rebuilding existing tables, adds complexity)
- Database views for common queries → Rejected (SQLite views don't improve performance)
- Query caching → Deferred (implement if performance issues observed)

**Benchmarking Plan**:
- Test with 10,000 meeting records
- Measure query time for P50, P95, P99 percentiles
- Target: <100ms for P95 (comfortably under 500ms spec requirement)

---

### 8. Fluent UI Component Selection

**Decision**: Use existing Fluent UI v9 components with custom wrappers  
**Rationale**:
- Already in dependencies (@fluentui/react-components 9.72.11)
- Consistent with existing UI (AnnouncementsPage, MeetingRequestsList)
- Accessibility built-in (WCAG 2.1 AA compliant)

**Component Mapping**:
| Feature | Fluent UI Component | Customization |
|---------|-------------------|---------------|
| Advanced Search Panel | `Drawer` (desktop), `Dialog` (mobile) | Full-screen on mobile |
| Filter Groups | `Accordion` | Expandable sections |
| Multi-select Filters | `Combobox` with multi-select | Custom chip display |
| Date Picker | `DatePicker` | Range selection wrapper |
| Quick Filters | `Button` with `ToggleButton` | Icon + label layout |
| Active Filter Chips | `Tag` with dismiss | Click to remove |
| Saved Searches Dropdown | `Menu` | Nested actions (edit/delete) |
| Export Menu | `Menu` with `MenuButton` | CSV/PDF options |

**Custom Components Needed**:
- `DateRangeSelector`: Wrapper around two `DatePicker` instances
- `SearchQueryBuilder`: Text input with syntax hints tooltip
- `FilterChip`: Specialized `Tag` with filter type icon

**Accessibility Considerations**:
- All interactive elements keyboard accessible (Tab, Enter, Escape)
- Screen reader announcements for filter changes (aria-live regions)
- Focus management when opening/closing drawer
- High contrast mode support (built into Fluent UI)

**Alternatives Considered**:
- Material-UI → Rejected (different design language, would break consistency)
- Custom components from scratch → Rejected (reinventing wheel, accessibility risk)

---

### 9. State Management Strategy

**Decision**: React Context + Custom Hooks (no Redux/MobX)  
**Rationale**:
- Existing app doesn't use global state library
- Search state is localized to search feature
- React Context sufficient for passing filter state to child components
- Custom hooks (`useAdvancedSearch`, `useSavedSearches`) encapsulate logic

**State Structure**:
```javascript
const SearchContext = {
  filters: {
    categories: [],
    statuses: [],
    classifications: [],
    requestorEmails: [],
    textQuery: '',
    dateRangeStart: null,
    dateRangeEnd: null,
    fieldFilters: {}
  },
  results: {
    items: [],
    totalCount: 0,
    page: 1,
    loading: false,
    error: null
  },
  savedSearches: [],
  searchHistory: [],
  actions: {
    setFilter,
    clearFilters,
    applyFilters,
    saveSearch,
    loadSavedSearch,
    exportResults
  }
};
```

**Custom Hooks**:
- `useAdvancedSearch()`: Main hook managing filter state and API calls
- `useSavedSearches()`: CRUD operations for saved searches
- `useSearchHistory()`: localStorage management
- `useDebounce(value, delay)`: Debounce filter changes

**Alternatives Considered**:
- Redux Toolkit → Rejected (over-engineered for feature-specific state)
- Zustand → Rejected (new dependency for localized state)
- Jotai/Recoil → Rejected (atomic state not needed)

---

### 10. Testing Strategy

**Decision**: Test-first approach with unit, contract, integration, and E2E tests  
**Rationale**: Constitution requirement (Test-First is NON-NEGOTIABLE)

**Test Layers**:

**1. Unit Tests (Frontend)**
- Technology: Vitest or Jest (if available)
- Coverage: Utility functions (search parser, date calculations, export formatters)
- Example: `searchParser.test.js` - parse Boolean queries, handle edge cases

**2. Unit Tests (Backend)**
- Technology: xUnit
- Coverage: Service classes (SearchFilterService, SavedSearchService queries)
- Example: `SearchFilterServiceTests.cs` - filter combination logic

**3. Contract Tests (API)**
- Technology: xUnit with `Microsoft.AspNetCore.Mvc.Testing`
- Coverage: API endpoints with various filter parameter combinations
- Example: `GET /api/meetingrequests?categories[]=Technical&statuses[]=Pending&startDate=2026-03-01`
- Validates: Response schema, HTTP status codes, error messages

**4. Integration Tests (Backend)**
- Technology: xUnit with in-memory SQLite database
- Coverage: Saved search CRUD, complex filter queries, database migrations
- Example: Create saved search → retrieve → update → delete → verify

**5. E2E Tests (Full Stack)**
- Technology: Playwright 1.40.0
- Coverage: User flows from spec acceptance scenarios
- Example:
  ```javascript
  test('Multi-criteria search - User Story 1', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="advanced-search-button"]');
    await page.selectOption('[data-testid="category-filter"]', 'Operations');
    await page.selectOption('[data-testid="status-filter"]', 'Pending');
    await page.click('[data-testid="date-preset-next-7-days"]');
    await page.click('[data-testid="apply-filters"]');
    
    await expect(page.locator('[data-testid="result-count"]')).toContainText(/Showing \d+ of \d+ results/);
    // Verify only matching results displayed
  });
  ```

**Test Coverage Goals**:
- Unit tests: >80% code coverage
- Contract tests: 100% of API endpoints
- Integration tests: All database operations
- E2E tests: All P1 user stories (100%), P2 stories (50%), P3 stories (optional)

**Test Data Strategy**:
- Use factory patterns for test data generation
- Seed database with representative datasets (small: 10 records, medium: 100, large: 1000)
- Test with realistic filter combinations from production usage

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Query Building** | EF Core dynamic LINQ | Type-safe, SQL injection proof, composable |
| **Boolean Search** | Recursive descent parser | Simple grammar, full control, no dependencies |
| **Saved Searches Schema** | Single table with JSON | Flexible, simple schema, EF Core support |
| **Search History** | LocalStorage (client-side) | No backend needed, instant access, privacy-friendly |
| **Export** | Manual CSV + jsPDF | Minimal dependencies, client-side generation |
| **Date Presets** | Native Date API | No library needed, sufficient for requirements |
| **Database Indexes** | Composite indexes | Optimizes common filter combinations |
| **UI Components** | Fluent UI v9 | Consistent, accessible, already in use |
| **State Management** | React Context + Hooks | Sufficient for localized state, no global library |
| **Testing** | xUnit + Playwright | Test-first, multi-layered coverage |

---

## Next Phase

**Phase 1 Deliverables** (ready to generate):
- `data-model.md`: Entity definitions for SavedSearch, SearchHistory, FilterCriteria DTO
- `contracts/`: API endpoint specifications with request/response schemas
- `quickstart.md`: Step-by-step implementation guide for developers

All research findings above inform Phase 1 design decisions. No unresolved clarifications remain.
