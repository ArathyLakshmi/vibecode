# Data Model: Navigation Below Header

**Feature**: 004-nav-below-header  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This feature is a **UI layout change only** with **no data model changes**. The navigation structure, links, and behavior remain unchanged - only the visual positioning changes from being inside the Header component to a separate row below it.

## Entities

No new entities. No changes to existing entities.

## Runtime State

### Existing State (Preserved)

The only runtime state related to navigation is within the TopNav component:

**TopNav Mobile Menu State**:
| Field | Type | Description | Initial Value |
|-------|------|-------------|---------------|
| open | boolean | Whether mobile hamburger menu is expanded | false |

**Source**: TopNav.jsx internal useState hook  
**Scope**: Component-local state  
**Lifecycle**: Created on mount, destroyed on unmount  
**Change**: None - state management unchanged

### No New State Required

This layout change does not require:
- New component state
- New context providers
- New global state
- New props passed between components

## Data Flow

### Current Flow (Unchanged)

```
AppShell (provides layout structure)
    ↓
Header (renders branding + navigation)
    ↓
TopNav (manages navigation links + mobile menu state)
    ↓
React Router (handles link clicks → navigation)
```

### New Flow (After Implementation)

```
AppShell (provides layout structure)
    ├─→ Header (renders branding only)
    └─→ TopNav (manages navigation links + mobile menu state)
             ↓
        React Router (handles link clicks → navigation)
```

**Key Difference**: TopNav is now a sibling of Header instead of a child. Data flow within TopNav is unchanged.

## Component Interfaces

### AppShell Component

**Current Props**:
```javascript
{
  children: ReactNode,
  onSearchChange: (term: string) => void
}
```

**After Change**:
```javascript
{
  children: ReactNode,
  onSearchChange: (term: string) => void
}
```

**Change**: None - props unchanged

### Header Component

**Current Props**:
```javascript
{
  onSearchChange: (term: string) => void
}
```

**After Change**:
```javascript
{
  onSearchChange: (term: string) => void
}
```

**Change**: None - props unchanged (TopNav removal is internal to Header's JSX)

### TopNav Component

**Current Props**:
```javascript
{} // No props
```

**After Change**:
```javascript
{} // No props
```

**Change**: None - TopNav is self-contained

## No Backend Data Model Changes

This feature **does not require**:
- Database schema changes
- API endpoint modifications
- Backend service changes
- Data migration scripts
- New database tables or columns

**Rationale**: Navigation is entirely frontend UI. Links are hardcoded in TopNav.jsx. No dynamic navigation data from backend.

## Navigation Data Structure

The navigation links are **statically defined** in TopNav.jsx:

```javascript
const links = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Meetings', href: '/meetings' },
  { label: 'Settings', href: '/settings' },
]
```

**Storage**: None (in-memory array constant)  
**Persistence**: None (hardcoded in source)  
**Mutability**: Immutable (const variable)  
**Change**: None - links array unchanged

## Authentication State

**Navigation visibility** depends on authentication state from MSAL:

**Current Behavior** (preserved):
- TopNav checks authentication status internally
- If authenticated: shows navigation links
- If not authenticated: hides navigation

**Implementation**: Conditional rendering based on `useIsAuthenticated()` hook

**Change**: None - same auth check, same conditional rendering

## Migration & Compatibility

**No data migration needed**:
- No schema changes
- No data format changes
- No state structure changes
- No API contract changes
- No localStorage changes
- No cookie changes

**Backward Compatibility**: 100%  
- No breaking changes to data structures
- No changes to data flow
- No changes to state management

## Testing Data Requirements

### E2E Test Data

**No new test data required**:
- Use existing test user account (already configured)
- Use existing navigation links (Home, Dashboard, Meetings, Settings)
- Use existing auth test setup

### Test Scenarios

| Scenario | Initial State | Expected Final State | Data Involved |
|----------|---------------|---------------------|---------------|
| Desktop navigation | Authenticated | Nav links visible in dedicated row below header | None (UI only) |
| Mobile navigation | Authenticated | Hamburger menu functional, dropdown appears below both rows | None (UI only) |
| Unauthenticated | Not logged in | No navigation visible | None (UI only) |
| Link click | Authenticated on Home | Navigate to Dashboard | URL change only |

**No test database seeding required** - this is pure UI / layout testing.

## Open Questions

None. All data model aspects are clear (no data changes required).

## Summary

This feature involves **zero data model changes**. It is a pure UI layout reorganization:
- No new data entities
- No state changes
- No API changes
- No backend changes
- No database changes
- No migration required

All existing data flows, props, and state management remain unchanged. The only difference is the position of the TopNav component in the React component tree.
