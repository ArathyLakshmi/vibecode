# Implementation Plan: Navigation Below Header

**Branch**: `004-nav-below-header` | **Date**: February 11, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-nav-below-header/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Move primary navigation (Home, Dashboard, Meetings, Settings) from its current position within the Header component to a dedicated horizontal row below the header. The navigation will be extracted from Header.jsx and moved to AppShell.jsx as a sibling element, with visual distinction provided by a different background color (no gap between rows). Mobile hamburger menu stays in header with dropdown appearing below both header and nav rows.

## Technical Context

**Language/Version**: JavaScript (ES6+), React 18.2.0  
**Primary Dependencies**: react-router-dom 6.11.2, @azure/msal-react 3.0.25, Vite 5.0, Tailwind CSS 3.4.8  
**Storage**: None (UI layout change only, no data persistence)  
**Testing**: Playwright 1.40.0 (E2E), existing shell.spec.ts covers navigation accessibility  
**Target Platform**: Web browsers (desktop + mobile), responsive design required  
**Project Type**: Web application (React SPA frontend with Vite build)  
**Performance Goals**: No degradation from current performance, page load <1 second  
**Constraints**: Zero-gap layout (rows touch), background color distinction only, no border between rows, hamburger menu stays in header on mobile  
**Scale/Scope**: Single component restructuring (AppShell.jsx, Header.jsx), affects all authenticated pages, ~2 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First Approach**: ✅ PASS
- Will verify existing E2E tests for shell navigation (shell.spec.ts)
- Since this is layout-only change with no behavioral changes, existing tests should continue to pass
- Manual visual testing will validate layout changes

**Minimal Changes**: ✅ PASS  
- Only 2 files modified: AppShell.jsx (move TopNav to sibling of Header), Header.jsx (remove TopNav from within header)
- TopNav.jsx itself unchanged (just repositioned in DOM)
- No new dependencies required
- No new components created

**No Breaking Changes**: ✅ PASS
- Navigation functionality unchanged (same links, same behavior)
- Backward compatible (users see same navigation, just repositioned)
- No API changes, no prop interface changes
- Can deploy/rollback independently

**Performance Impact**: ✅ PASS
- Zero performance impact (simple DOM restructuring)
- No additional network calls
- No additional re-renders (same components, different position)
- Style changes use existing Tailwind classes

**Security**: ✅ PASS
- No security implications (UI layout only)
- Maintains same auth patterns (nav only shows when authenticated)
- No new data exposure
- No new attack vectors

## Project Structure

### Documentation (this feature)

```text
specs/004-nav-below-header/
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
│   ├── client/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── shell/
│   │   │   │       ├── AppShell.jsx    # **MODIFY**: Move TopNav here as sibling of Header
│   │   │   │       ├── Header.jsx      # **MODIFY**: Remove TopNav from within header
│   │   │   │       ├── TopNav.jsx      # No changes (just repositioned)
│   │   │   │       ├── SearchBar.jsx   # No changes
│   │   │   │       └── Footer.jsx      # No changes
│   │   │   ├── App.jsx                 # No changes (uses AppShell)
│   │   │   └── auth/                   # No changes
│   │   └── e2e/
│   │       └── tests/
│   │           └── shell.spec.ts       # **VERIFY**: Ensure tests still pass
│   └── server/                          # .NET backend (no changes)
└── specs/
    └── 004-nav-below-header/           # This feature documentation
```

**Structure Decision**: Web application structure with React frontend + .NET backend. Changes isolated to AppShell.jsx and Header.jsx components in the shell directory. TopNav component moves from being a child of Header to a sibling rendered directly in AppShell. This creates the two-row layout: Header row (logo, search, account) followed by Nav row (navigation links), both spanning full container width.

## Complexity Tracking

N/A - All constitution checks pass. This is a minimal, focused UI layout change with no added complexity.

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 (Design) complete*

**Test-First Approach**: ✅ STILL PASSING
- Design confirms existing E2E tests continue to work (navigation functionality unchanged)
- Manual visual testing strategy defined in quickstart.md
- No new tests required (layout-only change)

**Minimal Changes**: ✅ STILL PASSING  
- Design confirms: Only 2 files modified (AppShell.jsx, Header.jsx)
- TopNav.jsx updated for styling only (wrapper div + auth check)
- No new components created
- No new dependencies required (using existing React, Tailwind, MSAL)

**No Breaking Changes**: ✅ STILL PASSING
- No API contract changes (see contracts/README.md)
- No component prop interface changes (see data-model.md)
- Backward compatible (can deploy/rollback independently)
- Navigation functionality preserved

**Performance Impact**: ✅ STILL PASSING
- Design confirms zero performance impact (see research.md)
- Same component count, same rendering cost
- No additional network calls
- Simple DOM restructuring only

**Security**: ✅ STILL PASSING
- Enhanced: Auth check added to TopNav (explicit null return when not authenticated)
- Maintains same security posture (same auth patterns)
- No new data exposure
- No new attack vectors

**Overall**: ✅ **ALL GATES STILL PASS** - Design confirms minimal, non-breaking implementation. Ready for Phase 2 (Tasks).
