# Research: Modern Responsive Listview with Drawer

**Feature**: 005-listview-drawer  
**Date**: February 11, 2026  
**Phase**: 0 (Pre-implementation Research)

## Overview

This document captures research findings for converting MeetingRequestsList from table-based layout to modern responsive card grid with drawer-based detail view.

## Decision: Card Grid + Drawer Component Pattern

### Rationale

1. **Responsive Grid with Tailwind**
   - Use Tailwind's responsive grid utilities for column layout
   - `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` provides mobile-first responsiveness
   - No custom CSS needed, maintains constraint of Tailwind-only styling
   - Gap utilities (`gap-4`, `gap-6`) provide consistent spacing

2. **Separate Drawer Component**
   - Drawer.jsx as reusable component accepting `isOpen`, `onClose`, `children` props
   - Fixed positioning with right-side origin: `fixed right-0 top-0 h-full`
   - Transform-based animation: `translate-x-full` (hidden) → `translate-x-0` (visible)
   - Responsive width: `w-full md:w-1/2 lg:w-2/5` (full mobile, 50% tablet, 40% desktop)
   - Z-index layering: backdrop (`z-40`), drawer (`z-50`)

3. **Card Content Structure**
   - Title prominent: `text-lg font-semibold` with `line-clamp-2` for overflow
   - Reference badge: Smaller text with subtle background (`bg-gray-100`)
   - 2x2 Grid for metadata: `grid grid-cols-2 gap-x-4 gap-y-2`
   - Labels/values: `text-sm text-gray-600` for labels, `text-gray-900` for values

4. **State Management**
   - `selectedItem` state in MeetingRequestsList tracks which item drawer shows
   - `null` = drawer closed, `itemId` = drawer open with that item
   - Clicking card sets `selectedItem` to item.id
   - Clicking backdrop or close button sets `selectedItem` to null
   - Escape key handler: `useEffect` with keydown listener

### Alternatives Considered

#### Option 1: Modal Instead of Drawer (Rejected)
- **Why considered**: Simpler component pattern, centered overlay
- **Why rejected**: 
  - Modals block entire viewport, drawer pattern shows list in background (better UX)
  - Drawer sliding from right is standard pattern for detail views
  - Drawer feels more lightweight for list detail viewing

#### Option 2: Expand Cards In-Place (Rejected)
- **Why considered**: No overlay needed, simpler state management
- **Why rejected**:
  - Disrupts grid layout when card expands
  - Harder to show all detail fields without massive card height
  - Less mobile-friendly (expanded card would be very tall)

#### Option 3: Separate Route for Detail View (Rejected)
- **Why considered**: Explicit URL, bookmarkable, browser back button works
- **Why rejected**:
  - Spec explicitly requests drawer pattern (no navigation)
  - Requires routing changes (added complexity)
  - Loses list context (user requirement to see list in background)

#### Option 4: Keep Table, Add Drawer (Rejected)
- **Why considered**: Smaller change, table already works
- **Why rejected**:
  - Doesn't address mobile responsiveness issue (tables require horizontal scroll)
  - Doesn't modernize visual design (spec requirement for modern styling)
  - User Story 1 explicitly requires card-based layout

## React Component Pattern

### MeetingRequestsList Structure

**Current** (table):
```jsx
<div className="p-4">
  <table>
    <thead>...</thead>
    <tbody>
      {items.map(item => <tr key={item.id}>...</tr>)}
    </tbody>
  </table>
</div>
```

**New** (card grid + drawer):
```jsx
const [selectedItem, setSelectedItem] = useState(null)
const selectedItemData = items.find(it => it.id === selectedItem)

return (
  <div className="p-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <div 
          key={item.id}
          onClick={() => setSelectedItem(item.id)}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4"
        >
          {/* Card content: title, reference, 2x2 grid */}
        </div>
      ))}
    </div>
    
    <Drawer 
      isOpen={selectedItem !== null}
      onClose={() => setSelectedItem(null)}
    >
      {selectedItemData && <DrawerContent item={selectedItemData} />}
    </Drawer>
  </div>
)
```

### Drawer Component Pattern

```jsx
export default function Drawer({ isOpen, onClose, children }) {
  // Escape key handler
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
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
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="p-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            {/* X icon SVG */}
          </button>
          {children}
        </div>
      </div>
    </>
  )
}
```

## Tailwind CSS Approach

### Responsive Grid Classes

**Desktop (≥1024px)**: `lg:grid-cols-3`  
**Tablet (768-1023px)**: `md:grid-cols-2`  
**Mobile (<768px)**: `grid-cols-1` (default)

**Gap**: `gap-6` (24px between cards)  
**Padding**: `p-4` container, `p-4` or `p-6` card internal padding

### Card Styling

**Base**: `bg-white rounded-lg shadow`  
**Hover**: `hover:shadow-lg transition-shadow` (elevation increase)  
**Interactive**: `cursor-pointer` indicates clickable  
**Transitions**: `transition-shadow duration-300` smooth elevation change

### Drawer Responsive Width

**Mobile**: `w-full` (100% width, full-screen drawer)  
**Tablet**: `md:w-1/2` (50% width)  
**Desktop**: `lg:w-2/5` (40% width)

### Animation Classes

**Transform**: `transform transition-transform duration-300 ease-in-out`  
**Hidden state**: `translate-x-full` (off-screen right)  
**Visible state**: `translate-x-0` (on-screen)  
**Backdrop**: `transition-opacity` for smooth fade-in/out

## Accessibility Considerations

### Keyboard Navigation

- **Tab**: Focus should move through cards in DOM order
- **Enter**: Clicking focused card opens drawer (add `onKeyDown` handler)
- **Escape**: Closes drawer (implemented in useEffect)
- **Focus trap**: When drawer opens, focus should move to drawer content
- **Focus restoration**: When drawer closes, return focus to clicked card

### ARIA Attributes

**Card**:
```jsx
<div 
  role="button"
  tabIndex={0}
  aria-label={`View details for ${item.title}`}
  onClick={...}
  onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
>
```

**Drawer**:
```jsx
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="drawer-title"
>
```

**Backdrop**:
```jsx
<div 
  aria-hidden="true"
  onClick={onClose}
>
```

### Screen Reader Considerations

- Card title should be `<h3>` for semantic structure
- Drawer title should be `<h2 id="drawer-title">` for dialog labeling
- Close button should have `aria-label="Close details"`

## Performance Considerations

### Card Rendering

- **Grid layout**: CSS Grid is GPU-accelerated, efficient for responsive layouts
- **Card count**: Current implementation loads all items at once (no pagination)
- **No performance issue expected**: Typical meeting request list <100 items
- **Future optimization**: If list grows >500 items, consider virtualization

### Drawer Animation

- **Transform-based**: `translate-x` uses GPU acceleration (better than left/right position)
- **Duration**: 300ms is perceptually instant while still smooth
- **Conditional rendering**: Drawer only renders when `isOpen || isClosing`
- **Event delegation**: Single click handler on backdrop, not per-card

### State Management

- **No prop drilling**: `selectedItem` state stays in MeetingRequestsList
- **Minimal re-renders**: Only MeetingRequestsList re-renders when selection changes
- **Drawer content memoization**: Can wrap DrawerContent in React.memo if needed
- **Search filtering**: Existing `matchesSearch` function reused, no performance change

## Browser Compatibility

### CSS Features Required

- **CSS Grid**: Supported IE11+ (all modern browsers)
- **Transforms**: Supported IE9+ (all modern browsers)
- **Transitions**: Supported IE10+ (all modern browsers)
- **Flexbox** (for card internal layout): Supported IE11+ (all modern browsers)

**Assessment**: No compatibility issues. All CSS features are universally supported in target browsers (Chrome, Firefox, Safari, Edge).

### JavaScript Features

- **React hooks** (useState, useEffect): Requires React 16.8+, project uses 18.2.0 ✅
- **Array methods** (map, filter, find): ES5, universally supported ✅
- **Arrow functions**: ES6, target browsers all support ✅

## Testing Strategy

### Manual Visual Testing

- **Responsive**: Test at 320px (mobile), 768px (tablet breakpoint), 1024px (desktop breakpoint), 1920px (large desktop)
- **Hover states**: Verify elevation increase on card hover
- **Drawer animation**: Smooth slide-in from right, no jank
- **Backdrop**: Clicking outside drawer closes it
- **Keyboard**: Tab, Enter, Escape all work as expected

### E2E Test Updates

**Current test selectors**: `data-testid="meeting-request-item"` on `<tr>` elements

**New test selectors**: Update to target cards instead of rows
```javascript
// Before
await page.locator('[data-testid="meeting-request-item"]').first().click()

// After
await page.locator('[data-testid="meeting-request-card"]').first().click()
await expect(page.locator('[role="dialog"]')).toBeVisible()
```

### Accessibility Testing

- **Keyboard navigation**: Tab through all cards, Enter to open, Escape to close
- **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- **Focus management**: Verify focus moves correctly and is visible

## Migration Path

### Implementation Phases

**Phase 1**: Convert table to card grid (keep existing data)
- Replace `<table>` with `<div className="grid...">`
- Create card layout within map function
- Test responsive behavior

**Phase 2**: Add drawer component and state
- Create Drawer.jsx component
- Add `selectedItem` state to MeetingRequestsList
- Wire up onClick handlers and drawer open/close

**Phase 3**: Polish and accessibility
- Add keyboard handlers
- Add ARIA attributes
- Update E2E tests
- Visual QA on all breakpoints

### Rollback Plan

If issues arise:
1. Revert MeetingRequestsList.jsx to previous table version
2. Delete Drawer.jsx (not used elsewhere)
3. Redeploy (< 5 minutes)

**Low risk**: No data changes, no API changes, easily reversible

## Open Questions

None. All clarifications resolved:
- Desktop column count: 3 columns
- Drawer content: Read-only view of same 6 fields
- Card layout: Title/reference header + 2x2 grid
- Hover effect: Elevation (shadow increase) only

## Dependencies

### Existing Dependencies (No Changes)

- `react@^18.2.0` - Component framework
- `react-dom@^18.2.0` - DOM rendering
- `tailwindcss@^3.4.8` - Styling utilities
- `vite@^5.0.0` - Build tool

### No New Dependencies Required

All functionality achievable with existing libraries. CSS transitions only (no animation library needed).

## References

- [Tailwind CSS Grid Layout](https://tailwindcss.com/docs/grid-template-columns)
- [Tailwind CSS Transitions](https://tailwindcss.com/docs/transition-property)
- [React useState Hook](https://react.dev/reference/react/useState)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [CSS Transform Performance](https://web.dev/animations-guide/)

## Approval

Research findings confirm that responsive card grid + drawer pattern is the optimal solution. Ready to proceed to Phase 1 (Design).
