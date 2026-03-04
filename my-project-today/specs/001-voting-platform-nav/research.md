# Research: Voting Platform Navigation Link

**Feature**: 001-voting-platform-nav  
**Date**: February 11, 2026  
**Phase**: 0 (Research & Discovery)

## Overview

This document captures research findings for implementing a permission-based navigation link to the Voting Platform. All technical clarifications from the specification have been resolved.

## Research Areas

### 1. Permission System Integration

**Question**: How to check if a user has "voting" or "admin" permissions in the React frontend?

**Decision**: Use existing `useRoles` and `hasAnyRole` utilities

**Rationale**: 
- The application already has a robust role-checking system via `src/client/src/auth/useRoles.js`
- The `useRoles()` hook extracts roles from MSAL id token claims
- The `hasAnyRole(roles, expected)` helper function checks if user has any of the expected roles
- This aligns with the existing authentication architecture

**Implementation Approach**:
```javascript
import { useRoles, hasAnyRole } from '../auth/useRoles'

function TopNav() {
  const userRoles = useRoles()
  const canAccessVoting = hasAnyRole(userRoles, ['voting', 'admin'])
  
  // Only render voting link if canAccessVoting is true
}
```

**Alternatives Considered**:
- Creating a new permission system: Rejected - unnecessary duplication
- Backend API check: Rejected - adds latency and complexity for simple permission check
- Using custom claims: Rejected - existing roles system is sufficient

---

### 2. Navigation Link Rendering Pattern

**Question**: What's the best pattern for conditionally rendering navigation links based on permissions?

**Decision**: Filter links array based on permissions before rendering

**Rationale**:
- The existing `TopNav.jsx` uses a static `links` array that's mapped to render navigation items
- Most elegant approach: add a `requiredRoles` property to each link object and filter based on user roles
- Keeps logic centralized and maintainable
- Follows existing code patterns in the application

**Implementation Approach**:
```javascript
const links = [
  { label: 'Home', href: '/', requiredRoles: [] },  // visible to all
  { label: 'Voting Platform', href: '/voting', requiredRoles: ['voting', 'admin'] },
  // ... other links
]

// In component
const userRoles = useRoles()
const visibleLinks = links.filter(link => 
  link.requiredRoles.length === 0 || hasAnyRole(userRoles, link.requiredRoles)
)
```

**Alternatives Considered**:
- Inline conditional rendering: Rejected - harder to maintain as more permission-based links are added
- Separate permission component: Rejected - over-engineering for this use case

---

### 3. Active State Styling with React Router

**Question**: How to show active state for the currently active navigation link?

**Decision**: Use React Router's `useLocation` hook with conditional styling

**Rationale**:
- React Router provides `useLocation()` hook that returns current pathname
- Can compare link href with current pathname to determine active state
- Existing Tailwind CSS classes can handle the visual styling
- No additional dependencies needed

**Implementation Approach**:
```javascript
import { useLocation } from 'react-router-dom'

function TopNav() {
  const location = useLocation()
  
  const isActive = (href) => location.pathname === href
  
  return (
    <Link 
      to={href} 
      className={`text-gray-700 hover:text-indigo-600 ${isActive(href) ? 'border-b-2 border-indigo-600 font-semibold' : ''}`}
    >
      {label}
    </Link>
  )
}
```

**Alternatives Considered**:
- NavLink component: Could use React Router's `NavLink` with activeClassName, but current pattern uses `Link` component
- CSS-only solution: Rejected - JavaScript approach is more reliable and flexible

---

### 4. Accessibility Best Practices

**Question**: How to ensure WCAG 2.1 Level AA compliance for the navigation link?

**Decision**: Follow existing navigation patterns which already meet accessibility standards

**Rationale**:
- Current `TopNav.jsx` already implements accessibility best practices:
  - Uses semantic HTML (`<nav>`, `<ul>`, `<li>`)
  - Has proper ARIA labels (`aria-label="Primary"`)
  - Keyboard navigable (standard `<Link>` components)
  - Mobile menu has `aria-controls` and `aria-expanded`
- New link will inherit these patterns

**Implementation Requirements**:
1. ✅ Use `<Link>` component (keyboard accessible by default)
2. ✅ Ensure sufficient color contrast (existing Tailwind classes meet requirements)
3. ✅ Maintain semantic HTML structure
4. ✅ Screen reader friendly (link text is descriptive: "Voting Platform")
5. ✅ Mobile menu includes new link with same accessibility features

**Testing Approach**:
- Keyboard navigation test (Tab, Enter, Shift+Tab)
- Screen reader test (NVDA/JAWS on Windows, VoiceOver on Mac)
- Color contrast validation (automated tools)
- Playwright E2E tests for keyboard interaction

---

### 5. Route Configuration

**Question**: What route should the voting platform link navigate to?

**Decision**: Use `/voting-platform` route with placeholder page initially

**Rationale**:
- Clear, descriptive URL that follows REST conventions
- Can create simple placeholder/stub page now
- Real voting platform functionality can be implemented later without changing navigation
- Consistent with existing route patterns (`/announcements`, `/meetings`)

**Implementation Approach**:
```javascript
// In App.jsx
<Route 
  path="/voting-platform" 
  element={<RequireAuth><VotingPlatform /></RequireAuth>} 
/>

// VotingPlatform.jsx (placeholder)
export default function VotingPlatform() {
  return (
    <AppShell>
      <h1>Voting Platform</h1>
      <p>Coming soon...</p>
    </AppShell>
  )
}
```

**Alternatives Considered**:
- `/voting`: Rejected - too generic, might conflict with future voting-related routes
- `/vote`: Rejected - sounds like an action rather than a platform
- External URL: Rejected - specification implies internal page

---

### 6. Cross-Browser Compatibility

**Question**: Any special considerations for Chrome, Firefox, Safari, Edge support?

**Decision**: No special handling needed - existing tech stack supports all browsers

**Rationale**:
- React 18.2.0 supports all target browsers
- React Router 6.11.2 has wide browser support
- Tailwind CSS is compiled to standard CSS
- No browser-specific APIs or features used
- Existing navigation works across all browsers

**Testing Approach**:
- Manual testing on Chrome, Firefox, Safari, Edge
- Playwright tests run in Chromium engine by default
- Can configure Playwright for multi-browser testing if needed

---

### 7. Responsive Design

**Question**: How to ensure navigation link works on mobile, tablet, and desktop?

**Decision**: Follow existing responsive pattern in TopNav.jsx

**Rationale**:
- Current navigation already handles responsive design with:
  - Desktop: Horizontal nav bar (`hidden md:flex`)
  - Mobile: Hamburger menu (`md:hidden`)
- New link will be added to both desktop and mobile versions using same pattern
- Tailwind's responsive utilities handle breakpoints

**Implementation**: No special handling - add link to both `links` array instances (desktop ul and mobile menu)

---

## Technology Stack Summary

**Frontend**:
- React 18.2.0 (component rendering)
- React Router DOM 6.11.2 (routing and navigation)
- MSAL React 3.0.25 (authentication and role extraction)
- Fluent UI React Components 9.72.11 (if needed for icons)
- Tailwind CSS 3.4.8 (styling)

**Testing**:
- Playwright 1.40.0 (E2E tests)
- React Testing Library (component tests, if needed)

**Backend**: 
- No backend changes required for this feature
- Existing JWT authentication provides roles in token claims

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|----------|
| Missing voting/admin roles in test environment | Medium | Medium | Create test users with appropriate roles; document role setup |
| Voting platform page doesn't exist yet | High | Low | Create placeholder page; link still functional |
| Permission check fails or is bypassed | Low | High | Write comprehensive tests; follow existing auth patterns |
| Accessibility violations | Low | Medium | Follow existing patterns; run automated accessibility tests |
| Route conflict with existing pages | Low | Low | Verify route doesn't exist; use descriptive URL |

---

## Open Questions

None - all clarifications from specification have been resolved.

---

## References

- **Existing Code**:
  - `src/client/src/components/shell/TopNav.jsx` - Navigation component
  - `src/client/src/auth/useRoles.js` - Role checking utilities
  - `src/client/src/App.jsx` - Route configuration
  
- **Documentation**:
  - React Router v6: https://reactrouter.com/
  - MSAL React: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react
  - WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
  - Playwright: https://playwright.dev/

---

**Status**: ✅ Research complete - Ready for Phase 1 (Design)