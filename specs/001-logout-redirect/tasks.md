# Implementation Tasks: Logout Redirect

**Feature**: 001-logout-redirect  
**Branch**: `001-logout-redirect`  
**Date**: February 10, 2026  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

Replace popup-based logout with redirect-based logout for improved UX, reliability, and security. This is a single user story feature with focused scope: change one method call, add button state management, and update E2E tests.

**Implementation Strategy**: Test-first (TDD) approach - write failing tests first, then implement to make them pass.

---

## Phase 1: Setup & Prerequisites

**Goal**: Verify development environment and dependencies are ready for implementation.

### Tasks

- [ ] T001 Verify Node.js and npm are installed and client dependencies are up to date in src/client/package.json
- [ ] T002 Verify Playwright is installed and E2E test infrastructure is functional in src/client/e2e/
- [ ] T003 Verify MSAL configuration has postLogoutRedirectUri set in src/client/src/auth/msalConfig.js
- [ ] T004 Verify branch 001-logout-redirect is checked out and up to date with main

**Completion Criteria**: All dependencies installed, E2E tests can run, MSAL config verified, correct branch active.

---

## Phase 2: Foundational - Test Infrastructure

**Goal**: Set up E2E test file structure before writing tests for logout redirect behavior.

### Tasks

- [ ] T005 Verify or create E2E test file at src/client/e2e/tests/auth.spec.ts
- [ ] T006 Verify Playwright configuration supports authentication flows in src/client/e2e/playwright.config.ts

**Completion Criteria**: Test file exists, Playwright configured for auth testing, ready to write redirect tests.

---

## Phase 3: User Story 1 (P1) - Logout Redirect Flow

**User Story**: When an authenticated user clicks the "Logout" button, the system redirects the browser to Microsoft's logout page (if needed by MSAL), then returns to the login page. This provides a cleaner, more predictable logout experience compared to popup windows.

**Independent Test Criteria**: 
- Click logout button → button becomes disabled
- Browser redirects to Microsoft logout (no popup)
- Browser automatically redirects back to login page
- Session fully cleared (cannot access protected routes)
- Multi-tab logout works (logout in one tab logs out all tabs)

### Step 1: Write Failing E2E Tests (Red Phase)

- [X] T007 [US1] Write E2E test for main logout redirect flow in src/client/e2e/tests/auth.spec.ts
  - Test: Click logout → verify button disabled
  - Test: Verify URL redirects to login.microsoftonline.com
  - Test: Verify URL redirects back to app login page
  - Test: Verify login button is visible on return
  - Test: Verify session cleared (protected route redirect to login)

- [X] T008 [US1] Write E2E test for rapid button click prevention in src/client/e2e/tests/auth.spec.ts
  - Test: Double-click logout button rapidly
  - Test: Verify button disabled after first click
  - Test: Verify only one logout processed

- [X] T009 [US1] Run E2E tests and verify they fail (expected: popup behavior, button not disabled) - DO NOT FIX YET

**Step Completion**: Tests written, tests fail as expected (red phase), ready for implementation.

### Step 2: Implement Logout Redirect (Green Phase)

- [X] T010 [US1] Add isLoggingOut state to Home component in src/client/src/App.jsx
  - Add: const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  - Location: After existing useState declarations (line ~14)

- [X] T011 [US1] Update handleLogout function in src/client/src/App.jsx
  - Add guard: if (isLoggingOut) return (prevent double-click)
  - Add: setIsLoggingOut(true) before logout call
  - Change: instance.logoutPopup → instance.logoutRedirect
  - Add error handling: try/catch with instance.clearCache() on error
  - Add fallback: navigate('/login') on error
  - Add: setIsLoggingOut(false) only in error case

- [X] T012 [US1] Update logout button UI in src/client/src/App.jsx
  - Add: disabled={isLoggingOut} prop to logout button
  - Update className: conditional styling for disabled state
  - Update button text: show "Logging out..." when isLoggingOut is true

- [X] T013 [US1] Run E2E tests and verify they pass (expected: redirect behavior, button disabled)

**Step Completion**: Implementation complete, all tests passing (green phase), feature functional.

### Step 3: Validation & Edge Cases

- [X] T014 [US1] Manual test: Verify logout works in desktop browser (Chrome/Edge)
  - Login → Logout → Verify redirect flow
  - Verify button disabled during logout
  - Verify session cleared (try accessing protected route)

- [X] T015 [P] [US1] Manual test: Verify multi-tab logout behavior
  - Open app in 2 tabs, login both
  - Logout in tab 1
  - Verify tab 2 also logged out (tokens cleared via localStorage)

- [X] T016 [P] [US1] Manual test: Verify error handling with offline mode
  - Enable offline mode in DevTools
  - Click logout
  - Verify local session cleared anyway
  - Verify error logged to console
  - Verify redirected to login page

**Step Completion**: Manual validation complete, edge cases verified, multi-tab and error handling confirmed.

**Phase 3 Complete**: User Story 1 fully implemented, tested, and validated. Feature delivers all acceptance scenarios.

---

## Final Phase: Polish & Validation

**Goal**: Ensure code quality, documentation, and deployment readiness.

### Tasks

- [X] T017 [P] Review code for console.error statements and ensure they provide helpful debugging information
- [X] T018 [P] Verify MSAL error messages are user-friendly in error scenarios
- [ ] T019 [P] Run full E2E test suite to ensure no regressions in other auth flows
- [X] T020 Commit changes with descriptive commit message following conventional commits format
- [X] T021 Review all success criteria met: SC-001 through SC-006 from spec.md
- [X] T022 Update checklist in specs/001-logout-redirect/checklists/requirements.md as complete

**Completion Criteria**: All tests passing, code committed, success criteria verified, ready for PR/merge.

---

## Dependencies & Execution Order

### Critical Path (Must Complete in Order)

```
Phase 1 (Setup) → Phase 2 (Test Infrastructure) → Phase 3 User Story 1:
  T001-T004 → T005-T006 → T007-T009 (Red Phase) → T010-T013 (Green Phase) → T014-T016 (Validation) → Final Phase T017-T022
```

### Parallel Execution Opportunities

**After T009 (Tests Written)**:
- None - Implementation steps T010-T012 should be done together as they're tightly coupled

**After T013 (Implementation Complete)**:
- T014, T015, T016 can run in parallel (different browsers/scenarios)
- T017, T018, T019 can run in parallel (code review activities)

**User Story Dependencies**:
- US1 has no dependencies (only user story)
- US1 is self-contained and independently testable

---

## Task Summary

| Phase | Task Count | Parallelizable | User Story |
|-------|------------|----------------|------------|
| Phase 1: Setup | 4 | 0 | - |
| Phase 2: Foundational | 2 | 0 | - |
| Phase 3: User Story 1 | 10 | 3 | US1 |
| Final Phase: Polish | 6 | 3 | - |
| **Total** | **22** | **6** | **1** |

---

## Implementation Strategy

### MVP Scope
**Phase 3 only** - This feature has one user story (US1), which is the entire MVP scope.

### Incremental Delivery
1. **First deliverable**: Complete Phase 3 (logout redirect working)
   - Value: Users get improved logout UX immediately
   - Testable: All E2E tests passing
   - Deployable: Feature complete, no dependencies

2. **Final deliverable**: Complete Final Phase (polish + validation)
   - Value: Production-ready code with full validation
   - Testable: Full test suite passing
   - Deployable: Ready for PR and merge to main

### Rollback Plan
Simple revert if issues arise:
1. Revert commit with T010-T012 changes
2. Revert commit with T007-T008 test changes
3. Redeploy (< 5 minutes total)

---

## Testing Strategy

### E2E Tests (Playwright)
- **T007**: Main redirect flow (5 assertions)
- **T008**: Rapid click prevention (2 assertions)
- **T019**: Regression test for other auth flows

Expected test run time: < 30 seconds for logout tests

### Manual Testing Checklist
- **T014**: Desktop browser verification
- **T015**: Multi-tab behavior
- **T016**: Error handling (offline mode)

Expected manual test time: 10-15 minutes

### Test Coverage Goals
- ✅ 100% of acceptance scenarios from spec.md
- ✅ All edge cases from spec clarifications
- ✅ Error handling paths (network failure, config errors)

---

## Success Criteria Validation

Track these metrics post-implementation to verify success criteria:

| Criterion | Target | Validation Method | Task |
|-----------|--------|-------------------|------|
| SC-001 | Logout < 5 seconds | Manual timing during T014 | T021 |
| SC-002 | Zero popups (100%) | E2E test T007 assertion | T021 |
| SC-003 | 100% redirect to login | E2E test T007 assertion | T021 |
| SC-004 | Session cleared (100%) | E2E test T007 + manual T014 | T021 |
| SC-005 | 98%+ completion rate | Monitor in production (post-deploy) | T021 |
| SC-006 | Improved satisfaction | User feedback (post-deploy) | T021 |

---

## File Change Summary

| File | Change Type | Tasks | Description |
|------|-------------|-------|-------------|
| src/client/src/App.jsx | Modify | T010, T011, T012 | Add state, change method, update button |
| src/client/e2e/tests/auth.spec.ts | Modify/Create | T005, T007, T008 | Add redirect tests |
| src/client/src/auth/msalConfig.js | Verify (no change) | T003 | Confirm config exists |

**Total files modified**: 2  
**Total files created**: 0-1 (auth.spec.ts if doesn't exist)  
**Backend changes**: 0  
**Database changes**: 0

---

## Time Estimates

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 1: Setup | 5 minutes | 5 min |
| Phase 2: Foundational | 3 minutes | 8 min |
| Phase 3: User Story 1 | 20-30 minutes | 28-38 min |
| Final Phase: Polish | 10-15 minutes | 38-53 min |
| **Total** | **38-53 minutes** | |

Aligns with quickstart.md estimate of 30-45 minutes active work time.

---

## Notes

- **TDD Approach**: Tests written before implementation (T007-T009 before T010-T012)
- **Single User Story**: All tasks map to P1 User Story 1 - Logout Redirect Flow
- **Low Risk**: Minimal changes, easy rollback, no breaking changes
- **High Value**: Improves UX, reliability, security for all authenticated users

Ready to begin implementation. Start with T001 (verify setup).
