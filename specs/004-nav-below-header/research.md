# Research: Navigation Below Header

**Feature**: 004-nav-below-header  
**Date**: February 11, 2026  
**Phase**: 0 (Pre-implementation Research)

## Overview

This document captures research findings for moving the primary navigation (TopNav component) from within the Header component to a dedicated row below the header in the AppShell layout.

## Decision: Move TopNav to AppShell as Header Sibling

### Rationale

1. **Simpler Component Structure**
   - TopNav becomes a direct child of AppShell, same level as Header
   - Clear separation of concerns: Header handles branding/search/account, TopNav handles navigation
   - Easier to style independently with different background colors
   - Reduces nesting depth in component tree

2. **Better Layout Control**
   - AppShell can control the full layout stack (Header → TopNav → main → Footer)
   - No need to coordinate spacing/styling between parent and child
   - Each row spans full container width naturally
   - Zero-gap layout achieved by placing components adjacent to each other

3. **Maintains Mobile Responsiveness**
   - TopNav already handles desktop (horizontal) vs mobile (hamburger) internally
   - Hamburger button stays in Header, but dropdown can still originate from TopNav
   - Mobile dropdown positioning adjusts via absolute positioning or z-index
   - No changes to TopNav's internal responsive logic needed

4. **Minimal Code Changes**
   - AppShell: Add `<TopNav />` as sibling after `<Header />`
   - Header: Remove `<TopNav />` from JSX
   - TopNav: No changes (just moves in DOM)
   - Total: ~5 lines changed

### Alternatives Considered

#### Option 1: Keep TopNav in Header, Use Flexbox Column (Rejected)
- **Why considered**: Minimal changes, TopNav stays as Header prop/child
- **Why rejected**: 
  - Harder to achieve visual separation (border/background within single component)
  - Complicates Header's responsibility (should focus on top row only)
  - Flexbox column layout doesn't naturally span full width for both rows
  - More complex styling coordination between parent and child

#### Option 2: Create New NavBar Component (Rejected)
- **Why considered**: New component specifically for the nav row
- **Why rejected**:
  - Unnecessary duplication - TopNav already exists and works
  - Would require migrating all navigation links and logic
  - Adds component to maintain with same functionality
  - Violates "minimal changes" principle

#### Option 3: Use CSS Grid for Header Layout (Rejected)
- **Why considered**: Could define 2-row grid within Header
- **Why rejected**:
  - Over-engineered for simple vertical stacking
  - Harder to understand and maintain
  - Still keeps TopNav as Header child (doesn't improve separation of concerns)
  - Grid overkill for two full-width rows

#### Option 4: Conditional Rendering in AppShell (Rejected)
- **Why considered**: Show TopNav separately only when authenticated
- **Why rejected**:
  - TopNav already handles auth-based visibility internally
  - Duplicates auth logic in multiple places
  - AppShell shouldn't own nav visibility decision
  - Keep auth logic in TopNav for single source of truth

## React Component Structure Pattern

### Current Structure

```jsx
<AppShell>
  <Header onSearchChange={onSearchChange}>
    {/* Logo, SearchBar, TopNav, UserAccount */}
    <TopNav /> {/* INSIDE Header */}
  </Header>
  <main>{children}</main>
  <Footer />
</AppShell>
```

### New Structure

```jsx
<AppShell>
  <Header onSearchChange={onSearchChange}>
    {/* Logo, SearchBar, UserAccount only */}
  </Header>
  <TopNav /> {/* SIBLING of Header */}
  <main>{children}</main>
  <Footer />
</AppShell>
```

### Implementation Pattern

**AppShell.jsx Changes**:
```jsx
// Import TopNav if not already imported
import TopNav from './TopNav'

return (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header onSearchChange={onSearchChange} />
    {/* NEW: Add TopNav here with distinct background */}
    <TopNav />
    <main className="flex-1 container mx-auto px-4 py-6" tabIndex={-1}>
      {children}
    </main>
    <Footer />
  </div>
)
```

**Header.jsx Changes**:
```jsx
// Remove TopNav import (no longer needed)
// Remove <TopNav /> from JSX

return (
  <header role="banner" className="bg-white shadow">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      {/* Logo */}
      {/* SearchBar */}
      {/* Remove: <TopNav /> */}
      {/* UserAccount display */}
    </div>
  </header>
)
```

**TopNav.jsx Changes**:
```jsx
// No changes to component logic
// Update container styling to match Full width nav row

export default function TopNav() {
  return (
    // Add wrapper with distinct background color
    <div className="bg-gray-100"> {/* or bg-gray-50, lighter than header */}
      <nav aria-label="Primary" className="container mx-auto px-4">
        {/* Existing desktop nav */}
        {/* Existing mobile hamburger */}
      </nav>
    </div>
  )
}
```

## Styling Approach

### Visual Distinction (From Clarifications)

**Requirement**: Different background color (lighter or darker shade than header)
**Current Header**: `bg-white shadow`
**Options for Nav Row**:
- Option A: `bg-gray-50` (lighter, very subtle)
- Option B: `bg-gray-100` (light gray, clear distinction) ← **RECOMMENDED**
- Option C: `bg-gray-200` (darker gray, high contrast)

**Recommendation**: Use `bg-gray-100` for nav row
- Clear visual distinction from white header
- Not too heavy (avoids dark appearance)
- Standard Tailwind color, no custom CSS needed
- Maintains light, clean aesthetic

### Zero-Gap Layout (From Clarifications)

**Requirement**: Rows touch with no gap between them

**Implementation**:
- Remove any margin-bottom from Header
- Remove any margin-top from TopNav wrapper
- Rows naturally stack with no gap in flex column layout
- Background color difference provides visual separation

### Mobile Dropdown Positioning (From Clarifications)

**Requirement**: Hamburger in header, dropdown appears below both rows

**Current Mobile Behavior**: Hamburger button in TopNav opens dropdown menu
**With New Layout**: Hamburger button is now in separate row from header

**Solution**: Adjust TopNav's mobile dropdown positioning
```jsx
// In TopNav.jsx mobile section
<div id="primary-mobile" className={`absolute right-4 mt-2 w-48 bg-white border shadow ${open ? 'block' : 'hidden'}`}>
  {/* This absolute positioning already works */}
  {/* mt-2 creates small gap below the hamburger button */}
  {/* Works regardless of TopNav being in Header or AppShell */}
</div>
```

**Why it works**: Absolute positioning is relative to nearest positioned ancestor or viewport. Dropdown will appear below the hamburger button naturally.

## Browser Compatibility

### Flexbox Support (Layout Method)

- Chrome 29+: Full support
- Firefox 28+: Full support  
- Safari 9+: Full support
- Edge (all versions): Full support

**Assessment**: No compatibility issues. Flexbox is universally supported in modern browsers.

### Tailwind CSS Classes

All classes used (`bg-gray-100`, `container`, `mx-auto`, `px-4`, `flex`, `flex-col`) are standard Tailwind utilities with excellent browser support. No custom CSS or experimental features required.

## Responsive Design

### Desktop (≥768px)

- Header: Logo, SearchBar, UserAccount in single row
- Nav: Horizontal links (Home, Dashboard, Meetings, Settings)
- Both rows span full container width
- NavNavigation centered or left-aligned (TopNav handles internally)

### Mobile (<768px)

- Header: Logo, Hamburger button (from TopNav), UserAccount
- Nav: Visually present but hamburger controls visibility
- Dropdown: Appears below both rows when opened
- Same full-width layout for consistency

### Tablet (≥768px, <1024px)

- Behaves like desktop (horizontal nav links)
- Tailwind's `md:` breakpoint at 768px handles transition
- No special handling needed

## Accessibility Considerations

### Existing Accessibility Features (Preserved)

- `role="banner"` on Header
- `aria-label="Primary"` on TopNav navigation
- `aria-controls`, `aria-expanded`, `aria-label` on mobile hamburger button
- Keyboard navigation already supported in TopNav
- Focus states maintained

### Tab Order with New Layout

**Previous**: Logo → SearchBar → [TopNav links] → UserAccount → Main content
**New**: Logo → SearchBar → UserAccount → [TopNav links] → Main content

**Impact**: Tab order changes slightly (UserAccount before nav instead of after). This is acceptable and may actually improve UX (reach account controls faster).

**Recommendation**: Test keyboard navigation after change to ensure logical flow. No aria-label updates needed.

## Performance Considerations

### Rendering Performance

- **No impact**: Same components, same rendering logic
- Component tree: Same number of nodes, just rearranged
- React reconciliation: Efficient move operation (same TopNav instance)

### Layout Performance

- **Improved**: Simpler layout (flex column stack vs nested flex)
- No additional reflows from this change
- Browser paint: Minimal (background color change only)

### Bundle Size

- **No impact**: No new dependencies, no new code
- Same components, just reorganized
- Tailwind purges unused classes automatically

## Testing Strategy

### Visual Regression Testing

**Manual Tests**:
1. Desktop: Verify two distinct rows (header white, nav gray-100)
2. Mobile: Verify hamburger menu opens below both rows
3. Tablet: Verify smooth transition at 768px breakpoint
4. Verify no gap between header and nav rows
5. Verify navigation links still functional

### E2E Tests

**Existing Test**: `shell.spec.ts` likely tests navigation links and accessibility

**Expected Impact**:
- Tests should still pass (navigation functionality unchanged)
- If tests rely on specific DOM structure (e.g., TopNav being child of Header), they may need selector updates
- Accessibility tests should still pass (aria-labels preserved)

**Action**: Run existing E2E tests after implementation to verify no regressions

### Accessibility Testing

- **Keyboard navigation**: Tab through header → nav → main content
- **Screen reader**: Ensure header and nav are announced correctly
- **Focus indicators**: Verify visible focus states on all interactive elements

## Migration Path

### Deployment Strategy

**Single-step deployment** (recommended):
1. Implement changes in AppShell.jsx and Header.jsx
2. Update TopNav.jsx to add wrapper with background color
3. Run E2E tests to verify no regressions
4. Manual visual testing on desktop and mobile
5. Deploy to production

**No gradual rollout needed** because:
- Visual-only change (no data or state changes)
- Low risk (easily reversible)
- Affects all pages consistently (no partial states)
- No feature flags required

### Rollback Plan

If issues arise:
1. Revert AppShell.jsx (remove `<TopNav />` line)
2. Revert Header.jsx (add `<TopNav />` back)
3. Revert TopNav.jsx (remove wrapper div)
4. Redeploy

Estimated rollback time: < 5 minutes

## Open Questions

None. All clarifications resolved (visual distinction, mobile dropdown positioning, row spacing).

## Dependencies

### Existing Dependencies (No Changes)

- `react@^18.2.0` - Component framework
- `react-router-dom@^6.11.2` - Navigation links
- `@azure/msal-react@^3.0.25` - Authentication (for conditional nav visibility)
- `tailwindcss@^3.4.8` - Styling utilities

### No New Dependencies Required

All functionality achievable with existing libraries and components.

## References

- [React Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Tailwind CSS Flexbox Utilities](https://tailwindcss.com/docs/flex)
- [Tailwind CSS Background Colors](https://tailwindcss.com/docs/background-color)
- [ARIA Landmark Roles](https://www.w3.org/TR/wai-aria-practices-1.1/#aria_landmark)

## Approval

Research findings confirm that moving TopNav from Header to AppShell (as siblings) is the simplest, most maintainable solution. Ready to proceed to Phase 1 (Design).
