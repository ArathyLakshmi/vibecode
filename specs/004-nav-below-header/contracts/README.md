# Contracts: Navigation Below Header

**Feature**: 004-nav-below-header  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This feature is a **UI layout change only** with **no API or component contract changes**. The navigation functionality, links, and behavior remain unchanged - only the visual positioning changes.

## API Contract Changes

**None required.**

This feature is entirely a **frontend UI restructuring**:
- Changes how components are composed in the React tree
- Does not add, remove, or modify any backend API endpoints
- Does not change request/response formats
- Does not affect frontend-backend communication
- No network layer changes

## Component Contract Changes

### AppShell Component

**Current Contract**:
```jsx
<AppShell onSearchChange={(term) => void}>
  {children}
</AppShell>
```

**New Contract**:
```jsx
<AppShell onSearchChange={(term) => void}>
  {children}
</AppShell>
```

**Breaking Change**: No  
**Rationale**: Props interface unchanged. Internal implementation change only (renders TopNav asa sibling of Header instead of TopNav being rendered inside Header).

### Header Component

**Current Contract**:
```jsx
<Header onSearchChange={(term) => void} />
// Internally renders: Logo, SearchBar, TopNav, UserAccount
```

**New Contract**:
```jsx
<Header onSearchChange={(term) => void} />
// Internally renders: Logo, SearchBar, UserAccount (TopNav removed)
```

**Breaking Change**: No  
**Rationale**: Props interface unchanged. Consumers of Header don't know or care about TopNav (it's an internal implementation detail). External callers see no difference.

### TopNav Component

**Current Contract**:
```jsx
<TopNav />
// Self-contained navigation with no props
```

**New Contract**:
```jsx
<TopNav />
// Self-contained navigation with no props
```

**Breaking Change**: No  
**Rationale**: Component interface unchanged. Can be rendered anywhere in the tree with same behavior.

## Visual Contract Changes

### Layout Structure

**Current Visual Contract**:
- Single header row containing logo, search, navigation, account

**New Visual Contract**:
- Header row: logo, search, account
- Navigation row: navigation links
- Both rows span full container width
- Navigation row has different background color (gray-100 vs white)
- No gap between rows

**Breaking Change**: No  
**Rationale**: User-facing improvement. Same navigation functionality, better visual hierarchy. No functional breaking changes.

## User-Facing Contract

### Navigation Links

**Current**:
- Home → `/`
- Dashboard → `/dashboard`
- Meetings → `/meetings`
- Settings → `/settings`

**After Change**:
- Home → `/` (unchanged)
- Dashboard → `/dashboard` (unchanged)
- Meetings → `/meetings` (unchanged)
- Settings → `/settings` (unchanged)

**Breaking Change**: No  
**Rationale**: All navigation links, URLs, and behavior preserved exactly.

### Mobile Experience

**Current**:
- Hamburger menu button in header area
- Mobile dropdown menu appears on click

**After Change**:
- Hamburger menu button still in header area
- Mobile dropdown menu appears below both header and nav rows

**Breaking Change**: No  
**Rationale**: Same hamburger menu functionality, slightly different dropdown positioning (enhancement, not breaking change).

## Accessibility Contract

### Semantic HTML

**Current**:
```html
<header role="banner">
  <nav aria-label="Primary">
    <!-- navigation links -->
  </nav>
</header>
```

**After Change**:
```html
<header role="banner">
  <!-- logo, search, account -->
</header>
<nav aria-label="Primary">
  <!-- navigation links -->
</nav>
```

**Breaking Change**: No  
**Rationale**: Still uses semantic `<nav>` element with `aria-label="Primary"`. Screen readers will announce navigation the same way. ARIA roles preserved.

### Keyboard Navigation

**Current Tab Order**:
Logo → Search → NavLinks → Account → Main Content

**New Tab Order**:
Logo → Search → Account → NavLinks → Main Content

**Breaking Change**: No  
**Rationale**: Tab order changes slightly (account before nav instead of after), but accessibility is maintained. All interactive elements remain keyboard accessible. Focus indicators preserved.

## Styling Contract

### Tailwind CSS Classes

**No new Tailwind classes introduced.**  
**No custom CSS required.**  
**All existing utility classes preserved.**

This ensures:
- No stylesheet changes
- No build process changes
- No CSS bundle size increase
- No style conflicts

## Testing Contract

### E2E Test Selectors

**Potential Impact**: Tests that use specific DOM selectors may need updates.

**Example Current Selector**:
```javascript
page.locator('header nav[aria-label="Primary"]') // TopNav inside header
```

**Example New Selector**:
```javascript
page.locator('nav[aria-label="Primary"]') // TopNav as top-level element
```

**Mitigation**: Use semantic selectors (`nav[aria-label="Primary"]`) instead of structural selectors to minimize test changes.

**Breaking Change**: Potentially for tests, not for users  
**Rationale**: DOM structure changes, but functionality and accessibility unchanged. Tests should adapt to new structure.

## Backward Compatibility

### Deployment

**Can old and new versions coexist?** Yes  
- Client-side only change
- Backend agnostic to layout structure
- No API version changes
- No database migrations
- Users on old version: navigation in header
- Users on new version: navigation below header
- No coordination required

### Rollback

**Can roll back without data migration?** Yes  
- No persistent state changes
- Simply revert code to previous layout
- Users may be mid-session during rollback, but will see consistent layout after page refresh
- Next page load uses rollback layout

## Performance Contract

### Loading Performance

**Page Load Time**: No change expected  
- Same components rendered
- Same JavaScript bundle size
- Same network requests
- Same rendering cost

**Layout Shift**: Minimal  
- Header and navigation render in order (header first, then nav)
- Same total vertical height
- No cumulative layout shift increase expected

## Summary

**Total API Contract Changes**: 0  
**Total Component Interface Changes**: 0  
**Total Breaking Changes**: 0  
**Internal Implementation Changes**: 2 (AppShell.jsx, Header.jsx)

This feature maintains full backward compatibility while improving UX. No external contracts (APIs, component props, user-facing functionality) are modified. Only internal component composition changes.

## Validation

- ✅ No REST API endpoints added/removed/modified
- ✅ No GraphQL schema changes
- ✅ No WebSocket message format changes
- ✅ No database schema changes
- ✅ No configuration file format changes
- ✅ No environment variable changes
- ✅ No CLI interface changes
- ✅ No prop interfaces changed
- ✅ Component behavior preserved
- ✅ Navigation functionality unchanged
- ✅ Accessibility maintained

**Conclusion**: This feature requires **contracts/ directory with this README only**. No API schemas (OpenAPI, GraphQL, protocol buffers, etc.) needed.
