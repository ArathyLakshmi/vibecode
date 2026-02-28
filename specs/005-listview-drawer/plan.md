# Implementation Plan: Modern Responsive Listview with Drawer

**Branch**: `005-listview-drawer` | **Date**: February 11, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-listview-drawer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform the existing table-based MeetingRequestsList component into a modern responsive card layout with drawer-based detail view. Cards will display in a 3-column grid on desktop (≥1024px), 2-column on tablet (768-1023px), and single column on mobile (<768px). Clicking a card opens a slide-out drawer from the right showing read-only details. Implementation uses existing data (no API changes), Tailwind CSS for styling, and React state management for drawer visibility.

## Technical Context

**Language/Version**: JavaScript (ES6+), React 18.2.0  
**Primary Dependencies**: react-router-dom 6.11.2, Tailwind CSS 3.4.8, Vite 5.0 (existing dependencies)  
**Storage**: None (UI-only change, uses existing API endpoint /api/meetingrequests)  
**Testing**: Playwright 1.40.0 (E2E), existing tests should continue passing with selector updates  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), responsive design for desktop/tablet/mobile  
**Project Type**: Web application (React SPA frontend)  
**Performance Goals**: Page load <2 seconds, drawer open animation <300ms, no performance degradation from current table view  
**Constraints**: Must use only Tailwind utility classes (no custom CSS), maintain existing responsive breakpoints (mobile <768px, desktop ≥768px), WCAG 2.1 Level AA accessibility, keyboard navigation support  
**Scale/Scope**: Single component refactor (MeetingRequestsList.jsx ~135 lines → card layout + new Drawer component ~200-250 lines total), affects all users viewing meeting requests list

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First Approach**: ✅ PASS  
- Will verify existing E2E tests continue to pass with new card layout
- Manual visual testing will validate responsive behavior and drawer functionality
- No new business logic requiring unit tests (UI restructuring only)

**Minimal Changes**: ✅ PASS  
- One component refactored (MeetingRequestsList.jsx from table to cards)
- One new component created (Drawer.jsx for details view, ~80-100 lines)
- No backend changes, no API changes, no data model changes
- No new dependencies required (uses existing React, Tailwind)

**No Breaking Changes**: ✅ PASS  
- Data fetching unchanged (same API endpoint, same response handling)
- Search filtering preserved (matchesSearch function reused)
- All existing props and component interfaces maintained
- Backward compatible: can deploy/rollback independently

**Performance Impact**: ✅ PASS  
- Zero performance degradation: same component count, same data fetching
- Card rendering potentially faster than table (simpler DOM structure)
- CSS transitions for drawer use GPU acceleration (transform-based)
- No additional network requests (drawer uses existing data)

**Security**: ✅ PASS  
- No security implications (UI layout only)
- No new data exposure (shows same fields as current table)
- No authentication/authorization changes
- No new attack vectors introduced

## Project Structure

### Documentation (this feature)

```text
specs/005-listview-drawer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
my-project-today/
├── src/
│   └── client/
│       ├── src/
│       │   ├── components/
│       │   │   ├── MeetingRequestsList.jsx  # **MODIFY**: Convert table to responsive card grid
│       │   │   ├── Drawer.jsx               # **CREATE**: New slide-out drawer component
│       │   │   ├── MeetingRequestCard.jsx   # **CREATE** (optional): Individual card component
│       │   │   ├── MeetingRequestForm.jsx   # No changes
│       │   │   └── Login.jsx                # No changes
│       │   ├── App.jsx                      # No changes (uses MeetingRequestsList)
│       │   └── index.css                    # No changes (Tailwind only)
│       ├── package.json                     # No changes (dependencies exist)
│       └── e2e/
│           └── tests/
│               └── meetings.spec.ts         # **POTENTIALLY MODIFY**: Update selectors if needed
└── specs/
    └── 005-listview-drawer/                 # This feature documentation
```

**Structure Decision**: Web application structure with React frontend. Changes isolated to MeetingRequestsList.jsx (refactor table → cards) and new Drawer.jsx component. Optional MeetingRequestCard.jsx for cleaner separation. E2E tests may need selector updates to target cards instead of table rows.

## Complexity Tracking

N/A - All constitution checks pass. This is a focused UI refactoring with no added complexity.

---

## Post-Design Constitution Re-Check

*GATE: Re-evaluate after Phase 1 design (data-model.md, contracts/, quickstart.md created)*

**Context**: Phase 1 design complete. Three planning documents created:
- `research.md`: Component patterns analysis, card grid + drawer pattern selected
- `data-model.md`: No data model changes, new selectedItem UI state only
- `contracts/README.md`: No API contract changes, 100% backward compatible
- `quickstart.md`: Step-by-step implementation guide with code examples

**Test-First Approach**: ✅ PASS (re-confirmed)  
- Existing E2E tests validate behavior (need selector updates: `tr` → `card`)
- Manual responsive testing checklist defined in quickstart.md (4 breakpoints)
- Keyboard navigation testing checklist defined (Tab, Enter, Escape)
- Accessibility testing checklist defined (screen reader verification)
- No new business logic requiring unit tests (still UI restructuring)

**Minimal Changes**: ✅ PASS (re-confirmed)  
- Still one component refactored (MeetingRequestsList.jsx)
- Still one new component (Drawer.jsx)
- Design confirmed no additional components needed
- Final estimate: ~200-250 lines total (within original estimate)
- Zero backend changes, zero API changes, zero data model changes

**No Breaking Changes**: ✅ PASS (re-confirmed)  
- contracts/README.md explicitly verifies: 11 contract validation checkpoints all pass
- data-model.md explicitly verifies: No changes to existing state (items, loading, error, count)
- quickstart.md implementation preserves: matchesSearch function, formatDate function, existing props (searchTerm, isSearching)
- 100% backward compatible deployment confirmed

**Performance Impact**: ✅ PASS (re-confirmed)  
- research.md confirms: GPU-accelerated transforms for drawer animation
- research.md confirms: No virtualization needed (<100 items typical)
- quickstart.md defines: Expected page load <2s (same as current), drawer animation 300ms
- Card rendering potentially faster (simpler DOM vs table with thead/tbody/6 columns)

**Security**: ✅ PASS (re-confirmed)  
- contracts/README.md confirms: No auth changes, no new endpoints, no data exposure changes
- data-model.md confirms: UI-only state change (selectedItem for drawer visibility)
- quickstart.md implementation shows: Same data displayed in drawer as in cards (no additional fields exposed)
- Zero security implications (pure UI transformation)

**RESULT**: All 5 gates PASS after Phase 1 design. Design decisions maintain original assessment. Ready for Phase 2 task generation.

**Design Risk Assessment**: Low
- Well-established pattern (card grid + drawer)
- No new dependencies required
- Easily reversible (git revert or manual rollback ~5 minutes)
- Independent deployment (no backend coordination)
