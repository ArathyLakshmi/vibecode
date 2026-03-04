# Tasks: Voting Platform Navigation Link

**Feature**: 001-voting-platform-nav  
**Input**: Design documents from `/specs/001-voting-platform-nav/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature includes E2E tests as required by the Test-First constitution principle and success criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with:
- Frontend: `src/client/src/` 
- E2E tests: `src/client/e2e/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (minimal setup needed for this feature)

- [X] T001 Review quickstart.md implementation guide in specs/001-voting-platform-nav/quickstart.md
- [X] T002 Review contracts and test specifications in specs/001-voting-platform-nav/contracts/README.md
- [X] T003 [P] Create pages directory structure src/client/src/pages/ (if not exists)

**Checkpoint**: Project structure ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Verify useRoles() and hasAnyRole() utilities exist in src/client/src/auth/useRoles.js
- [X] T005 Verify MSAL authentication is configured and working with role claims
- [X] T006 Create VotingPlatform placeholder page in src/client/src/pages/VotingPlatform.jsx
- [X] T007 Add /voting-platform route to src/client/src/App.jsx with RequireAuth wrapper
- [X] T008 Verify route navigation works (manual test: navigate to /voting-platform)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Voting Platform from Navigation (Priority: P1) 🎯 MVP

**Goal**: Add "Voting Platform" link to navigation menu visible only to users with "voting" or "admin" roles, enabling authorized users to navigate to the voting platform page.

**Independent Test**: Log in as user with 'voting' or 'admin' role, verify link appears in navigation, click it, verify navigation to /voting-platform page. Log in as user without required roles, verify link is hidden.

### Tests for User Story 1 (Test-First Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Write E2E test "shows link to users with voting role" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T010 [P] [US1] Write E2E test "shows link to users with admin role" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T011 [P] [US1] Write E2E test "hides link from users without required roles" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T012 [P] [US1] Write E2E test "navigates to voting platform when clicked" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T013 [US1] Run E2E tests and verify they FAIL (expected - functionality not implemented yet)

### Implementation for User Story 1

- [X] T014 [US1] Import useRoles and hasAnyRole hooks in src/client/src/components/shell/TopNav.jsx
- [X] T015 [US1] Add requiredRoles property to links array for all existing links in src/client/src/components/shell/TopNav.jsx
- [X] T016 [US1] Add "Voting Platform" link to links array with requiredRoles: ['voting', 'admin'] in src/client/src/components/shell/TopNav.jsx
- [X] T017 [US1] Implement role-based filtering logic using hasAnyRole() in src/client/src/components/shell/TopNav.jsx
- [X] T018 [US1] Update desktop navigation to render filtered links in src/client/src/components/shell/TopNav.jsx
- [X] T019 [US1] Update mobile navigation to render filtered links in src/client/src/components/shell/TopNav.jsx
- [ ] T020 [US1] Run E2E tests and verify they PASS (functionality now implemented)
- [ ] T021 [US1] Manual test: Verify link appears for users with 'voting' role
- [ ] T022 [US1] Manual test: Verify link appears for users with 'admin' role
- [ ] T023 [US1] Manual test: Verify link hidden for users without required roles
- [ ] T024 [US1] Manual test: Verify clicking link navigates to /voting-platform

**Checkpoint**: User Story 1 is fully functional - authorized users can access voting platform via navigation

---

## Phase 4: User Story 2 - Visual Indication of Active Navigation State (Priority: P2)

**Goal**: Display visual active state on "Voting Platform" link when user is on the voting platform page, helping users understand their current location.

**Independent Test**: Navigate to /voting-platform page, verify the "Voting Platform" link shows distinct active styling (underline, bold, color). Navigate to different page, verify link returns to normal state.

### Tests for User Story 2 (Test-First Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T025 [P] [US2] Write E2E test "displays active state on voting platform page" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T026 [P] [US2] Write E2E test "removes active state when navigating away" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T027 [US2] Run E2E tests for User Story 2 and verify they FAIL

### Implementation for User Story 2

- [X] T028 [US2] Import useLocation hook from react-router-dom in src/client/src/components/shell/TopNav.jsx
- [X] T029 [US2] Create isActive() helper function to compare current path with link href in src/client/src/components/shell/TopNav.jsx
- [X] T030 [US2] Add conditional className logic for active state in desktop navigation links in src/client/src/components/shell/TopNav.jsx
- [X] T031 [US2] Add conditional className logic for active state in mobile navigation links in src/client/src/components/shell/TopNav.jsx
- [X] T032 [US2] Add aria-current="page" attribute for active links in src/client/src/components/shell/TopNav.jsx
- [ ] T033 [US2] Run E2E tests for User Story 2 and verify they PASS
- [ ] T034 [US2] Manual test: Navigate to /voting-platform and verify active state styling appears
- [ ] T035 [US2] Manual test: Navigate to different page and verify active state is removed

**Checkpoint**: User Stories 1 AND 2 are both functional - users can access voting platform and see active state indication

---

## Phase 5: User Story 3 - Consistent Navigation Across Devices (Priority: P3)

**Goal**: Ensure "Voting Platform" link is accessible and functional on mobile devices (< 768px width) through the hamburger menu with same permission-based visibility.

**Independent Test**: Resize browser to mobile width, open hamburger menu, verify "Voting Platform" link appears for authorized users, click it, verify navigation works.

### Tests for User Story 3 (Test-First Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T036 [P] [US3] Write E2E test "appears in mobile menu" with mobile viewport in src/client/e2e/tests/voting-nav.spec.ts
- [X] T037 [P] [US3] Write E2E test "navigates from mobile menu" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T038 [P] [US3] Write E2E test "shows active state in mobile menu" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T039 [US3] Run E2E tests for User Story 3 and verify they FAIL (check if already passing from previous implementation)

### Implementation for User Story 3

- [X] T040 [US3] Verify mobile menu uses same visibleLinks array (should already be implemented from US1)
- [X] T041 [US3] Verify mobile menu includes active state styling (should already be implemented from US2)
- [X] T042 [US3] Add onClick handler to close mobile menu after link click in src/client/src/components/shell/TopNav.jsx
- [ ] T043 [US3] Run E2E tests for User Story 3 and verify they PASS
- [ ] T044 [US3] Manual test: Resize to mobile width (< 768px), open menu, verify link appears
- [ ] T045 [US3] Manual test: Click link in mobile menu, verify navigation works and menu closes
- [ ] T046 [US3] Manual test: Test on actual mobile device if available

**Checkpoint**: All user stories are functional - voting platform navigation works on all devices

---

## Phase 6: Accessibility & Cross-Browser (Cross-Cutting Concerns)

**Purpose**: Ensure WCAG 2.1 Level AA compliance and cross-browser compatibility

### Accessibility Tests (Test-First Required)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T047 [P] [US1] Write E2E test "is keyboard accessible" in src/client/e2e/tests/voting-nav.spec.ts
- [X] T048 [US1] Run keyboard accessibility test and verify it FAILS (if not already passing)

### Accessibility Implementation

- [X] T049 Verify aria-label exists on navigation element in src/client/src/components/shell/TopNav.jsx
- [X] T050 Verify aria-current="page" is set for active link (should be from US2 implementation)
- [X] T051 Verify aria-controls and aria-expanded exist on mobile menu button (should already exist)
- [ ] T052 Test keyboard navigation: Tab to link, verify focus indicator visible
- [ ] T053 Test keyboard navigation: Press Enter on focused link, verify navigation works
- [ ] T054 Run keyboard accessibility E2E test and verify it PASSES
- [ ] T055 [P] Test with screen reader (NVDA/JAWS on Windows or VoiceOver on Mac)
- [ ] T056 [P] Verify color contrast meets WCAG 2.1 AA standards (4.5:1 for text, 3:1 for UI components)

### Cross-Browser Testing

- [ ] T057 [P] Test navigation link in Chrome (desktop and mobile)
- [ ] T058 [P] Test navigation link in Firefox
- [ ] T059 [P] Test navigation link in Safari
- [ ] T060 [P] Test navigation link in Edge

**Checkpoint**: Feature meets all accessibility and cross-browser requirements

---

## Phase 7: Polish & Documentation

**Purpose**: Final improvements and documentation updates

- [ ] T061 [P] Update project README.md with navigation feature documentation (if applicable)
- [X] T062 [P] Add inline code comments for role-checking logic in src/client/src/components/shell/TopNav.jsx
- [ ] T063 Review all E2E test output for any warnings or improvements
- [ ] T064 Run full E2E test suite (all tests) and verify 100% pass rate
- [ ] T065 Review code formatting and linting in src/client/src/components/shell/TopNav.jsx
- [ ] T066 Validate implementation against quickstart.md checklist
- [ ] T067 Performance check: Verify navigation interaction response time < 100ms
- [ ] T068 Create test users with appropriate roles for future testing (document in README or dev docs)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (5 min)
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (10 min)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start after Foundational - ~20 min
  - User Story 2 (P2) depends on User Story 1 implementation (T014-T019) - ~10 min
  - User Story 3 (P3) depends on User Stories 1 & 2 (should mostly work automatically) - ~5 min
- **Accessibility (Phase 6)**: Can start after User Story 1, benefits from all stories complete - ~15 min
- **Polish (Phase 7)**: Depends on all user stories and accessibility complete - ~10 min

**Total Estimated Time**: 70-80 minutes (slightly longer than quickstart estimate due to comprehensive testing)

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational phase - implements core navigation link with permission checking
- **User Story 2 (P2)**: Depends on User Story 1 implementation - adds active state to existing link
- **User Story 3 (P3)**: Depends on User Stories 1 & 2 - ensures mobile works (should be automatic if following pattern)

### Within Each User Story

**CRITICAL TEST-FIRST WORKFLOW**:
1. Write ALL tests for the user story FIRST
2. Run tests and verify they FAIL (Red)
3. Implement functionality to make tests pass (Green)
4. Run tests and verify they PASS
5. Refactor if needed (Refactor)
6. Manual validation
7. Mark story complete

### Parallel Opportunities

**Within Setup (Phase 1)**:
- All tasks can run in parallel (5 min total if parallel)

**Within Foundational (Phase 2)**:
- T004-T005 can run in parallel (verification tasks)
- T006-T007 can run in parallel (file creation)

**Within User Story 1 Tests**:
- T009-T012 can all be written in parallel (different test scenarios in same file)

**Within Accessibility Phase**:
- T055-T060 can run in parallel (different browsers/tools)

**Within Polish Phase**:
- T061-T062 can run in parallel (documentation tasks)
- T057-T060 can run in parallel (browser testing)

**Across User Stories** (if multiple developers available):
- After Foundational complete, Developer A can start US1 while Developer B prepares US2 tests
- US2 can start implementing once US1 implementation (T014-T019) is complete
- Accessibility testing can start as soon as US1 is complete

---

## Parallel Example: User Story 1 Tests

```bash
# Write all E2E tests for User Story 1 in parallel:
Developer A: "Write E2E test 'shows link to users with voting role'"
Developer B: "Write E2E test 'shows link to users with admin role'"
Developer C: "Write E2E test 'hides link from users without required roles'"
Developer D: "Write E2E test 'navigates to voting platform when clicked'"

# Or single developer writes all 4 test scenarios sequentially in ~10 min
```

## Parallel Example: Cross-Browser Testing

```bash
# Test navigation in all browsers simultaneously:
Developer A: Chrome (desktop + mobile)
Developer B: Firefox
Developer C: Safari
Developer D: Edge

# Estimated: 5-10 min in parallel vs 20-30 min sequential
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - RECOMMENDED ✅

1. Complete Phase 1: Setup (~5 min)
2. Complete Phase 2: Foundational (~10 min) - CRITICAL
3. Complete Phase 3: User Story 1 (~20 min)
   - Write tests first (T009-T013)
   - Implement functionality (T014-T019)
   - Verify tests pass (T020)
   - Manual validation (T021-T024)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Demo/Review: Show working permission-based navigation link
6. Decision point: Deploy MVP or continue to US2?

**Value Delivered**: Authorized users can access voting platform via navigation (core requirement met)

### Incremental Delivery

1. **Setup + Foundational** (~15 min) → Foundation ready
2. **+ User Story 1** (~20 min) → MVP! Navigation link with permissions ✅
   - Test independently: Log in with different roles, verify link visibility
   - Demo: Show link appears only for authorized users
3. **+ User Story 2** (~10 min) → Active state indication ✅
   - Test independently: Navigate to voting platform, verify active styling
   - Demo: Show wayfinding improvement
4. **+ User Story 3** (~5 min) → Mobile support ✅
   - Test independently: Resize to mobile, verify link in menu
   - Demo: Show responsive behavior
5. **+ Accessibility** (~15 min) → WCAG compliant ✅
   - Test: Keyboard navigation, screen reader, color contrast
6. **+ Polish** (~10 min) → Production ready ✅

**Total**: ~75 minutes for complete feature with all user stories and quality gates

### Parallel Team Strategy (if 2+ developers available)

**Foundation Phase** (Everyone together - ~15 min):
- Complete Setup and Foundational together

**After Foundation Complete**:

**Scenario 1: Two developers**
- Developer A:
  - Phase 3 (User Story 1) - tests and implementation
- Developer B:
  - Phase 4 (User Story 2) - write tests, wait for US1 implementation
  - Once A completes T014-T019, B implements US2
  - B then does Phase 5 (User Story 3) while A does Phase 6 (Accessibility)

**Scenario 2: Three developers**
- Developer A: User Story 1
- Developer B: User Story 2 (starts tests immediately, implements after US1 ready)
- Developer C: Prepares accessibility tests, implements Phase 6 after US1 complete

**Estimated parallel time**: ~40-50 minutes vs 75 minutes sequential

---

## Test-First Workflow (CRITICAL)

This feature follows the **Red-Green-Refactor** cycle required by the constitution:

### For Each User Story:

1. **RED**: Write tests first, run them, verify they FAIL
   - User Story 1: T009-T013 (write tests) → T013 (verify FAIL)
   - User Story 2: T025-T027 (write tests) → T027 (verify FAIL)
   - User Story 3: T036-T039 (write tests) → T039 (verify FAIL)
   - Accessibility: T047-T048 (write test) → T048 (verify FAIL)

2. **GREEN**: Implement minimum code to make tests PASS
   - User Story 1: T014-T019 → T020 (verify PASS)
   - User Story 2: T028-T032 → T033 (verify PASS)
   - User Story 3: T040-T042 → T043 (verify PASS)
   - Accessibility: T049-T053 → T054 (verify PASS)

3. **REFACTOR**: Clean up code, optimize, improve (if needed)
   - Review code quality
   - Check for duplication
   - Improve naming or structure

4. **VALIDATE**: Manual testing and verification
   - Follow manual test steps for each story
   - Verify all acceptance criteria met

### Why Test-First Matters

- ✅ Ensures requirements are testable and clear
- ✅ Prevents regressions during development
- ✅ Provides immediate feedback on correctness
- ✅ Creates safety net for refactoring
- ✅ Meets constitution's NON-NEGOTIABLE test-first principle

---

## Success Criteria Validation

Before marking feature complete, verify all success criteria from spec.md:

- [ ] **SC-001**: Users can locate "Voting Platform" link within 3 seconds of viewing navigation
- [ ] **SC-002**: 100% of users who click link are successfully navigated to /voting-platform
- [ ] **SC-003**: Link functions correctly across all supported browsers (Chrome, Firefox, Safari, Edge)
- [ ] **SC-004**: Link is keyboard accessible and meets WCAG 2.1 Level AA standards
- [ ] **SC-005**: Navigation link interaction response time is under 100 milliseconds

---

## Notes

- **[P] tasks** = Different files or independent operations, can run in parallel
- **[Story] labels** = Map tasks to specific user stories for traceability (US1, US2, US3)
- **Test-First Required**: Constitution principle - write tests before implementation
- **Each user story** = Independently completable and testable
- **Estimated times** = Based on quickstart.md guide (45-60 min) plus comprehensive testing
- **Commit strategy**: Commit after each completed phase or logical group of tasks
- **Checkpoint validation**: Stop at each checkpoint to verify story works independently
- **MVP approach**: User Story 1 alone delivers core value (permission-based navigation)

---

## Task Count Summary

- **Total Tasks**: 68
- **Phase 1 (Setup)**: 3 tasks (~5 min)
- **Phase 2 (Foundational)**: 5 tasks (~10 min) - BLOCKS all user stories
- **Phase 3 (User Story 1)**: 16 tasks (~20 min) - MVP ✅
- **Phase 4 (User Story 2)**: 11 tasks (~10 min)
- **Phase 5 (User Story 3)**: 11 tasks (~5 min)
- **Phase 6 (Accessibility)**: 14 tasks (~15 min)
- **Phase 7 (Polish)**: 8 tasks (~10 min)

**Parallelizable Tasks**: 22 tasks marked with [P] - can significantly reduce time with multiple developers

**Test Tasks**: 17 test-related tasks (E2E tests, validation, accessibility tests) - ensures quality and constitution compliance

---

## Ready to Start?

1. ✅ Review [quickstart.md](quickstart.md) for detailed implementation guide
2. ✅ Review [contracts/README.md](contracts/README.md) for test specifications
3. ✅ Start with Phase 1 (Setup) - takes only 5 minutes
4. ✅ Remember: **Tests first!** Write failing tests before implementation
5. ✅ Commit frequently after completing each phase or logical group

**Estimated completion time**: 
- MVP (User Story 1 only): ~35 minutes
- Full feature (all 3 user stories): ~75 minutes
- With parallel execution (2-3 devs): ~40-50 minutes
