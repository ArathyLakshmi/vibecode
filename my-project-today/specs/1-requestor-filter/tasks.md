# Tasks: Requestor Filter Toggle

**Feature**: 1-requestor-filter | **Branch**: `1-requestor-filter`  
**Input**: Design documents from `/specs/1-requestor-filter/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/, ✅ quickstart.md

**Tests**: Test-First approach - All tests written BEFORE implementation  
**Organization**: Tasks organized by implementation phase with clear checkpoints

---

## Format: `- [ ] [ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel  (different files, no dependencies)
- **[US1]**: User Story 1 (Requestor Filter Toggle MVP)
- All file paths are absolute from repository root

---

## Phase 1: Setup

**Purpose**: Ensure development environment is ready

- [X] T001 Verify backend server runs successfully on http://localhost:5000
- [X] T002 Verify frontend dev server runs successfully on http://localhost:5173
- [X] T003 Verify MSAL authentication configured and user can login
- [X] T004 Verify infinite scroll working in MeetingRequestsList component
- [X] T005 Verify RequestorEmail column exists in MeetingRequests database table

**Checkpoint**: ✅ Environment validated - feature work can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure ready for filter implementation

- [X] T006 Review existing MeetingRequestsList component structure in src/client/src/components/MeetingRequestsList.jsx
- [X] T007 Review existing API endpoint in src/server/Controllers/MeetingRequestsController.cs
- [X] T008 Confirm Fluent UI Pivot component available in @fluentui/react-components package
- [X] T009 Verify user email accessible from MSAL context (accounts[0].username)

**Checkpoint**: ✅ Foundation ready - User Story 1 implementation can begin

---

## Phase 3: User Story 1 - Requestor Filter Toggle (Priority: P1) 🎯 MVP

**Goal**: Add toggle control above meeting requests list that filters between "My Requests" (default) and "All Requests"

**Independent Test**: 
1. Load page → See only your requests (default "My Requests" active)
2. Click "All Requests" → See all requests from all users
3. Click "My Requests" → Filter back to only your requests
4. Search while filtered → Results respect current filter mode
5. Scroll to load more → Pagination respects current filter

**Functional Requirements Covered**: FR-1 through FR-11 from spec.md

---

### Backend API Extension (Test-First)

**Purpose**: Extend API to support filtering by requestor email

> **CRITICAL**: Write tests FIRST, ensure they FAIL before implementation

- [X] T010 [P] [US1] Create test file src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs with xUnit setup and in-memory database
- [X] T011 [P] [US1] Write failing test: List_WithRequestorEmail_ReturnsOnlyMatchingRequests in src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs
- [X] T012 [P] [US1] Write passing test: List_WithoutRequestorEmail_ReturnsAllRequests in src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs
- [X] T013 [P] [US1] Write test: List_WithRequestorEmail_UpdatesTotalCount in src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs
- [X] T014 [P] [US1] Write test: List_WithRequestorEmail_WorksWithPagination in src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs
- [X] T015 [US1] Run backend tests with `dotnet test` - verify tests fail or pass as expected
- [X] T016 [US1] Add requestorEmail parameter to List method signature in src/server/Controllers/MeetingRequestsController.cs
- [X] T017 [US1] Add LINQ Where clause for requestor filtering after existing filters in src/server/Controllers/MeetingRequestsController.cs
- [X] T018 [US1] Run backend tests with `dotnet test` - verify all tests pass
- [X] T019 [US1] Manual API test: curl http://localhost:5000/api/meetingrequests?requestorEmail=user@example.com returns filtered results

**Checkpoint**: ✅ Backend API filtering works and all tests pass

---

### Frontend Filter State Setup

**Purpose**: Add filter state management to component

- [X] T020 [US1] Add filterMode state to MeetingRequestsList: const [filterMode, setFilterMode] = useState("my-requests") in src/client/src/components/MeetingRequestsList.jsx
- [X] T021 [US1] Import Pivot and PivotItem from @fluentui/react-components in src/client/src/components/MeetingRequestsList.jsx
- [X] T022 [US1] Extract userEmail from MSAL context: const userEmail = accounts?.[0]?.username || '' in src/client/src/components/MeetingRequestsList.jsx
- [X] T023 [US1] Verify filterMode defaults to "my-requests" on component mount

**Checkpoint**: ✅ Filter state initialized correctly

---

### Frontend Toggle UI Component

**Purpose**: Add Pivot toggle control to UI

- [X] T024 [US1] Add Pivot component above status filter tabs in src/client/src/components/MeetingRequestsList.jsx
- [X] T025 [US1] Add two PivotItems: "My Requests" (itemKey="my-requests") and "All Requests" (itemKey="all-requests") in src/client/src/components/MeetingRequestsList.jsx
- [X] T026 [US1] Wire selectedKey prop to filterMode state in Pivot component in src/client/src/components/MeetingRequestsList.jsx
- [X] T027 [US1] Add onLinkClick handler to update filterMode when toggle clicked in src/client/src/components/MeetingRequestsList.jsx
- [X] T028 [US1] Add data-testid attributes: filter-toggle, filter-my-requests, filter-all-requests in src/client/src/components/MeetingRequestsList.jsx
- [X] T029 [US1] Add aria-label="Filter meeting requests by requestor" to Pivot for accessibility in src/client/src/components/MeetingRequestsList.jsx
- [X] T030 [US1] Verify toggle renders above list and both options are visible

**Checkpoint**: ✅ Toggle UI renders and responds to clicks

---

### Frontend API Integration

**Purpose**: Connect filter state to API calls

- [X] T031 [US1] Create buildApiUrl helper function that constructs URL with optional requestorEmail parameter in src/client/src/components/MeetingRequestsList.jsx
- [X] T032 [US1] Update initial data load useEffect to include requestorParam when filterMode="my-requests" in src/client/src/components/MeetingRequestsList.jsx
- [X] T033 [US1] Update loadMore callback for infinite scroll to include requestorParam in src/client/src/components/MeetingRequestsList.jsx
- [X] T034 [US1] Add useEffect watching filterMode that resets pagination (page=1, items=[], hasMore=true) and calls loadData() in src/client/src/components/MeetingRequestsList.jsx
- [X] T035 [US1] Update count display to use totalCount from filtered API response in src/client/src/components/MeetingRequestsList.jsx
- [X] T036 [US1] Test: Click "My Requests" → verify API called with requestorEmail parameter in URL
- [X] T037 [US1] Test: Click "All Requests" → verify API called WITHOUT requestorEmail parameter

**Checkpoint**: ✅ Filter triggers correct API calls with proper parameters

---

### Frontend Integration with Existing Features

**Purpose**: Ensure filter works with search and infinite scroll

- [X] T038 [US1] Verify search functionality operates within current filter scope in src/client/src/components/MeetingRequestsList.jsx
- [X] T039 [US1] Update empty state message to be filter-aware: "You haven't created any requests yet" for my-requests mode in src/client/src/components/MeetingRequestsList.jsx
- [X] T040 [US1] Test: Search while in "My Requests" mode → results show only from user's filtered requests
- [X] T041 [US1] Test: Search while in "All Requests" mode → results show from all requests
- [X] T042 [US1] Test: Scroll to trigger infinite scroll in "My Requests" mode → page 2 respects filter
- [X] T043 [US1] Test: Toggle filter after scrolling to page 3 → pagination resets to page 1

**Checkpoint**: ✅ Filter integrates seamlessly with search and infinite scroll

---

### Frontend Tests (Test Coverage)

**Purpose**: Add unit and integration tests for filter behavior

> **NOTE**: Write these tests to cover the implemented functionality

- [ ] T044 [P] [US1] Write test: renders with "My Requests" as default filter in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T045 [P] [US1] Write test: toggle changes filter mode when clicked in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T046 [P] [US1] Write test: includes requestorEmail parameter for "My Requests" mode in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T047 [P] [US1] Write test: omits requestorEmail parameter for "All Requests" mode in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T048 [P] [US1] Write test: resets pagination when filter changes in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T049 [P] [US1] Write test: updates count display when filter changes in src/client/src/components/MeetingRequestsList.test.jsx
- [ ] T050 [US1] Run frontend tests with `npm test` - verify all tests pass

**Checkpoint**: ✅ Frontend tests pass and cover filter behavior

---

### Accessibility & Keyboard Navigation

**Purpose**: Ensure WCAG 2.1 AA compliance

- [ ] T051 [US1] Test keyboard navigation: Tab key focuses Pivot toggle
- [ ] T052 [US1] Test keyboard navigation: Arrow Left/Right switches between options
- [ ] T053 [US1] Test keyboard navigation: Enter or Space activates selected option
- [ ] T054 [US1] Install axe-core DevTools extension and run accessibility scan on /meeting-requests page
- [ ] T055 [US1] Fix any critical or serious accessibility violations found by axe-core
- [ ] T056 [US1] Test with screen reader (NVDA or JAWS): Verify toggle state is announced correctly

**Checkpoint**: ✅ Filter is fully keyboard accessible with zero WCAG violations

---

### End-to-End Tests

**Purpose**: Validate complete user workflows

- [X] T057 [US1] Create E2E test file src/client/e2e/tests/requestor-filter.spec.ts with Playwright setup
- [X] T058 [P] [US1] Write E2E test: default filter shows only user's requests in src/client/e2e/tests/requestor-filter.spec.ts
- [X] T059 [P] [US1] Write E2E test: toggle to "All Requests" shows requests from all users in src/client/e2e/tests/requestor-filter.spec.ts
- [X] T060 [P] [US1] Write E2E test: toggle back to "My Requests" filters again in src/client/e2e/tests/requestor-filter.spec.ts
- [X] T061 [P] [US1] Write E2E test: search works within filter mode in src/client/e2e/tests/requestor-filter.spec.ts
- [X] T062 [P] [US1] Write E2E test: infinite scroll respects filter in src/client/e2e/tests/requestor-filter.spec.ts
- [X] T063 [P] [US1] Write E2E test: keyboard navigation works for toggle in src/client/e2e/tests/requestor-filter.spec.ts
- [ ] T064 [US1] Run E2E tests with `npx playwright test` - verify all tests pass

**Checkpoint**: ✅ All E2E tests pass - feature works end-to-end

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, performance, and final validation

### Documentation

- [ ] T065 [P] Update README.md or user guide with filter feature description and screenshots
- [ ] T066 [P] Add inline code comments explaining filter state management in src/client/src/components/MeetingRequestsList.jsx
- [ ] T067 [P] Add inline code comments explaining backend filter logic in src/server/Controllers/MeetingRequestsController.cs
- [ ] T068 Update CHANGELOG.md with feature addition: "Added requestor filter toggle to meeting requests list"

---

### Testing & Validation

- [ ] T069 Manual testing: Verify all 7 user scenarios from spec.md work correctly
- [ ] T070 Performance testing: Measure toggle response time (target: <500ms) using browser DevTools
- [ ] T071 Performance testing: Verify filter state identifiable within 1 second (visual clarity check)
- [ ] T072 Cross-browser testing: Test in Chrome (latest version)
- [ ] T073 Cross-browser testing: Test in Firefox (latest version)
- [ ] T074 Cross-browser testing: Test in Edge (latest version)
- [ ] T075 Cross-browser testing: Test in Safari 14+ (if available)
- [ ] T076 Test with large dataset: Seed database with 1000+ requests and verify filter performance

---

### Deployment Preparation

- [ ] T077 Run complete test suite: Backend (dotnet test) + Frontend (npm test) + E2E (npx playwright test)
- [ ] T078 Check for console errors or warnings in browser DevTools
- [ ] T079 Verify no breaking changes to existing functionality (regression testing)
- [ ] T080 Create database index on RequestorEmail column if not exists: `CREATE INDEX IX_MeetingRequests_RequestorEmail ON MeetingRequests (RequestorEmail)`
- [ ] T081 Stage all changes: `git add .`
- [ ] T082 Commit with descriptive message: `git commit -m "feat: Add requestor filter toggle (FR-1 to FR-11)"`
- [ ] T083 Push branch: `git push origin 1-requestor-filter`
- [ ] T084 Create pull request with link to spec.md and test results
- [ ] T085 Address code review feedback (if any)
- [ ] T086 Merge to main branch after approval

**Checkpoint**: ✅ Feature complete, tested, documented, and deployed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify environment first
- **Foundational (Phase 2)**: Depends on Setup - MUST complete before Phase 3
- **User Story 1 (Phase 3)**: Depends on Foundational
  - Backend Extension → Frontend State → Frontend UI → API Integration → Tests
- **Polish (Phase 4)**: Depends on User Story 1 completion

### Within User Story 1

**Backend Extension (T010-T019)**:
1. T010: Create test file (no dependencies)
2. T011-T014: Write tests in parallel [P]
3. T015: Run tests (depends on T011-T014)
4. T016-T017: Implement backend (depends on T015)
5. T018-T019: Verify implementation (depends on T016-T017)

**Frontend State Setup (T020-T023)**:
- Can start after backend complete, but also works in parallel
- T020-T023 are sequential (each depends on previous)

**Frontend Toggle UI (T024-T030)**:
- Depends on T020-T023 (state must exist first)
- T024-T029 can run together, T030 is verification

**Frontend API Integration (T031-T037)**:
- Depends on T016-T019 (backend must be ready)
- T031-T035 are sequential
- T036-T037 are test verification

**Frontend Integration (T038-T043)**:
- Depends on T031-T037 (API integration must work)
- T038-T039 implementation, T040-T043 testing

**Frontend Tests (T044-T050)**:
- T044-T049 can run in parallel [P]
- T050 depends on all previous tests

**Accessibility (T051-T056)**:
- Can start anytime after T024-T030 (UI must exist)
- T051-T053 are keyboard tests (parallel possible)
- T054-T056 are accessibility validation (sequential)

**E2E Tests (T057-T064)**:
- T058-T063 can run in parallel [P] after T057
- T064 depends on all E2E tests

### Parallel Opportunities

**Backend tests** (T011-T014): All can run in parallel  
**Frontend tests** (T044-T049): All can run in parallel  
**E2E tests** (T058-T063): All can run in parallel  
**Documentation** (T065-T068): All can run in parallel  
**Cross-browser testing** (T072-T075): All can run in parallel

---

## Parallel Example: Backend Tests

```bash
# Launch all backend test files together:
Task T011: Write test List_WithRequestorEmail_ReturnsOnlyMatchingRequests
Task T012: Write test List_WithoutRequestorEmail_ReturnsAllRequests  
Task T013: Write test List_WithRequestorEmail_UpdatesTotalCount
Task T014: Write test List_WithRequestorEmail_WorksWithPagination

# Then run them all at once:
Task T015: dotnet test
```

---

## Parallel Example: Frontend Tests

```bash
# Launch all frontend test write tasks together:
Task T044: Write test renders with default filter
Task T045: Write test toggle changes filter mode
Task T046: Write test includes requestorEmail parameter
Task T047: Write test omits requestorEmail parameter
Task T048: Write test resets pagination
Task T049: Write test updates count display

# Then run them all at once:
Task T050: npm test
```

---

## Implementation Strategy

### Test-First Approach (Recommended)

1. **Phase 1-2**: Setup + Foundational (verify environment)
2. **Backend First**:
   - T010-T015: Write backend tests (tests FAIL - expected)
   - T016-T017: Implement backend filtering
   - T018-T019: Verify backend tests PASS
3. **Frontend Next**:
   - T020-T023: Add filter state
   - T024-T030: Add UI toggle
   - T031-T037: Connect to API (backend must be ready)
   - T038-T043: Integrate with existing features
4. **Test Coverage**:
   - T044-T050: Frontend unit tests
   - T057-T064: E2E tests
5. **Accessibility & Polish**:
   - T051-T056: Keyboard & WCAG compliance
   - T065-T076: Documentation & validation
6. **Deploy**:
   - T077-T086: Final checks and deployment

**Checkpoint after each stage**: Stop and manually test the feature

---

### Sequential Flow (Single Developer)

1. Complete Phase 1 (Setup) - 15 min
2. Complete Phase 2 (Foundational) - 15 min
3. Backend Extension (T010-T019) - 1 hour
4. Frontend State + UI (T020-T030) - 45 min
5. Frontend API Integration (T031-T043) - 1.5 hours
6. All Tests (T044-T064) - 2.5 hours
7. Accessibility (T051-T056) - 30 min
8. Polish & Deploy (T065-T086) - 2 hours

**Total**: ~9-10 hours (matches plan.md estimate)

---

### Parallel Team Strategy

With 2 developers:

1. **Both**: Complete Setup + Foundational (30 min)
2. **Developer A**: Backend Extension (T010-T019) - 1 hour
3. **Developer B**: Prepare frontend (T020-T023) - 15 min, wait for Developer A
4. **Once backend ready**:
   - **Developer A**: Frontend tests (T044-T050) + E2E (T057-T064) - 2 hours
   - **Developer B**: Frontend UI + API Integration (T024-T043) - 2 hours
5. **Developer A**: Accessibility (T051-T056) - 30 min
6. **Developer B**: Documentation (T065-T068) - 30 min
7. **Both**: Validation & deployment (T069-T086) - 1.5 hours

**Total**: ~6-7 hours with 2 developers

---

## Success Criteria Checklist

Before marking feature complete, verify ALL criteria from spec.md:

### Functional Requirements (FR-1 to FR-11)

- [ ] FR-1: Toggle control visible above list with "My Requests" and "All Requests" options
- [ ] FR-2: Filter defaults to "My Requests" on page load
- [ ] FR-3: User identity from MSAL matches RequestorEmail field
- [ ] FR-4: Toggle click immediately refreshes list with filtered data
- [ ] FR-5: Filter works with pagination (correct query parameters)
- [ ] FR-6: Count display shows "X of Y" for filtered dataset
- [ ] FR-7: Search operates within current filter scope
- [ ] FR-8: Filter state persists during session (resets on page refresh)
- [ ] FR-9: Infinite scroll loads filtered pages correctly
- [ ] FR-10: Toggle uses Fluent UI with clear visual active/inactive states
- [ ] FR-11: Toggle is keyboard accessible (Tab, Arrow, Enter/Space) with ARIA labels

### Success Criteria (Measurable Outcomes)

- [ ] Users can identify filter state within 1 second (visual indicators)
- [ ] Toggle response time <500ms (measure with DevTools)
- [ ] 100% keyboard operability verified
- [ ] Filter correctly shows only user's requests in "My Requests" mode
- [ ] Zero WCAG AA violations (verified with axe-core)
- [ ] Filter state persists during session navigation (95%+ success rate)
- [ ] Search and pagination work 100% correctly with filter active

### Test Coverage

- [ ] All 4 backend tests pass (src/server/Tests/)
- [ ] All 6 frontend unit tests pass (src/client/src/components/)
- [ ] All 6 E2E tests pass (src/client/e2e/tests/)
- [ ] All 7 user scenarios from spec.md manually verified

---

## Task Summary

| Phase | Task Range | Count | Estimated Time |
|-------|------------|-------|----------------|
| Setup | T001-T005 | 5 | 15 min |
| Foundational | T006-T009 | 4 | 15 min |
| Backend Extension | T010-T019 | 10 | 1 hour |
| Frontend State | T020-T023 | 4 | 20 min |
| Frontend UI | T024-T030 | 7 | 45 min |
| Frontend API | T031-T037 | 7 | 1 hour |
| Frontend Integration | T038-T043 | 6 | 45 min |
| Frontend Tests | T044-T050 | 7 | 45 min |
| Accessibility | T051-T056 | 6 | 45 min |
| E2E Tests | T057-T064 | 8 | 1.5 hours |
| Documentation | T065-T068 | 4 | 30 min |
| Validation | T069-T076 | 8 | 1.5 hours |
| Deployment | T077-T086 | 10 | 1 hour |
| **TOTAL** | **T001-T086** | **86** | **~10 hours** |

**Parallel opportunities**: 26 tasks marked [P] can run in parallel  
**Test-First tasks**: 18 tasks are tests (21% test coverage)

---

## Notes

- All paths assume repository root at `c:\Users\arath\my-project-today`
- [P] tasks = different files or independent operations
- [US1] = User Story 1 (Requestor Filter Toggle MVP)
- Tests MUST fail before implementation (Test-First principle)
- Each checkpoint is an opportunity to validate and demo progress
- Feature can be deployed after Phase 3 completion (MVP ready)
- Phase 4 (Polish) can be done post-deployment as refinements

**Ready to implement**: Follow quickstart.md for detailed step-by-step instructions for each task.
