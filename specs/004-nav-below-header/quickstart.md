# Quickstart: Navigation Below Header Implementation

**Feature**: 004-nav-below-header  
**Date**: February 11, 2026  
**Estimated Time**: 15-20 minutes  
**Difficulty**: Easy

## Overview

This guide walks through moving the primary navigation from inside the Header component to a dedicated row below the header in AppShell. This is a simple component restructuring with minimal code changes.

## Prerequisites

- [x] React 18.2.0+ installed
- [x] Project running (`src/client` directory)
- [x] Existing AppShell, Header, and TopNav components
- [x] Tailwind CSS configured
- [x] Branch checked out: `004-nav-below-header`

## Implementation Steps

### Step 1: Update AppShell.jsx - Add TopNav as Sibling

**File**: `src/client/src/components/shell/AppShell.jsx`

**Goal**: Move TopNav from being rendered inside Header to being rendered as a sibling after Header

**Current Code**:
```jsx
import React from 'react'
import Header from './Header'
import Footer from './Footer'

export default function AppShell({ children, onSearchChange }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearchChange={onSearchChange} />
      <main className="flex-1 container mx-auto px-4 py-6" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

**New Code**:
```jsx
import React from 'react'
import Header from './Header'
import TopNav from './TopNav'
import Footer from './Footer'

export default function AppShell({ children, onSearchChange }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearchChange={onSearchChange} />
      <TopNav />
      <main className="flex-1 container mx-auto px-4 py-6" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

**Changes**:
1. Add import: `import TopNav from './TopNav'`
2. Add `<TopNav />` line after `<Header />` and before `<main>`

---

### Step 2: Update Header.jsx - Remove TopNav

**File**: `src/client/src/components/shell/Header.jsx`

**Goal**: Remove TopNav from Header's JSX since it now renders in AppShell

**Current Code**:
```jsx
import React from 'react'
import TopNav from './TopNav'
import SearchBar from './SearchBar'
import { useMsal, useIsAuthenticated } from '../../auth/useAuth'

export default function Header({ onSearchChange }) {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = instance.getActiveAccount()
  const userEmail = account?.username || account?.email || 'Account'

  return (
    <header role="banner" className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center rounded text-xs">UBS</div>
          <span className="font-semibold text-lg">Unified Board Solutions</span>
        </a>

        {isAuthenticated && <SearchBar onSearchChange={onSearchChange} />}

        <TopNav />

        <div className="ml-4">
          <div className="text-sm text-gray-600">{isAuthenticated ? userEmail : 'Account'}</div>
        </div>
      </div>
    </header>
  )
}
```

**New Code**:
```jsx
import React from 'react'
import SearchBar from './SearchBar'
import { useMsal, useIsAuthenticated } from '../../auth/useAuth'

export default function Header({ onSearchChange }) {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = instance.getActiveAccount()
  const userEmail = account?.username || account?.email || 'Account'

  return (
    <header role="banner" className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center rounded text-xs">UBS</div>
          <span className="font-semibold text-lg">Unified Board Solutions</span>
        </a>

        {isAuthenticated && <SearchBar onSearchChange={onSearchChange} />}

        <div className="ml-4">
          <div className="text-sm text-gray-600">{isAuthenticated ? userEmail : 'Account'}</div>
        </div>
      </div>
    </header>
  )
}
```

**Changes**:
1. Remove import: `import TopNav from './TopNav'`
2. Remove JSX line: `<TopNav />`

---

### Step 3: Update TopNav.jsx - Add Background Color Wrapper

**File**: `src/client/src/components/shell/TopNav.jsx`

**Goal**: Add wrapper div with distinct background color (bg-gray-100) and ensure full-width container

**Current Code**:
```jsx
import React, { useState } from 'react'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Meetings', href: '/meetings' },
  { label: 'Settings', href: '/settings' },
]

export default function TopNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav aria-label="Primary" className="flex-1">
      {/* desktop */}
      <ul className="hidden md:flex gap-6 justify-center">
        {links.map(l => (
          <li key={l.href}>
            <a href={l.href} className="text-gray-700 hover:text-indigo-600">{l.label}</a>
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
          className="p-2 rounded hover:bg-gray-100"
        >
          <svg width="24" height="24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div id="primary-mobile" className={`absolute right-4 mt-2 w-48 bg-white border shadow ${open ? 'block' : 'hidden'}`}>
          <ul className="flex flex-col p-2 gap-2">
            {links.map(l => (
              <li key={l.href}>
                <a href={l.href} className="block px-2 py-1 text-gray-700 hover:bg-gray-50">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
```

**New Code**:
```jsx
import React, { useState } from 'react'
import { useIsAuthenticated } from '../../auth/useAuth'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Meetings', href: '/meetings' },
  { label: 'Settings', href: '/settings' },
]

export default function TopNav() {
  const [open, setOpen] = useState(false)
  const isAuthenticated = useIsAuthenticated()

  // Only show navigation when authenticated
  if (!isAuthenticated) return null

  return (
    <div className="bg-gray-100 border-b border-gray-200">
      <nav aria-label="Primary" className="container mx-auto px-4 py-3">
        {/* desktop */}
        <ul className="hidden md:flex gap-6">
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} className="text-gray-700 hover:text-indigo-600">{l.label}</a>
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
            <svg width="24" height="24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <div id="primary-mobile" className={`absolute right-4 mt-2 w-48 bg-white border shadow z-50 ${open ? 'block' : 'hidden'}`}>
            <ul className="flex flex-col p-2 gap-2">
              {links.map(l => (
                <li key={l.href}>
                  <a href={l.href} className="block px-2 py-1 text-gray-700 hover:bg-gray-50">{l.label}</a>
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

**Changes**:
1. Add import: `import { useIsAuthenticated } from '../../auth/useAuth'`
2. Add auth check: `const isAuthenticated = useIsAuthenticated()`
3. Add early return: `if (!isAuthenticated) return null`
4. Wrap everything in: `<div className="bg-gray-100 border-b border-gray-200">`
5. Update nav element: Add `container mx-auto px-4 py-3` classes
6. Remove `flex-1` from nav (no longer needed)
7. Remove `justify-center` from desktop ul (left-aligned instead)
8. Add `z-50` to mobile dropdown for proper layering
9. Update mobile button hover: `hover:bg-gray-200` (instead of bg-gray-100, which is now the background)

---

### Step 4: Visual Verification

**Start development server** (if not already running):
```powershell
# Terminal 1 - Frontend
cd src\client
npm run dev
```

**Test Checklist**:

**Desktop (≥768px)**:
1. ✅ Open browser to http://localhost:5173
2. ✅ Login (if not already authenticated)
3. ✅ Verify two distinct rows:
   - Row 1 (white background): Logo, Search bar, Account
   - Row 2 (gray background): Home, Dashboard, Meetings, Settings links
4. ✅ Verify no gap between rows (they touch)
5. ✅ Click each navigation link - verify routing works
6. ✅ Verify navigation links are horizontal

**Mobile (<768px)**:
1. ✅ Resize browser to mobile width (or use DevTools device emulation)
2. ✅ Verify hamburger menu button is still visible (in header area)
3. ✅ Click hamburger - verify dropdown appears below both rows
4. ✅ Click a navigation link in dropdown - verify routing works
5. ✅ Verify navigation row is still visible (even as a separate row)

**Tablet (≥768px, <1024px)**:
1. ✅ Resize to tablet width
2. ✅ Verify horizontal navigation links (same as desktop)

**Unauthenticated**:
1. ✅ Logout
2. ✅ Verify navigation row does NOT appear
3. ✅ Verify only header remains (logo, no search, account display)

---

### Step 5: Run E2E Tests

**Run existing shell tests**:
```powershell
cd src\client
npm run e2e
```

**Expected Result**: Tests should still pass

**If tests fail**:
- Check if tests use selectors like `header nav` (need to update to just `nav[aria-label="Primary"]`)
- Verify navigation links are still accessible
- Check that accessibility attributes are preserved

---

### Step 6: Accessibility Testing

**Keyboard Navigation**:
1. ✅ Press Tab key repeatedly
2. ✅ Verify tab order: Logo → Search → Account → Nav Links → Main Content
3. ✅ Verify focus indicators visible on all elements
4. ✅ Press Enter on navigation link - verify routing works

**Screen Reader** (optional, if available):
1. ✅ Enable screen reader (NVDA on Windows, VoiceOver on Mac)
2. ✅ Navigate through page
3. ✅ Verify header is announced as "banner"
4. ✅ Verify navigation is announced as "Primary navigation"

---

### Step 7: Commit Changes

```powershell
git add src\client\src\components\shell\AppShell.jsx
git add src\client\src\components\shell\Header.jsx
git add src\client\src\components\shell\TopNav.jsx

git commit -m "feat(004-nav-below-header): Move navigation to dedicated row below header

- Move TopNav from Header to AppShell (sibling of Header)
- Add distinct background color (bg-gray-100) to navigation row
- Add auth check to TopNav (only show when authenticated)
- Update layout: Header (logo, search, account) + Nav (links) in separate rows
- Maintain mobile hamburger functionality with z-index layering
- Zero-gap layout: rows touch, background color provides separation

Resolves: #004-nav-below-header
Success Criteria: SC-001 through SC-006 met"
```

---

## Common Issues & Troubleshooting

### Issue: Navigation links not visible

**Symptom**: TopNav row appears but links are missing

**Solution**:
- Verify you're logged in (navigation only shows when authenticated)
- Check browser console for errors
- Verify TopNav has `isAuthenticated` check and returns `null` when not authenticated

### Issue: Mobile dropdown doesn't appear

**Symptom**: Clicking hamburger doesn't show menu

**Solution**:
- Verify `z-50` class is added to mobile dropdown
- Check that dropdown has both `absolute` positioning and `mt-2` spacing
- Inspect elements in DevTools to see if dropdown is rendered but hidden behind other elements

### Issue: Layout has gap between rows

**Symptom**: White space between header and navigation

**Solution**:
- Verify Header has no `margin-bottom`
- Verify TopNav wrapper has no `margin-top`
- Check that both rows are direct children of AppShell's flex column container

### Issue: E2E tests fail

**Symptom**: Tests can't find navigation elements

**Solution**:
- Update test selectors from `header nav` to `nav[aria-label="Primary"]`
- Use semantic selectors instead of structural selectors
- Example: `page.locator('nav[aria-label="Primary"] a:has-text("Home")')`

### Issue: Navigation row doesn't span full width

**Symptom**: Nav row is narrower than header

**Solution**:
- Verify TopNav wrapper has `bg-gray-100` class (no width constraints)
- Verify nav element inside has `container mx-auto px-4` classes
- Check that AppShell container doesn't have conflicting width constraints

---

## Performance Benchmarks

Expected metrics (no degradation from current):

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load time | <1 second | Same as before (no new JavaScript) |
| Layout shift | Minimal | Same rendering pattern, just reorganized |
| First Contentful Paint | No change | Same component count and rendering cost |

**No performance testing required** - this is a zero-cost layout reorganization.

---

## Rollback Procedure

If issues arise:

**Quick Revert** (5 minutes):
```powershell
git revert <commit-hash-of-this-feature>
# Test to verify rollback works
git push
```

**Manual Revert** (if git revert fails):
1. In AppShell.jsx: Remove `import TopNav` and `<TopNav />` line
2. In Header.jsx: Add back `import TopNav` and `<TopNav />` in JSX
3. In TopNav.jsx: Remove wrapper div, remove auth check, revert to original
4. Commit and push

---

## Next Steps

After implementation complete:

1. **Visual QA**: Verify layout on desktop, tablet, mobile
2. **Accessibility Audit**: Test keyboard navigation and screen reader
3. **Cross-Browser Testing**: Test in Chrome, Firefox, Safari, Edge (optional)
4. **Create Pull Request**: Document changes, link to spec.md
5. **Deploy to production**: Monitor for layout issues in production

---

## Success Criteria Verification

After deployment, verify:

- **SC-001**: ✅ Navigation appears in separate row below header on 100% of authenticated pages
- **SC-002**: ✅ All 4 navigation links (Home, Dashboard, Meetings, Settings) remain accessible and functional at all screen sizes
- **SC-003**: ✅ Page load time remains under 1 second (no performance degradation)
- **SC-004**: ✅ Mobile hamburger menu continues to work on screens under 768px width
- **SC-005**: ✅ Visual hierarchy is clear: users can distinguish header row from navigation row at a glance
- **SC-006**: ✅ Zero breaking changes - all existing functionality (search, logout, account display) works unchanged

---

**Total Implementation Time**: 15-20 minutes  
**Complexity**: Low  
**Risk Level**: Very Low (easily reversible, no data migration, no API changes)  

**Questions?** Refer to research.md for detailed component patterns and rationale.
