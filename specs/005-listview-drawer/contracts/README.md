# API Contracts: Modern Responsive Listview with Drawer

**Feature**: 005-listview-drawer  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This feature is a **UI-only change** with **no API contract modifications**. All existing API endpoints, request/response structures, and component interfaces remain unchanged.

## API Endpoints

### No Changes Required

**Existing Endpoint** (unchanged):
```
GET /api/meetingrequests
```

**Request**: None (GET with no parameters)

**Response** (unchanged):
```json
[
  {
    "id": 1,
    "referenceNumber": "REF-2026-001",
    "requestorName": "John Doe",
    "requestType": "Board Meeting",
    "country": "USA",
    "title": "Q1 Strategy Review",
    "meetingDate": "2026-03-15T00:00:00Z"
  },
  ...
]
```

**Alternative Response Format** (also unchanged):
```json
{
  "value": [...items...],
  "Count": 42
}
```

**Usage**: MeetingRequestsList continues to use same endpoint, same response parsing

## No New Endpoints

This feature does **not** require:
- New endpoints for drawer data (uses existing data from list)
- New endpoints for card layout data (same data, different presentation)
- Update/delete endpoints (view-only feature)
- Pagination endpoints (current implementation loads all items)

## Component Contracts

### MeetingRequestsList Component

**Current Contract** (unchanged):
```javascript
interface MeetingRequestsListProps {
  searchTerm?: string;
  isSearching?: boolean;
}
```

**Internal Implementation**: Changes from table to cards (internal detail, not part of contract)

**Exported Behavior**: 
- Renders meeting requests list (table → cards, internal change)
- Accepts search term and searching state (unchanged)
- Handles loading, error, empty states (unchanged)

**Contract Impact**: ✅ Zero breaking changes

### Drawer Component (New, Internal)

**Contract**:
```javascript
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
```

**Scope**: Internal component (not exported from MeetingRequestsList file)  
**Impact**: No external contract changes

## Response Parsing

**Current Parsing Logic** (unchanged):
```javascript
const res = await fetch('/api/meetingrequests')
const data = await res.json()

// Handle both array response and object with 'value' key
const list = Array.isArray(data) ? data : (data.value || data)
const count = (typeof data === 'object' && data !== null && 
               ('Count' in data || 'count' in data)) 
               ? (data.Count ?? data.count) 
               : (Array.isArray(list) ? list.length : 0)
```

**Change**: None - same robust parsing handles both response formats

## Search Contract

**Current Contract** (unchanged):
```javascript
function matchesSearch(item: MeetingRequest, searchTerm: string): boolean
```

**Behavior**: Case-insensitive partial matching across all searchable fields  
**Fields Searched**: referenceNumber, requestorName, requestType, country, title, meetingDate  
**Change**: None - same filtering logic, applied to cards instead of table rows

## Error Handling

**Current Contract** (unchanged):
```javascript
// Loading state
if (loading) return <div className="p-4">Loading meeting requests…</div>

// Error state
if (error) return <div className="p-4 text-red-600">Error: {error}</div>

// Empty state
if (!items || items.length === 0) {
  return <div className="p-4">No meeting requests found.</div>
}

// No search results
if (filteredItems.length === 0) {
  return (
    <div className="p-4">
      <div className="text-center py-8 text-gray-500">
        No results found for {searchTerm}"
      </div>
    </div>
  )
}
```

**Change**: Same messages and error handling, different visual presentation (cards instead of table)

## Props Interface Compatibility

### App.jsx → MeetingRequestsList

**Current Usage** (unchanged):
```jsx
<MeetingRequestsList searchTerm={searchTerm} isSearching={isSearching} />
```

**Contract**: Unchanged  
**Impact**: App.jsx requires zero modifications

### Backward Compatibility

✅ **100% backward compatible**:
- Props interface unchanged
- Response parsing unchanged
- Error handling unchanged
- Search filtering unchanged
- Component behavior unchanged (renders meeting requests list)

## Breaking Changes

**None**. This is a non-breaking change:
- API contracts unchanged
- Component props unchanged
- Data structures unchanged
- Event handlers unchanged
- Parent components unchanged

## Deployment Safety

**Can deploy independently**: Yes  
**Requires backend deployment**: No  
**Requires database migration**: No  
**Can rollback independently**: Yes  

**Rollback process**: Revert MeetingRequestsList.jsx and delete Drawer.jsx (< 5 minutes)

## Contract Validation

### Pre-Implementation Checklist

- [X] No REST API contract changes
- [X] No GraphQL schema changes
- [X] No WebSocket message format changes
- [X] No component props interface changes
- [X] No event handler signature changes
- [X] No data structure changes in responses
- [X] No authentication/authorization changes
- [X] No database schema changes
- [X] No environment variable changes
- [X] No configuration file changes
- [X] No CLI argument changes

**Validation Result**: ✅ All checkpoints pass - zero contract changes required

## Testing Strategy

### Contract Testing

**Existing tests** should continue passing without modification (if they test component contract):
- MeetingRequestsList accepts searchTerm and isSearching props ✅
- Renders loading state ✅
- Renders error state ✅
- Renders empty state ✅
- Filters items by search term ✅

**Test updates needed**: 
- Selector updates in E2E tests (from `[data-testid="meeting-request-item"]` to `[data-testid="meeting-request-card"]`)
- Add drawer interaction tests (click card → drawer opens → close → drawer closes)

**Contract preserved**: All existing behavior preserved, just visual presentation changes

## Migration Notes

### For Developers

**What's changing**: Visual presentation (table → cards + drawer)  
**What's not changing**: Data fetching, props, API usage, filtering logic  
**Action required**: Update E2E test selectors  
**Testing focus**: Visual regression testing (responsive layouts, drawer behavior)

### For API Consumers

**Impact**: None - MeetingRequestsList is internal component, not an API  
**Action required**: None

## Summary

This feature has **zero API contract changes**:
- No new endpoints required
- No modifications to existing endpoints
- No changes to request/response structures
- No changes to component props interfaces
- 100% backward compatible
- Can deploy/rollback independently

The only changes are internal to MeetingRequestsList component (table → cards + drawer), which is an implementation detail not exposed to external consumers.
