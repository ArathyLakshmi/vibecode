# Implementation Tasks: Global Search

**Feature**: Global Search  
**Tech Stack**: React 18, Vite 5.0, Tailwind CSS 3.4.8, React Router 6.11.2, Playwright (E2E)  
**Total Tasks**: 38  
**Test Approach**: E2E tests with Playwright (Test-First per constitution), client-side filtering for MVP

---

## Implementation Strategy

**MVP Scope**: User Story 1 only (Basic Text Search)  
Complete Phase 1 (Setup), Phase 2 (Foundational), and Phase 3 (US1) for a working search bar with client-side filtering.

**Incremental Delivery**:  
- **Iteration 1**: Basic text search with client-side filtering (US1) - MVP
- **Iteration 2**: Add real-time search with debouncing (US2)
- **Iteration 3**: Add visual feedback (icons, clear button) (US3)
- **Iteration 4**: Polish & optimization

Each user story phase is independently testable and deliverable.

---

## Phase 1: Setup (Project Initialization)

**Goal**: Verify development environment and prerequisites

**Tasks**:
- [ ] T001 Verify Tailwind CSS is configured in src/client/tailwind.config.js
- [ ] T002 Verify React Router is installed in src/client/package.json
- [ ] T003 Verify Playwright is configured in src/client/e2e/playwright.config.ts
- [ ] T004 Verify dev servers start successfully: frontend at localhost:5173, backend at localhost:5000
- [ ] T005 Verify MeetingRequestsList component exists in src/client/src/components/MeetingRequestsList.jsx
- [ ] T006 Verify Header component exists in src/client/src/components/shell/Header.jsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Set up test infrastructure needed by all user stories

**Tasks**:
- [ ] T007 Create E2E test file src/client/e2e/tests/search.spec.ts
- [ ] T008 [P] Add test helper function for navigating to authenticated home page in src/client/e2e/tests/search.spec.ts
- [ ] T009 [P] Add test helper function for typing in search bar in src/client/e2e/tests/search.spec.ts
- [ ] T010 Verify E2E test file runs without errors: `npx playwright test tests/search.spec.ts`

---

## Phase 3: User Story 1 - Basic Text Search (P1)

**Story Goal**: Users can search for meeting requests by entering keywords in a search bar located in the global navigation

**Independent Test Criteria**:
- ✅ Search bar is visible in global navigation when authenticated
- ✅ Typing text filters meeting requests list in real-time
- ✅ Clearing search bar shows all meeting requests again
- ✅ "No results found" message appears when search returns zero matches
- ✅ Search is case-insensitive and supports partial matching

**Tasks**:

### Tests (Write First)
- [ ] T011 [P] [US1] Add E2E test: search bar is visible in global navigation in src/client/e2e/tests/search.spec.ts
- [ ] T012 [P] [US1] Add E2E test: typing "board" filters results to show only matching items in src/client/e2e/tests/search.spec.ts
- [ ] T013 [P] [US1] Add E2E test: clearing search shows all meeting requests in src/client/e2e/tests/search.spec.ts
- [ ] T014 [P] [US1] Add E2E test: searching for non-existent term shows "No results found" in src/client/e2e/tests/search.spec.ts
- [ ] T015 [P] [US1] Add E2E test: search is case-insensitive ("BOARD" matches "board") in src/client/e2e/tests/search.spec.ts
- [ ] T016 [P] [US1] Add E2E test: partial matching works ("meet" matches "meeting") in src/client/e2e/tests/search.spec.ts
- [ ] T017 [P] [US1] Add E2E test: searching by reference number finds specific request in src/client/e2e/tests/search.spec.ts

### Implementation
- [ ] T018 [US1] Create SearchBar component in src/client/src/components/shell/SearchBar.jsx with controlled input
- [ ] T019 [US1] Add searchTerm state management in SearchBar component in src/client/src/components/shell/SearchBar.jsx
- [ ] T020 [US1] Add onChange handler to update searchTerm in SearchBar component in src/client/src/components/shell/SearchBar.jsx
- [ ] T021 [US1] Add onSearchChange prop callback to emit searchTerm to parent in src/client/src/components/shell/SearchBar.jsx
- [ ] T022 [US1] Add searchTerm state to parent component (App.jsx or Home page) in src/client/src/App.jsx
- [ ] T023 [US1] Integrate SearchBar into Header component in src/client/src/components/shell/Header.jsx
- [ ] T024 [US1] Pass searchTerm prop to MeetingRequestsList component in src/client/src/App.jsx
- [ ] T025 [US1] Create matchesSearch utility function in src/client/src/components/MeetingRequestsList.jsx
- [ ] T026 [US1] Implement case-insensitive partial matching logic across all fields in matchesSearch function in src/client/src/components/MeetingRequestsList.jsx
- [ ] T027 [US1] Add filter logic using matchesSearch in MeetingRequestsList component in src/client/src/components/MeetingRequestsList.jsx
- [ ] T028 [US1] Add "No results found" message when filteredItems.length === 0 in src/client/src/components/MeetingRequestsList.jsx
- [ ] T029 [US1] Add Tailwind CSS styles for SearchBar (border, padding, focus states) in src/client/src/components/shell/SearchBar.jsx
- [ ] T030 [US1] Run E2E tests for User Story 1 and verify all tests pass: `npx playwright test tests/search.spec.ts`

---

## Phase 4: User Story 2 - Real-time Search (P2)

**Story Goal**: Search results update automatically as the user types with debouncing to prevent excessive operations

**Independent Test Criteria**:
- ✅ Search executes automatically after user stops typing (300ms delay)
- ✅ Search does not execute while user is actively typing
- ✅ Loading indicator appears while search is executing (if applicable)

**Tasks**:

### Tests (Write First)
- [ ] T031 [P] [US2] Add E2E test: search executes after 300ms pause in typing in src/client/e2e/tests/search.spec.ts
- [ ] T032 [P] [US2] Add E2E test: rapid typing is debounced (search waits until typing stops) in src/client/e2e/tests/search.spec.ts

### Implementation
- [ ] T033 [US2] Add useEffect hook with debounce timer in parent component in src/client/src/App.jsx
- [ ] T034 [US2] Implement 300ms debounce delay using setTimeout and cleanup in src/client/src/App.jsx
- [ ] T035 [US2] Add isSearching state to track search execution in src/client/src/App.jsx
- [ ] T036 [US2] Pass isSearching prop to MeetingRequestsList for loading indicator in src/client/src/App.jsx
- [ ] T037 [US2] Add loading indicator UI in MeetingRequestsList when isSearching is true in src/client/src/components/MeetingRequestsList.jsx
- [ ] T038 [US2] Run E2E tests for User Story 2 and verify all tests pass: `npx playwright test tests/search.spec.ts`

---

## Phase 5: User Story 3 - Search Visual Feedback (P3)

**Story Goal**: Search bar provides clear visual feedback with icons and clear button

**Independent Test Criteria**:
- ✅ Search icon is visible in search input when empty
- ✅ Clear (X) button appears when text is entered
- ✅ Clicking clear button removes text and shows all results
- ✅ Search input has proper placeholder text

**Tasks**:

### Tests (Write First)
- [ ] T039 [P] [US3] Add E2E test: search icon is visible in empty search bar in src/client/e2e/tests/search.spec.ts
- [ ] T040 [P] [US3] Add E2E test: clear button appears when text is entered in src/client/e2e/tests/search.spec.ts
- [ ] T041 [P] [US3] Add E2E test: clicking clear button removes text and shows all results in src/client/e2e/tests/search.spec.ts
- [ ] T042 [P] [US3] Add E2E test: placeholder text is descriptive in src/client/e2e/tests/search.spec.ts

### Implementation
- [ ] T043 [US3] Add search icon (SVG or icon library) to SearchBar component in src/client/src/components/shell/SearchBar.jsx
- [ ] T044 [US3] Add clear button (X icon) that shows when searchTerm is non-empty in src/client/src/components/shell/SearchBar.jsx
- [ ] T045 [US3] Add onClick handler for clear button to reset searchTerm in src/client/src/components/shell/SearchBar.jsx
- [ ] T046 [US3] Add placeholder text "Search meeting requests..." to input in src/client/src/components/shell/SearchBar.jsx
- [ ] T047 [US3] Add Tailwind CSS styles for icons and clear button positioning in src/client/src/components/shell/SearchBar.jsx
- [ ] T048 [US3] Add hover and focus states for clear button in src/client/src/components/shell/SearchBar.jsx
- [ ] T049 [US3] Run E2E tests for User Story 3 and verify all tests pass: `npx playwright test tests/search.spec.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Performance optimization, documentation, and final verification

**Tasks**:
- [ ] T050 [P] Add keyboard accessibility: Enter key support in SearchBar in src/client/src/components/shell/SearchBar.jsx
- [ ] T051 [P] Add keyboard accessibility: Escape key to clear search in src/client/src/components/shell/SearchBar.jsx
- [ ] T052 [P] Add ARIA labels for accessibility (aria-label for search input) in src/client/src/components/shell/SearchBar.jsx
- [ ] T053 Add performance test: verify search completes within 2 seconds for 1000 records in src/client/e2e/tests/search.spec.ts
- [ ] T054 Add code comments and JSDoc to SearchBar component in src/client/src/components/shell/SearchBar.jsx
- [ ] T055 Add code comments to matchesSearch function in src/client/src/components/MeetingRequestsList.jsx
- [ ] T056 Update README with search feature usage in src/client/README.md
- [ ] T057 Run full E2E test suite and verify all tests pass: `npm run e2e` from src/client
- [ ] T058 Manual testing: verify all acceptance scenarios from spec.md work correctly

---

## Dependencies & Execution Order

### Story Dependencies
```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → [
  Phase 4 (US2),
  Phase 5 (US3)
] → Phase 6 (Polish)
```

**Blocking relationships**:
- US2 (Real-time Search) requires US1 (Basic Search) - adds debouncing to existing SearchBar
- US3 (Visual Feedback) requires US1 (Basic Search) - adds visual elements to existing SearchBar
- Phase 6 (Polish) requires US1 complete (US2 and US3 are enhancements)

**Independent stories** (can be developed in parallel after US1):
- US2 (Real-time) and US3 (Visual) could be done in parallel, but US2 is higher priority (P2 vs P3)

### Parallel Execution Opportunities

**Within User Story 1 (Basic Text Search)**:
- T011-T017 (all E2E tests) can be written in parallel (7 tasks)
- T018-T021 (SearchBar component creation) can be done while T025-T026 (matchesSearch function) is being written in parallel (different files)

**Within User Story 2 (Real-time Search)**:
- T031-T032 (E2E tests) can be written in parallel (2 tasks)

**Within User Story 3 (Visual Feedback)**:
- T039-T042 (E2E tests) can be written in parallel (4 tasks)

**Within Phase 6 (Polish)**:
- T050-T052 (keyboard accessibility and ARIA) can be implemented in parallel (3 tasks)

---

## Task Summary

| Phase | User Story | Task Count | Parallel Opportunities |
|-------|-----------|------------|------------------------|
| Phase 1 | Setup | 6 | 0 (verification tasks) |
| Phase 2 | Foundational | 4 | T008-T009 (2 tasks) |
| Phase 3 | US1 - Basic Search | 20 | T011-T017 (7 tests), T018-T021 + T025-T026 (6 tasks) |
| Phase 4 | US2 - Real-time | 8 | T031-T032 (2 tasks) |
| Phase 5 | US3 - Visual | 11 | T039-T042 (4 tasks) |
| Phase 6 | Polish | 9 | T050-T052 (3 tasks) |
| **Total** | **3 stories** | **58** | **24 parallel tasks** |

---

## Notes

- **Test markers**: `[P]` indicates tasks that can be executed in parallel with other `[P]` tasks in the same phase
- **Story labels**: `[US1]` through `[US3]` map to user stories in spec.md
- **File paths**: All paths are relative to repository root `c:\Users\arath\my-project-today\`
- **Test approach**: Test-First per constitution - write E2E tests before implementation for each user story
- **MVP recommendation**: Complete Phase 1-3 (Setup + Foundational + US1) for minimal viable search functionality
- **Incremental verification**: Run E2E tests after completing each user story phase to verify independence
- **Client-side filtering**: MVP uses JavaScript .filter() with no backend API calls
- **Future enhancement**: Backend search API contract defined in contracts/search-api.json for future implementation
- **Performance target**: Search must complete within 2 seconds for datasets up to 1000 meeting requests (SC-002)
