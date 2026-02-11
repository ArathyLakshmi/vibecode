# Data Model: Modern Responsive Listview with Drawer

**Feature**: 005-listview-drawer  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This feature is a **UI layout change only** with **no data model changes**. The meeting requests data structure, API endpoints, and data fetching logic remain unchanged - only the visual presentation changes from table to card grid with drawer.

## Entities

No new entities. No changes to existing entities.

## Runtime State

### Existing State (Preserved)

The only runtime state in MeetingRequestsList remains the same:

**Existing State**:
| Field | Type | Description | Initial Value |
|-------|------|-------------|---------------|
| items | Array<MeetingRequest> | List of meeting requests from API | [] |
| loading | boolean | Whether data is being fetched | true |
| error | string | null | Error message if fetch fails | null |
| count | number | null | Total count from API (if provided) | null |

**Source**: MeetingRequestsList.jsx internal useState hooks  
**Scope**: Component-local state  
**Lifecycle**: Created on mount, destroyed on unmount  
**Change**: None - state management unchanged

### New State Required

**Drawer State** (new):
| Field | Type | Description | Initial Value |
|-------|------|-------------|---------------|
| selectedItem | number | string | null | ID of meeting request to show in drawer, null when closed | null |

**Source**: MeetingRequestsList.jsx internal useState hook  
**Scope**: Component-local state  
**Purpose**: Track which item's details are displayed in drawer  
**Behavior**: 
- `null` = drawer closed
- `item.id` = drawer open showing that item
- Clicking card sets to item.id
- Clicking close button/backdrop/Escape sets to null

## Data Flow

### Current Flow (Unchanged)

```
MeetingRequestsList component
    ↓ (mount)
useEffect → fetch('/api/meetingrequests')
    ↓ (response)
setItems(data) → items state updated
    ↓ (render)
Table renders items
```

### New Flow (After Implementation)

```
MeetingRequestsList component
    ↓ (mount)
useEffect → fetch('/api/meetingrequests')
    ↓ (response)
setItems(data) → items state updated
    ↓ (render)
Card grid renders items
    ↓ (user clicks card)
setSelectedItem(item.id) → selectedItem state updated
    ↓ (render)
Drawer opens with item details (finds item from items array by id)
    ↓ (user closes drawer)
setSelectedItem(null) → selectedItem state updated
    ↓ (render)
Drawer closes
```

**Key Difference**: Additional `selectedItem` state for drawer visibility and content. Data fetching and items state unchanged.

## Component Interfaces

### MeetingRequestsList Component

**Current Props**:
```javascript
{
  searchTerm: string = '',
  isSearching: boolean = false
}
```

**After Change**:
```javascript
{
  searchTerm: string = '',
  isSearching: boolean = false
}
```

**Change**: None - props unchanged, internal implementation changes from table to cards

### Drawer Component (New)

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  children: ReactNode
}
```

**Description**: Reusable drawer component that slides in from right

### MeetingRequestCard Component (Optional, New)

**Props**:
```javascript
{
  item: MeetingRequest,
  onClick: () => void
}
```

**Description**: Optional extraction of card rendering into separate component (can be inline in MeetingRequestsList instead)

## No Backend Data Model Changes

This feature **does not require**:
- Database schema changes
- API endpoint modifications
- Backend service changes
- Data migration scripts
- New database tables or columns

**Rationale**: This is a pure frontend UI change. All data comes from existing `/api/meetingrequests` endpoint with existing response structure.

## Meeting Request Data Structure

The meeting request data structure is **unchanged**:

```javascript
{
  id: number | string,
  referenceNumber: string,
  requestorName: string,
  requestType: string,
  country: string,
  title: string,
  meetingDate: string (ISO date)
}
```

**Storage**: None (fetched from API on component mount)  
**Persistence**: Server-side only (not modified by this feature)  
**Mutability**: Immutable from frontend perspective (view-only)  
**Change**: None - same fields displayed, just in card layout instead of table

## State Management Pattern

**Pattern**: Local component state (useState hooks)  
**Justification**: 
- Drawer state is UI-only (not shared across components)
- Items state already managed locally in MeetingRequestsList
- No need for global state management (no Redux, Context API)
- Keeps component self-contained and testable

**Alternative Considered**: Context API for selectedItem  
**Rejected**: Over-engineering for single-component state. No other components need drawer state.

## Search Filtering

**Current Implementation** (preserved):
```javascript
function matchesSearch(item, searchTerm) {
  // Case-insensitive partial matching across all fields
  const query = searchTerm.toLowerCase().trim()
  const searchableFields = [
    item.referenceNumber,
    item.requestorName,
    item.requestType,
    item.country,
    item.title,
    formatDate(item.meetingDate)
  ]
  return searchableFields.some(field => 
    String(field || '').toLowerCase().includes(query)
  )
}

const filteredItems = items.filter(item => matchesSearch(item, searchTerm))
```

**Change**: None - same filtering logic, just renders cards instead of table rows

## Migration & Compatibility

**No data migration needed**:
- No schema changes
- No data format changes
- No state structure changes (adds `selectedItem`, doesn't modify existing)
- No API contract changes
- No localStorage/sessionStorage changes
- No cookie changes

**Backward Compatibility**: 100%  
- No breaking changes to data structures
- No changes to data flow
- No changes to API responses expected

## Testing Data Requirements

### E2E Test Data

**No new test data required**:
- Use existing meeting request fixtures
- Same test scenarios (loading, empty list, filtered list, error states)
- Add test for drawer interaction (click card → drawer opens → close → drawer closes)

### Test Scenarios

| Scenario | Initial State | Expected Final State | Data Involved |
|----------|---------------|---------------------|---------------|
| View cards | Authenticated, items loaded | Card grid displays 3 cols (desktop) | Existing items array |
| Open drawer | Card grid visible | Drawer slides in with selected item details | selectedItem = item.id |
| Close drawer | Drawer open | Drawer slides out | selectedItem = null |
| Filter cards | Search term entered | Filtered cards display | filteredItems (existing logic) |
| Mobile responsive | Mobile viewport | Single column cards | Same items, different layout |

**No test database seeding required** - this is pure UI / layout testing

## Open Questions

None. All data model aspects are clear (no data changes required).

## Summary

This feature involves **zero data model changes**. It is a pure UI layout transformation:
- No new data entities
- One new UI state field (`selectedItem` for drawer)
- No API changes
- No backend changes
- No database changes
- No migration required

All existing data flows, API contracts, and state management patterns remain unchanged. The only difference is how meeting request data is visually presented (cards + drawer instead of table).
