# Data Model: Voting Platform Navigation Link

**Feature**: 001-voting-platform-nav  
**Date**: February 11, 2026  
**Phase**: 1 (Design)

## Overview

This feature does not introduce any new data models, database entities, or persistent storage. It is purely a UI navigation feature that leverages existing authentication and authorization data.

## Existing Data Dependencies

### User Roles (from MSAL Token Claims)

The feature relies on existing user role information provided through MSAL (Microsoft Authentication Library) ID token claims:

**Source**: `idTokenClaims.roles` or `idTokenClaims.role` from authenticated user

**Structure**:
```typescript
// Token claims structure (read-only, provided by identity provider)
interface TokenClaims {
  roles?: string | string[]  // User's assigned roles
  // ... other claims
}

// Parsed roles (in application)
type UserRoles = string[]  // e.g., ['voting', 'admin', 'user']
```

**Expected Roles for this Feature**:
- `"voting"` - Users with voting permissions
- `"admin"` - Administrative users (implied voting access)

**Notes**:
- Roles are assigned and managed in the identity provider (Azure AD/Entra ID)
- Application reads roles from token claims (no write operations)
- Role checking happens on the client side for UI rendering purposes
- Backend authorization should be handled separately by the voting platform itself

---

## Component State

While there is no persisted data model, the navigation component maintains minimal ephemeral state:

### Navigation Link Configuration

**Location**: `src/client/src/components/shell/TopNav.jsx`

```javascript
// Navigation link configuration
const links = [
  {
    label: 'Home',
    href: '/',
    requiredRoles: []  // Empty = visible to all authenticated users
  },
  {
    label: 'Voting Platform',
    href: '/voting-platform',
    requiredRoles: ['voting', 'admin']  // Visible only to users with these roles
  },
  // ... other links
]
```

**Fields**:
- `label` (string): Display text for the link
- `href` (string): Route path
- `requiredRoles` (string[]): Array of roles required to see this link. Empty array means visible to all authenticated users.

---

## No Database Changes

✅ No database migrations required  
✅ No new tables or columns  
✅ No data persistence layer changes  
✅ No API models

---

## Data Flow

```
[Identity Provider (Azure AD)]
         ↓
    [MSAL Token]
         ↓
   [idTokenClaims.roles]
         ↓
    [useRoles() hook]
         ↓
   [hasAnyRole() check]
         ↓
[Conditional link rendering]
```

**Description**:
1. User authenticates via MSAL
2. Identity provider returns JWT token with role claims
3. Application extracts roles using `useRoles()` hook
4. `hasAnyRole()` function checks if user has required roles
5. Navigation component conditionally renders link based on result

---

## Security Considerations

**Client-Side Authorization**:
- Navigation link visibility is controlled client-side
- This is UI/UX convenience only - **not a security boundary**
- Backend endpoints must still enforce authorization
- Hiding links doesn't prevent determined users from navigating directly

**Recommendation**:
- Voting platform page should verify permissions independently
- Backend APIs (if any) must validate user roles server-side
- Consider adding route guards in React Router if needed

---

## Testing Data Requirements

For E2E and integration tests, we'll need:

**Test Users**:
1. User with `voting` role (can see link)
2. User with `admin` role (can see link)
3. User with neither role (cannot see link)
4. User with `admin` + `voting` roles (can see link)

**Test Setup**:
```javascript
// Mock token claims for testing
const mockTokenClaims = {
  votingUser: { roles: ['voting'] },
  adminUser: { roles: ['admin'] },
  regularUser: { roles: ['user'] },
  multiRoleUser: { roles: ['admin', 'voting', 'user'] }
}
```

---

**Summary**: This feature has no persistent data model. It uses existing authentication data (user roles) to conditionally render a navigation link. All data dependencies are read-only from the identity provider.
