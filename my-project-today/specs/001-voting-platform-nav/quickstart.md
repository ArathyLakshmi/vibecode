# Quickstart: Voting Platform Navigation Link

**Feature**: 001-voting-platform-nav  
**Branch**: `001-voting-platform-nav`  
**Estimated Time**: 30-45 minutes  
**Difficulty**: ⭐ Easy

## Prerequisites

- ✅ Repository cloned and dependencies installed
- ✅ Development environment running (`npm run dev` for client, `dotnet run` for server)
- ✅ Familiarity with React, React Router, and MSAL authentication
- ✅ Read [research.md](research.md) and [contracts/README.md](contracts/README.md)

## Quick Summary

Add a "Voting Platform" navigation link that:
- Appears in the main navigation menu
- Is visible only to users with `voting` or `admin` roles
- Routes to `/voting-platform` page
- Shows active state when on that page
- Works on desktop and mobile

## Implementation Steps

### Step 1: Create Voting Platform Page (5 min)

Create placeholder page for the voting platform route.

**File**: `src/client/src/pages/VotingPlatform.jsx` (new file)

```javascript
import React from 'react'
import AppShell from '../components/shell/AppShell'

export default function VotingPlatform() {
  return (
    <AppShell>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Voting Platform</h1>
        <p className="text-gray-600">
          Welcome to the Voting Platform. Features coming soon...
        </p>
      </div>
    </AppShell>
  )
}
```

**Why**: Need a destination page for the navigation link.

---

### Step 2: Add Route Configuration (3 min)

Add the route to the application router.

**File**: `src/client/src/App.jsx`

```javascript
// Add import at top
import VotingPlatform from './pages/VotingPlatform'

// In the Routes component, add new route:
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
  <Route path="/announcements" element={<RequireAuth><AnnouncementsPage /></RequireAuth>} />
  
  {/* ADD THIS LINE */}
  <Route path="/voting-platform" element={<RequireAuth><VotingPlatform /></RequireAuth>} />
  
  <Route path="*" element={<RequireAuth><Home /></RequireAuth>} />
</Routes>
```

**Why**: Defines the `/voting-platform` route that the navigation link will point to.

---

### Step 3: Update Navigation Component (10 min)

Add the voting platform link to the navigation menu with permission checking.

**File**: `src/client/src/components/shell/TopNav.jsx`

```javascript
import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'  // ADD useLocation
import { useIsAuthenticated } from '../../auth/useAuth'
import { useRoles, hasAnyRole } from '../../auth/useRoles'  // ADD THESE IMPORTS

// Update links array to include requiredRoles
const links = [
  { label: 'Home', href: '/', requiredRoles: [] },
  { label: 'Announced Meetings', href: '/announcements', requiredRoles: [] },
  { label: 'Dashboard', href: '/dashboard', requiredRoles: [] },
  { label: 'Meetings', href: '/meetings', requiredRoles: [] },
  
  // ADD THIS LINE
  { label: 'Voting Platform', href: '/voting-platform', requiredRoles: ['voting', 'admin'] },
  
  { label: 'Settings', href: '/settings', requiredRoles: [] },
]

export default function TopNav() {
  const [open, setOpen] = useState(false)
  const isAuthenticated = useIsAuthenticated()
  const userRoles = useRoles()  // ADD THIS
  const location = useLocation()  // ADD THIS

  // Only show navigation when authenticated
  if (!isAuthenticated) return null

  // Filter links based on user roles
  const visibleLinks = links.filter(link =>
    link.requiredRoles.length === 0 || hasAnyRole(userRoles, link.requiredRoles)
  )

  // Helper to check if link is active
  const isActive = (href) => location.pathname === href

  return (
    <div className="bg-gray-100 border-b border-gray-200">
      <nav aria-label="Primary" className="container mx-auto px-4 py-3">
        {/* desktop */}
        <ul className="hidden md:flex gap-6">
          {visibleLinks.map(l => (
            <li key={l.href}>
              <Link 
                to={l.href} 
                className={`${
                  isActive(l.href) 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold' 
                    : 'text-gray-700 hover:text-indigo-600'
                }`}
                aria-current={isActive(l.href) ? 'page' : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* mobile */}
        <div className="md:hidden">
          <button
            aria-controls="primary-mobile"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded hover:bg-gray-200"
          >
            <svg width="24" height="24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div id="primary-mobile" className={`absolute right-4 mt-2 w-48 bg-white border shadow z-50 ${open ? 'block' : 'hidden'}`}>
            <ul className="flex flex-col p-2 gap-2">
              {visibleLinks.map(l => (
                <li key={l.href}>
                  <Link 
                    to={l.href} 
                    className={`block px-2 py-1 ${
                      isActive(l.href)
                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isActive(l.href) ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  )
}
```

**Key Changes**:
1. Import `useRoles`, `hasAnyRole`, and `useLocation`
2. Add `requiredRoles` to each link in the array
3. Filter links based on user roles
4. Add active state styling
5. Add `aria-current` for accessibility

---

### Step 4: Test Manually (10 min)

**Test Case 1: User with voting role**
1. Log in as user with `voting` role
2. Navigate to home page
3. ✅ Verify "Voting Platform" link appears in navigation
4. Click the link
5. ✅ Verify navigation to `/voting-platform`
6. ✅ Verify link shows active state

**Test Case 2: User with admin role**
1. Log in as user with `admin` role
2. ✅ Verify "Voting Platform" link appears in navigation

**Test Case 3: User without required roles**
1. Log in as regular user (no voting or admin role)
2. ✅ Verify "Voting Platform" link does NOT appear

**Test Case 4: Keyboard navigation**
1. Press Tab key repeatedly
2. ✅ Verify "Voting Platform" link receives focus outline
3. Press Enter when focused
4. ✅ Verify navigation works

**Test Case 5: Mobile**
1. Resize browser to mobile width (< 768px)
2. Click hamburger menu
3. ✅ Verify "Voting Platform" link appears in mobile menu

---

### Step 5: Write E2E Tests (15-20 min)

Create automated tests for the feature.

**File**: `src/client/e2e/tests/voting-nav.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Voting Platform Navigation', () => {
  test('shows link to users with voting role', async ({ page }) => {
    // TODO: Set up test user with 'voting' role
    await page.goto('/')
    
    // Wait for authentication
    await page.waitForSelector('nav[aria-label="Primary"]')
    
    // Verify link is visible
    const link = page.locator('a', { hasText: 'Voting Platform' })
    await expect(link).toBeVisible()
  })

  test('navigates to voting platform when clicked', async ({ page }) => {
    // TODO: Set up test user with 'voting' role
    await page.goto('/')
    
    // Click the link
    await page.click('text=Voting Platform')
    
    // Verify navigation
    await expect(page).toHaveURL('/voting-platform')
    await expect(page.locator('h1')).toContainText('Voting Platform')
  })

  test('displays active state on voting platform page', async ({ page }) => {
    // TODO: Set up test user with 'voting' role
    await page.goto('/voting-platform')
    
    const link = page.locator('a', { hasText: 'Voting Platform' })
    
    // Verify active styling (check for specific class or aria-current)
    await expect(link).toHaveAttribute('aria-current', 'page')
  })

  test('is keyboard accessible', async ({ page }) => {
    // TODO: Set up test user with 'voting' role
    await page.goto('/')
    
    // Tab to the link
    await page.keyboard.press('Tab')
    // May need multiple tabs depending on DOM structure
    
    // Verify link is focused
    const link = page.locator('a', { hasText: 'Voting Platform' })
    await expect(link).toBeFocused()
    
    // Press Enter to navigate
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/voting-platform')
  })

  test('appears in mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Open mobile menu
    await page.click('button[aria-label="Toggle navigation"]')
    
    // Verify link is in mobile menu
    const link = page.locator('#primary-mobile a', { hasText: 'Voting Platform' })
    await expect(link).toBeVisible()
  })
})
```

**Note**: You'll need to configure authentication mocking for role-based tests. See existing E2E test setup.

---

### Step 6: Run Tests (5 min)

```bash
# Run E2E tests
cd src/client
npm run e2e

# Or run specific test file
npx playwright test e2e/tests/voting-nav.spec.ts
```

---

## Verification Checklist

Before marking complete:

- [ ] Voting Platform page created and renders correctly
- [ ] Route added to App.jsx
- [ ] Navigation link appears for users with voting or admin roles
- [ ] Link hidden from users without required roles
- [ ] Clicking link navigates to `/voting-platform`
- [ ] Active state shows when on voting platform page
- [ ] Link works on desktop navigation bar
- [ ] Link works in mobile hamburger menu
- [ ] Keyboard navigation works (Tab + Enter)
- [ ] E2E tests written and passing
- [ ] Code follows existing patterns and conventions
- [ ] No console errors or warnings

---

## Troubleshooting

**Issue**: Link doesn't appear for any user

**Solution**: 
- Check that `useRoles()` is returning roles correctly
- Verify user's token contains role claims
- Console.log `userRoles` and `hasAnyRole()` result for debugging

---

**Issue**: Active state doesn't show

**Solution**:
- Verify `useLocation()` is imported and used
- Check that `location.pathname` matches link `href` exactly
- Ensure active styling classes are applied conditionally

---

**Issue**: Link appears for all users

**Solution**:
- Check that `requiredRoles` array is set correctly for the voting platform link
- Verify `visibleLinks` filter logic is working
- Make sure you're mapping over `visibleLinks`, not `links`

---

**Issue**: Mobile menu doesn't show link

**Solution**:
- Ensure mobile section also maps over `visibleLinks`
- Check responsive breakpoint classes (`md:hidden`, `hidden md:flex`)

---

## Next Steps

After implementing this feature:

1. **Phase 2**: Break down into detailed implementation tasks (run `/speckit.tasks`)
2. **Implementation**: Follow test-first approach
3. **Code Review**: Ensure all checklist items passed
4. **Testing**: Run full test suite including integration tests
5. **Documentation**: Update project README if needed

---

## Additional Resources

- **Research Document**: [research.md](research.md) - Detailed technical decisions
- **Contracts**: [contracts/README.md](contracts/README.md) - Interface specifications
- **Data Model**: [data-model.md](data-model.md) - Data dependencies
- **React Router Docs**: https://reactrouter.com/
- **MSAL React Docs**: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react

---

**Estimated Total Time**: 45-60 minutes including testing

**Ready to start?** Follow the steps above, and remember: **tests first!** ✅
