# Contracts: Voting Platform Navigation Link

**Feature**: 001-voting-platform-nav  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This document defines the contracts (interfaces, APIs, component props) for the voting platform navigation feature. Since this is a UI-only feature with no backend API, contracts focus on component interfaces and navigation configuration.

---

## 1. Navigation Link Configuration Contract

**File**: `src/client/src/components/shell/TopNav.jsx`

**Interface**:
```typescript
interface NavigationLink {
  label: string              // Display text for the link
  href: string               // Route path (React Router)
  requiredRoles?: string[]   // Optional: roles required to view this link
                            // Empty or undefined = visible to all authenticated users
}

// Usage
const links: NavigationLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Voting Platform', href: '/voting-platform', requiredRoles: ['voting', 'admin'] },
]
```

**Contract Rules**:
1. ✅ `label` MUST be non-empty string (displayed to user)
2. ✅ `href` MUST be valid route path starting with `/`
3. ✅ `requiredRoles` is optional array of role strings
4. ✅ If `requiredRoles` is empty/undefined, link is visible to all authenticated users
5. ✅ If `requiredRoles` has values, link is visible only to users with ANY of those roles (OR logic)
6. ✅ Links with `requiredRoles` are automatically hidden when user lacks permission (no error shown)

---

## 2. Role Checking Hook Contract

**File**: `src/client/src/auth/useRoles.js` (existing)

**Interface**:
```typescript
// Extract user roles from MSAL token claims
function useRoles(): string[]

// Check if user has any of the expected roles
function hasAnyRole(
  roles: string[],      // User's current roles
  expected: string | string[]  // Required role(s)
): boolean
```

**Contract Rules**:
1. ✅ `useRoles()` returns empty array if no roles found
2. ✅ `useRoles()` handles both single role (string) and multiple roles (array) in token
3. ✅ `hasAnyRole()` returns `false` if roles array is empty
4. ✅ `hasAnyRole()` returns `false` if expected is empty/undefined
5. ✅ `hasAnyRole()` accepts expected as string or array
6. ✅ `hasAnyRole()` uses OR logic (user needs ANY of the expected roles, not ALL)

**Example Usage**:
```javascript
const userRoles = useRoles()              // ['admin', 'user']
hasAnyRole(userRoles, ['voting'])        // false
hasAnyRole(userRoles, ['admin'])         // true
hasAnyRole(userRoles, ['voting', 'admin']) // true (has admin)
```

---

## 3. Route Contract

**File**: `src/client/src/App.jsx`

**Interface**:
```typescript
// React Router v6 Route definition
<Route 
  path="/voting-platform" 
  element={<RequireAuth><VotingPlatform /></RequireAuth>} 
/>
```

**Contract Rules**:
1. ✅ Route path MUST be `/voting-platform`
2. ✅ Route MUST be wrapped in `<RequireAuth>` component
3. ✅ Component MUST handle case where user navigates directly to URL
4. ✅ Component SHOULD check permissions independently (defense in depth)

**Component Contract**:
```typescript
interface VotingPlatformProps {
  // No props required for initial implementation
}

// Component MUST render within AppShell for consistent layout
export default function VotingPlatform(): JSX.Element
```

---

## 4. Active State Contract

**File**: `src/client/src/components/shell/TopNav.jsx`

**Behavior**:
```typescript
// Active state determination
function isActive(href: string, currentPath: string): boolean {
  return currentPath === href
}
```

**Contract Rules**:
1. ✅ Link is considered "active" when `location.pathname` exactly matches `href`
2. ✅ Active links MUST have distinct visual styling (e.g., underline, bold, color)
3. ✅ Active state MUST update when route changes
4. ✅ Only one link should be active at a time

**Styling Contract**:
```javascript
// Active link classes (example)
const activeClasses = "border-b-2 border-indigo-600 font-semibold"
const inactiveClasses = "text-gray-700 hover:text-indigo-600"
```

---

## 5. Accessibility Contract (WCAG 2.1 Level AA)

**Requirements**:

### 5.1 Keyboard Navigation
```typescript
// Link MUST be focusable and activatable via keyboard
<Link to={href} tabIndex={0}>  // Implicit in React Router Link
  {label}
</Link>
```

**Contract Rules**:
1. ✅ Link MUST be reachable via Tab key
2. ✅ Link MUST be activatable via Enter key
3. ✅ Focus indicator MUST be visible
4. ✅ Tab order MUST be logical (left-to-right, top-to-bottom)

### 5.2 Screen Reader Support
```typescript
// Navigation MUST have semantic structure
<nav aria-label="Primary navigation">
  <ul>
    <li>
      <Link to={href}>{label}</Link>
    </li>
  </ul>
</nav>
```

**Contract Rules**:
1. ✅ Navigation MUST use semantic `<nav>` element
2. ✅ Links MUST be in `<ul>`/`<li>` structure
3. ✅ `aria-label` MUST describe the navigation purpose
4. ✅ Link text MUST be descriptive (not "click here" or "link")
5. ✅ Active state MUST be communicated to screen readers (via `aria-current="page"` or equivalent)

### 5.3 Color Contrast
**Contract Rules**:
1. ✅ Link text MUST have 4.5:1 contrast ratio with background (normal text)
2. ✅ Active state indicator MUST have 3:1 contrast ratio (non-text UI component)
3. ✅ Focus indicator MUST have 3:1 contrast ratio

### 5.4 Mobile Accessibility
**Contract Rules**:
1. ✅ Touch targets MUST be at least 44x44 CSS pixels
2. ✅ Mobile menu MUST have proper ARIA attributes (`aria-expanded`, `aria-controls`)
3. ✅ Mobile menu button MUST have descriptive label

---

## 6. Responsive Design Contract

**Breakpoints** (Tailwind defaults):
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: ≥ 1024px

**Contract Rules**:
1. ✅ Desktop: Links in horizontal navigation bar
2. ✅ Mobile: Links in collapsible hamburger menu
3. ✅ Link MUST appear in both desktop and mobile navigation
4. ✅ Link order MUST be consistent across breakpoints

---

## 7. Testing Contracts

### 7.1 E2E Test Contract (Playwright)

**File**: `src/client/e2e/tests/voting-nav.spec.ts`

**Test Cases** (MUST cover):
```typescript
describe('Voting Platform Navigation', () => {
  test('shows link to users with voting role', async ({ page }) => {
    // Given: User with 'voting' role is logged in
    // When: User views navigation menu
    // Then: "Voting Platform" link is visible
  })
  
  test('shows link to users with admin role', async ({ page }) => {
    // Given: User with 'admin' role is logged in
    // When: User views navigation menu
    // Then: "Voting Platform" link is visible
  })
  
  test('hides link from users without required roles', async ({ page }) => {
    // Given: User without 'voting' or 'admin' role is logged in
    // When: User views navigation menu
    // Then: "Voting Platform" link is NOT visible
  })
  
  test('navigates to voting platform when clicked', async ({ page }) => {
    // Given: User with voting role sees the link
    // When: User clicks "Voting Platform" link
    // Then: User is navigated to /voting-platform
  })
  
  test('displays active state on voting platform page', async ({ page }) => {
    // Given: User is on /voting-platform page
    // When: User views navigation menu
    // Then: "Voting Platform" link shows active styling
  })
  
  test('is keyboard accessible', async ({ page }) => {
    // Given: User is on home page
    // When: User presses Tab key repeatedly
    // Then: "Voting Platform" link receives focus
    // And: Pressing Enter navigates to voting platform
  })
})
```

### 7.2 Integration Test Contract

**Principles**:
1. ✅ MUST test role-based visibility logic
2. ✅ MUST test with different role combinations
3. ✅ MUST test mobile and desktop navigation independently
4. ✅ MUST verify routing integration

---

## 8. Performance Contract

**Requirements** (from Success Criteria):
1. ✅ Navigation link interaction response time MUST be < 100ms
2. ✅ Role check SHOULD complete synchronously (no async delays)
3. ✅ Navigation component re-render SHOULD be optimized (React.memo if needed)

---

## Contract Validation Checklist

Before implementation, verify:
- [ ] Navigation link configuration matches `NavigationLink` interface
- [ ] Role checking uses `hasAnyRole()` with correct role names
- [ ] Route is defined in App.jsx with proper path
- [ ] Active state logic uses `useLocation()` hook
- [ ] Accessibility attributes are present
- [ ] Both desktop and mobile navigation are updated
- [ ] E2E tests cover all required scenarios
- [ ] Performance requirements are measurable

---

## Breaking Change Policy

**Version**: 1.0.0 (initial implementation)

**Future Changes**:
- Adding new required roles: MINOR (backwards compatible - existing users unaffected)
- Changing link href: MAJOR (breaking - existing bookmarks/links break)
- Renaming link label: MINOR (UI change only)
- Changing role checking logic: MAJOR (affects authorization behavior)

---

**Status**: ✅ Contracts defined - Ready for implementation
