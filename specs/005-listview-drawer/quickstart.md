# Quickstart: Modern Responsive Listview with Drawer Implementation

**Feature**: 005-listview-drawer  
**Date**: February 11, 2026  
**Estimated Time**: 60-90 minutes  
**Difficulty**: Medium

## Overview

This guide walks through converting MeetingRequestsList from table-based layout to responsive card grid with drawer-based detail view. Implementation involves refactoring one component and creating one new drawer component.

## Prerequisites

- [x] React 18.2.0+ installed
- [x] Tailwind CSS 3.4.8+ configured
- [x] Project running (`src/client` directory)
- [x] Branch checked out: `005-listview-drawer`
- [x] Existing MeetingRequestsList.jsx component

## Implementation Steps

### Step 1: Create Drawer Component

**File**: `src/client/src/components/Drawer.jsx` (NEW)

**Goal**: Create reusable slide-out drawer component with backdrop

**Code**:
```jsx
import React, { useEffect } from 'react'

export default function Drawer({ isOpen, onClose, children }) {
  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close details"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {children}
        </div>
      </div>
    </>
  )
}
```

**Changes**:
1. Create new file `Drawer.jsx`
2. Implement backdrop + drawer with slide animation
3. Add Escape key handler for accessibility
4. Add ARIA attributes for screen readers

---

### Step 2: Refactor MeetingRequestsList to Card Grid

**File**: `src/client/src/components/MeetingRequestsList.jsx`

**Goal**: Replace table with responsive card grid and add drawer state

**Step 2a: Add imports and state**

**Current imports**:
```jsx
import React from 'react'
```

**New imports**:
```jsx
import React, { useState } from 'react'
import Drawer from './Drawer'
```

**Add state** (after existing useState hooks):
```jsx
const [selectedItem, setSelectedItem] = React.useState(null)
```

---

**Step 2b: Replace table with card grid**

**Current table rendering** (delete this):
```jsx
<div className="overflow-x-auto">
  <table className="min-w-full bg-white shadow-sm rounded">
    <thead>
      <tr className="text-left border-b">
        <th className="px-4 py-2">Reference</th>
        <th className="px-4 py-2">Requestor</th>
        <th className="px-4 py-2">Request type</th>
        <th className="px-4 py-2">Country</th>
        <th className="px-4 py-2">Meeting title</th>
        <th className="px-4 py-2">Board date</th>
      </tr>
    </thead>
    <tbody>
      {filteredItems.map((it) => (
        <tr key={it.id} className="border-b hover:bg-gray-50" data-testid="meeting-request-item">
          <td className="px-4 py-2" data-testid="reference-number">{it.referenceNumber ?? it.ReferenceNumber ?? '—'}</td>
          <td className="px-4 py-2">{it.requestorName ?? it.requestor ?? '—'}</td>
          <td className="px-4 py-2">{it.requestType ?? it.type ?? '—'}</td>
          <td className="px-4 py-2">{it.country ?? '—'}</td>
          <td className="px-4 py-2">{it.title ?? it.meetingTitle ?? '—'}</td>
          <td className="px-4 py-2">{formatDate(it.meetingDate ?? it.boardDate ?? it.MeetingDate)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**New card grid rendering**:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredItems.map((item) => (
    <div
      key={item.id}
      onClick={() => setSelectedItem(item.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item.id) }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.title ?? item.meetingTitle ?? 'meeting request'}`}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6"
      data-testid="meeting-request-card"
    >
      {/* Title - prominent at top */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {item.title ?? item.meetingTitle ?? 'Untitled'}
      </h3>
      
      {/* Reference number - secondary */}
      <div className="mb-4">
        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
          {item.referenceNumber ?? item.ReferenceNumber ?? 'No reference'}
        </span>
      </div>
      
      {/* 2x2 grid for metadata */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-gray-600">Requestor</div>
          <div className="text-gray-900 font-medium">
            {item.requestorName ?? item.requestor ?? '—'}
          </div>
        </div>
        
        <div>
          <div className="text-gray-600">Type</div>
          <div className="text-gray-900 font-medium">
            {item.requestType ?? item.type ?? '—'}
          </div>
        </div>
        
        <div>
          <div className="text-gray-600">Country</div>
          <div className="text-gray-900 font-medium">
            {item.country ?? '—'}
          </div>
        </div>
        
        <div>
          <div className="text-gray-600">Board Date</div>
          <div className="text-gray-900 font-medium">
            {formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

**Step 2c: Add drawer with detail view**

**Add after card grid** (before closing </div> of main container):
```jsx
{/* Drawer for detail view */}
<Drawer 
  isOpen={selectedItem !== null}
  onClose={() => setSelectedItem(null)}
>
  {selectedItem && (() => {
    const item = filteredItems.find(it => it.id === selectedItem)
    if (!item) return <div>Item not found</div>
    
    return (
      <div>
        <h2 id="drawer-title" className="text-2xl font-bold text-gray-900 mb-6">
          {item.title ?? item.meetingTitle ?? 'Meeting Request Details'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Reference Number</div>
            <div className="mt-1 text-lg text-gray-900">{item.referenceNumber ?? item.ReferenceNumber ?? '—'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Requestor</div>
            <div className="mt-1 text-lg text-gray-900">{item.requestorName ?? item.requestor ?? '—'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Request Type</div>
            <div className="mt-1 text-lg text-gray-900">{item.requestType ?? item.type ?? '—'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Country</div>
            <div className="mt-1 text-lg text-gray-900">{item.country ?? '—'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Board Date</div>
            <div className="mt-1 text-lg text-gray-900">{formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}</div>
          </div>
        </div>
      </div>
    )
  })()}
</Drawer>
```

---

### Step 3: Visual Verification

**Start development server** (if not already running):
```powershell
# Terminal 1 - Frontend
cd src\client
npm run dev
```

**Test Checklist**:

**Desktop (≥1024px)**:
1. ✅ Open browser to http://localhost:5173
2. ✅ Login (if not already authenticated)
3. ✅ Verify 3-column card grid displays
4. ✅ Verify cards show: title (large), reference (badge), 2x2 grid (requestor/type, country/date)
5. ✅ Hover over card - verify shadow increases (elevation effect)
6. ✅ Click a card - verify drawer slides in from right
7. ✅ Verify drawer shows all 6 fields with labels
8. ✅ Verify drawer is ~40% width, list visible in background
9. ✅ Click backdrop (dark area) - drawer closes
10. ✅ Open drawer again, press Escape key - drawer closes
11. ✅ Click close button (X) - drawer closes

**Tablet (768-1023px)**:
1. ✅ Resize browser to tablet width (use DevTools device toolbar)
2. ✅ Verify 2-column card grid displays
3. ✅ Click card - verify drawer is ~50% width
4. ✅ Verify drawer functions (close button, backdrop, Escape)

**Mobile (<768px)**:
1. ✅ Resize browser to mobile width (320px-767px)
2. ✅ Verify single-column card list displays
3. ✅ Cards should be readable without horizontal scroll
4. ✅ Click card - verify drawer is full-width
5. ✅ Verify drawer covers entire screen

**Search Filtering**:
1. ✅ Enter search term in search bar (if available)
2. ✅ Verify cards filter correctly
3. ✅ If drawer is open when search filters it out, drawer should close

**Keyboard Navigation**:
1. ✅ Press Tab key repeatedly
2. ✅ Verify focus moves through cards (visible outline)
3. ✅ Press Enter on focused card - drawer opens
4. ✅ Press Escape - drawer closes
5. ✅ Verify focus returns to list after drawer closes

---

### Step 4: Update E2E Tests (if needed)

**File**: `src/client/e2e/tests/*.spec.ts` (if tests exist for meeting requests)

**Current selectors**:
```javascript
await page.locator('[data-testid="meeting-request-item"]').first().click()
```

**New selectors**:
```javascript
// Update table row selector to card selector
await page.locator('[data-testid="meeting-request-card"]').first().click()

// Add drawer verification
await expect(page.locator('[role="dialog"]')).toBeVisible()

// Test close button
await page.locator('[aria-label="Close details"]').click()
await expect(page.locator('[role="dialog"]')).not.toBeVisible()
```

**Run tests**:
```powershell
cd src\client
npm run e2e
```

---

### Step 5: Accessibility Testing

**Keyboard Navigation**:
1. ✅ Press Tab key repeatedly from top of page
2. ✅ Verify focus moves through: header → nav → search → cards → footer
3. ✅ Verify focus indicator visible on cards (outline or ring)
4. ✅ Press Enter on card - drawer opens
5. ✅ Verify focus moves into drawer
6. ✅ Press Escape - drawer closes
7. ✅ Verify focus returns to list (ideally to card that was clicked)

**Screen Reader** (optional, if available):
1. ✅ Enable screen reader (NVDA on Windows, VoiceOver on Mac)
2. ✅ Navigate through cards
3. ✅ Verify cards are announced as buttons
4. ✅ Verify drawer is announced as dialog
5. ✅ Verify close button is announced

---

### Step 6: Commit Changes

```powershell
git add src\client\src\components\Drawer.jsx
git add src\client\src\components\MeetingRequestsList.jsx
git add src\client\e2e\tests\*.spec.ts  # if tests were updated

git commit -m "feat(005-listview-drawer): Implement responsive card grid with drawer

- Created Drawer component with slide animation and backdrop
- Refactored MeetingRequestsList from table to responsive card grid
  * 3 columns on desktop (≥1024px)
  * 2 columns on tablet (768-1023px)
  * 1 column on mobile (<768px)
- Card layout: title prominent, reference badge, 2x2 metadata grid
- Elevation hover effect (shadow increase)
- Drawer shows read-only details with clear labels
- Responsive drawer width: full-screen mobile, 40-50% desktop
- Keyboard accessible: Tab, Enter, Escape
- ARIA attributes for screen readers
- Updated E2E test selectors from table rows to cards

Resolves: #005-listview-drawer
Success Criteria: SC-001 through SC-010 met"
```

---

## Common Issues & Troubleshooting

### Issue: Cards not displaying in grid

**Symptom**: Cards stack vertically on desktop

**Solution**:
- Verify parent div has `grid` class
- Check Tailwind config includes responsive breakpoints
- Inspect with DevTools: `grid-template-columns` should be `repeat(3, minmax(0, 1fr))` on desktop

### Issue: Drawer doesn't slide in

**Symptom**: Drawer appears instantly without animation

**Solution**:
- Verify `transition-transform duration-300 ease-in-out` classes on drawer
- Check that drawer has `transform` class
- Ensure Tailwind JIT mode is enabled (default in Vite)

### Issue: Clicking backdrop doesn't close drawer

**Symptom**: Must use close button to close

**Solution**:
- Verify `onClick={onClose}` on backdrop div
- Check z-index: backdrop should be `z-40`, drawer `z-50`
- Ensure backdrop covers full viewport: `fixed inset-0`

### Issue: Drawer doesn't close on Escape

**Symptom**: Escape key has no effect

**Solution**:
- Verify useEffect hook is present in Drawer component
- Check event listener: `e.key === 'Escape'`
- Ensure useEffect cleanup removes listener

### Issue: Cards show horizontal scrollbar on mobile

**Symptom**: Page wider than viewport on mobile

**Solution**:
- Verify no fixed widths on cards or parent containers
- Check padding: use `p-4` or `p-6` instead of fixed pixel values
- Inspect with DevTools: cards should be 100% width minus padding

### Issue: E2E tests fail

**Symptom**: Tests can't find meeting request items

**Solution**:
- Update selectors from `[data-testid="meeting-request-item"]` to `[data-testid="meeting-request-card"]`
- Use semantic selectors: `[role="button"]`, `[role="dialog"]`
- Add waits for drawer animation: `await page.waitForTimeout(300)`

---

## Performance Benchmarks

Expected metrics (should match or improve current performance):

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load time | <2 seconds | Same as table (no new network requests) |
| Card render time | <100ms | Faster than table (simpler DOM) |
| Drawer open animation | 300ms | Smooth slide-in transition |
| Hover response | <16ms | GPU-accelerated shadow transition |

**No performance testing required** - this is a UI-only change with same data fetching.

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
1. Delete `Drawer.jsx`
2. Restore MeetingRequestsList.jsx from backup or git history
3. Restore test file selectors if changed
4. Commit and push

---

## Next Steps

After implementation complete:

1. **Visual QA**: Verify layout on desktop, tablet, mobile
2. **Accessibility Audit**: Test keyboard navigation and screen reader
3. **Cross-Browser Testing**: Test in Chrome, Firefox, Safari, Edge
4. **Code Review**: Have team member review changes
5. **Deploy to staging**: Test in staging environment
6. **Deploy to production**: Monitor for layout issues

---

## Success Criteria Verification

After deployment, verify:

- **SC-001**: ✅ List view renders as responsive cards on all screen sizes without horizontal scrolling
- **SC-002**: ✅ All list items have consistent modern styling (shadows, spacing, hover effects)
- **SC-003**: ✅ Drawer opens within 300ms of clicking a list item
- **SC-004**: ✅ Drawer displays all 6 meeting request fields with proper formatting
- **SC-005**: ✅ Users can close drawer using close button, outside click, or Escape key
- **SC-006**: ✅ Drawer takes full width on mobile and 40-50% width on desktop
- **SC-007**: ✅ Search filtering continues to work with new card layout
- **SC-008**: ✅ Page load performance remains under 2 seconds
- **SC-009**: ✅ Keyboard navigation works for all interactive elements
- **SC-010**: ✅ Zero breaking changes - all existing functionality works

---

**Total Implementation Time**: 60-90 minutes  
**Complexity**: Medium (component refactor + new component)  
**Risk Level**: Low (UI-only, easily reversible, no data changes)  

**Questions?** Refer to research.md for component patterns or data-model.md for state management details.
