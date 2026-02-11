# Implementation Tasks: Navigation Below Header

**Feature**: 004-nav-below-header  
**Branch**: `004-nav-below-header`  
**Date**: February 11, 2026  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

Move primary navigation (TopNav component) from within Header component to a dedicated row below the header in AppShell. This is a simple component restructuring with visual distinction via background color (bg-gray-100). Zero-gap layout, mobile hamburger stays in header, dropdown appears below both rows.

**Implementation Strategy**: Direct implementation - no tests to write first (existing E2E tests should continue passing). Manual visual testing validates layout changes.

---

## Phase 1: Setup & Prerequisites

**Goal**: Verify development environment and existing component structure before making changes.

### Tasks

- [ ] T001 Verify Node.js, npm, and Vite dev server are functional for src/client
- [ ] T002 Verify existing AppShell.jsx, Header.jsx, and TopNav.jsx components are accessible in src/client/src/components/shell/
- [ ] T003 Verify branch 004-nav-below-header is checked out and up to date with main
- [ ] T004 Review existing TopNav component to understand current structure (mobile menu state, links array, responsive behavior)

**Completion Criteria**: All dependencies ready, components accessible, branch active, TopNav structure understood.

---

## Phase 2: Foundational - Component Analysis

**Goal**: Document current component hierarchy and identify exact changes needed.

### Tasks

- [ ] T005 Document current component tree: AppShell → Header → TopNav structure
- [ ] T006 Verify TopNav has no props (self-contained component)
- [ ] T007 Verify TopNav mobile menu uses absolute positioning (will work after move)

**Completion Criteria**: Current structure documented, confirmed TopNav can move without breaking functionality.

---

## Phase 3: User Story 1 (P1) - Dedicated Navigation Bar

**User Story**: When users access the application, they see the primary navigation (Home, Dashboard, Meetings, Settings) displayed in its own horizontal row directly below the header, making navigation options more prominent and accessible.

**Independent Test Criteria**: 
- Load any authenticated page → navigation appears in separate row below header
- Desktop: horizontal links visible in gray row
- Mobile: hamburger functional, dropdown appears below both rows
- Navigation links work (routing unchanged)
- Unauthenticated: no navigation row visible

### Step 1: Modify AppShell Component

- [ ] T008 [P] [US1] Add TopNav import to AppShell.jsx: import TopNav from './TopNav'
- [ ] T009 [US1] Add TopNav component as sibling after Header in AppShell.jsx JSX (between Header and main elements)

**Step Completion**: AppShell renders TopNav separately from Header.

### Step 2: Modify Header Component

- [ ] T010 [P] [US1] Remove TopNav import from Header.jsx
- [ ] T011 [US1] Remove TopNav component from Header.jsx JSX (was between SearchBar and UserAccount)

**Step Completion**: Header no longer renders TopNav internally.

### Step 3: Modify TopNav Component for Styling

- [ ] T012 [US1] Add useIsAuthenticated import to TopNav.jsx from ../../auth/useAuth
- [ ] T013 [US1] Add authentication check in TopNav: const isAuthenticated = useIsAuthenticated()
- [ ] T014 [US1] Add early return in TopNav: if (!isAuthenticated) return null
- [ ] T015 [US1] Wrap TopNav JSX in div with bg-gray-100 and border-b border-gray-200 classes
- [ ] T016 [US1] Update nav element classes: add container mx-auto px-4 py-3, remove flex-1
- [ ] T017 [US1] Update desktop ul classes: remove justify-center (left-align navigation)
- [ ] T018 [US1] Update mobile dropdown: add z-50 class for proper layering
- [ ] T019 [US1] Update mobile button hover: change to hover:bg-gray-200 (since bg-gray-100 is now background)

**Step Completion**: TopNav has distinct background, proper spacing, auth check, and mobile layering.

### Step 4: Visual Validation - Desktop

- [ ] T020 [US1] Start dev server and navigate to authenticated page
- [ ] T021 [US1] Verify two distinct rows: Header (white, logo/search/account) + Nav (gray, links)
- [ ] T022 [US1] Verify no gap between rows (they touch)
- [ ] T023 [US1] Verify navigation links are horizontal and left-aligned
- [ ] T024 [US1] Click each navigation link (Home, Dashboard, Meetings, Settings) - verify routing works

**Step Completion**: Desktop layout verified, navigation functional.

### Step 5: Visual Validation - Mobile

- [ ] T025 [P] [US1] Resize browser to mobile width (<768px) or use DevTools device emulation
- [ ] T026 [P] [US1] Verify hamburger menu button is visible (in gray nav row)
- [ ] T027 [P] [US1] Click hamburger - verify dropdown appears below both rows (not hidden behind content)
- [ ] T028 [P] [US1] Click navigation link in mobile dropdown - verify routing works

**Step Completion**: Mobile layout verified, hamburger functional.

### Step 6: Visual Validation - Edge Cases

- [ ] T029 [P] [US1] Test responsive transition: resize from desktop to mobile - verify smooth transition
- [ ] T030 [P] [US1] Test unauthenticated state: logout - verify navigation row disappears
- [ ] T031 [P] [US1] Test keyboard navigation: Tab through elements - verify logical order (header elements → nav links → main content)
- [ ] T032 [P] [US1] Test tablet width (768px-1024px) - verify horizontal navigation appears

**Step Completion**: Edge cases validated, responsive behavior confirmed.

**Phase 3 Complete**: User Story 1 fully implemented and validated. Navigation appears in dedicated row below header with all functionality preserved.

---

## Final Phase: Polish & Validation

**Goal**: Ensure code quality, run E2E tests, verify success criteria, and prepare for deployment.

### Tasks

- [ ] T033 [P] Run existing E2E tests (npm run e2e in src/client) - verify shell.spec.ts passes
- [ ] T034 [P] If E2E tests fail: update selectors from 'header nav' to 'nav[aria-label="Primary"]' in test files
- [ ] T035 [P] Review all changes for code quality (remove unused imports, verify consistent formatting)
- [ ] T036 Commit changes with descriptive message following conventional commits format
- [ ] T037 Verify all success criteria met: SC-001 through SC-006 from spec.md
- [ ] T038 Update checklist in specs/004-nav-below-header/checklists/requirements.md as complete

**Completion Criteria**: All tests passing, code committed, success criteria verified, ready for PR/merge.

---

## Dependencies & Execution Order

### Critical Path (Must Complete in Order)

```
Phase 1 (Setup) → Phase 2 (Analysis) → Phase 3 User Story 1:
  T001-T004 → T005-T007 → T008-T009 (AppShell) → T010-T011 (Header) → 
  T012-T019 (TopNav) → T020-T024 (Desktop validation) → T025-T028 (Mobile validation) → 
  T029-T032 (Edge cases) → Final Phase T033-T038
```

### Parallel Execution Opportunities

**After T007 (Analysis Complete)**:
- T008 and T010 can be done in parallel (different files: AppShell.jsx vs Header.jsx)

**After T019 (Implementation Complete)**:
- T020-T024, T025-T028, T029-T032 can be tested in parallel (different scenarios)

**In Final Phase**:
- T033, T034, T035 can be reviewed in parallel (tests, selectors, code quality)

**User Story Dependencies**:
- US1 has no dependencies (only user story)
- US1 is self-contained and independently testable

---

## Task Summary

| Phase | Task Count | Parallelizable | User Story |
|-------|------------|----------------|------------|
| Phase 1: Setup | 4 | 0 | - |
| Phase 2: Foundational | 3 | 0 | - |
| Phase 3: User Story 1 | 25 | 11 | US1 |
| Final Phase: Polish | 6 | 3 | - |
| **Total** | **38** | **14** | **1** |

---

## Implementation Strategy

### MVP Scope
**Phase 3 only** - This feature has one user story (US1), which is the entire MVP scope.

### Incremental Delivery
1. **First deliverable**: Complete Phase 3 Steps 1-3 (component restructuring)
   - Value: Core layout change implemented
   - Testable: Visual inspection of two-row layout
   - Deployable: Yes, functional changes complete

2. **Second deliverable**: Complete Phase 3 Steps 4-6 (validation)
   - Value: Verified across all screen sizes and edge cases
   - Testable: Manual testing complete
   - Deployable: Yes, fully validated

3. **Final deliverable**: Complete Final Phase (polish + E2E verification)
   - Value: Production-ready code with automated test coverage
   - Testable: Full test suite passing
   - Deployable: Ready for PR and merge to main

### Rollback Plan
Simple revert if issues arise:
1. Revert commit with T008-T019 changes (component restructuring)
2. No data migration needed (layout-only change)
3. Redeploy (< 5 minutes total)

---

## Testing Strategy

### Manual Visual Testing
- **T020-T024**: Desktop layout validation (5 checks)
- **T025-T028**: Mobile layout validation (4 checks)
- **T029-T032**: Edge case validation (4 checks)

Expected manual test time: 10-15 minutes

### E2E Tests (Existing)
- **T033**: Run shell.spec.ts - existing tests should pass
- **T034**: Update selectors if needed (conditional)

Expected E2E test run time: < 30 seconds

### Test Coverage Goals
- ✅ 100% of acceptance scenarios from spec.md (5 scenarios)
- ✅ All edge cases from spec.md (5 edge cases)
- ✅ Responsive behavior (desktop, mobile, tablet)
- ✅ Authentication states (authenticated vs not authenticated)

---

## Success Criteria Validation

Track these metrics during implementation to verify success criteria:

| Criterion | Target | Validation Method | Task |
|-----------|--------|-------------------|------|
| SC-001 | 100% of auth pages show nav in separate row | Manual visual check T020-T021 | T037 |
| SC-002 | All 4 links functional at all screen sizes | Click testing T024, T028 | T037 |
| SC-003 | Page load < 1 second | Browser DevTools Performance tab | T037 |
| SC-004 | Mobile hamburger works <768px | Mobile testing T025-T028 | T037 |
| SC-005 | Clear visual hierarchy | Visual inspection T021 | T037 |
| SC-006 | Zero breaking changes | E2E tests pass T033 | T037 |

---

## File Change Summary

| File | Change Type | Tasks | Description |
|------|-------------|-------|-------------|
| src/client/src/components/shell/AppShell.jsx | Modify | T008, T009 | Add TopNav import and render as sibling |
| src/client/src/components/shell/Header.jsx | Modify | T010, T011 | Remove TopNav import and render |
| src/client/src/components/shell/TopNav.jsx | Modify | T012-T019 | Add auth check, wrapper div, styling |
| src/client/e2e/tests/shell.spec.ts | Potentially modify | T034 | Update selectors if tests fail |

**Total files modified**: 3-4  
**Total files created**: 0  
**Backend changes**: 0  
**Database changes**: 0

---

## Time Estimates

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 1: Setup | 3 minutes | 3 min |
| Phase 2: Foundational | 5 minutes | 8 min |
| Phase 3: User Story 1 | 10-15 minutes | 18-23 min |
| Final Phase: Polish | 5-10 minutes | 23-33 min |
| **Total** | **23-33 minutes** | |

Aligns with quickstart.md estimate of 15-20 minutes active implementation time (Steps 1-3), plus 8-13 minutes for validation and polish.

---

## Notes

- **No TDD Required**: Layout-only change with no new behavior, existing tests should pass
- **Single User Story**: All tasks map to P1 User Story 1 - Dedicated Navigation Bar
- **Low Risk**: Minimal changes, easy rollback, no breaking changes to functionality
- **High Value**: Improves navigation visibility and follows web app best practices

Ready to begin implementation. Start with T001 (verify setup).
