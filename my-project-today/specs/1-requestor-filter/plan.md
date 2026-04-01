# Implementation Plan: Requestor Filter Toggle

**Branch**: `1-requestor-filter` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/1-requestor-filter/spec.md`

## Summary

Add a toggle control to the meeting requests list that allows users to filter between viewing only their own requests (default) and viewing all requests in the system. The filter integrates seamlessly with existing search and infinite scroll functionality, uses Fluent UI components for visual consistency, and defaults to "My Requests" mode on page load. Backend API is extended with an optional query parameter to filter by requestor email/username. The toggle maintains session-based state and provides clear visual feedback about the current filter mode.

**Technical Approach** (from research):
- Add requestor filtering query parameter to backend List endpoint (`?requestorEmail=user@example.com`)
- Extend MeetingRequestsList.jsx with filter state (`filterMode: "my-requests" | "all-requests"`)
- Use Fluent UI `ToggleButton` or `Pivot` component for filter control
- Integrate filter with existing pagination and search logic
- Preserve filter state in React component state (session-based, resets on refresh)
- Update count display to reflect filtered dataset
- Maintain compatibility with infinite scroll observer
- No database schema changes required (filter uses existing fields)

## Technical Context

**Language/Version**: 
- Frontend: JavaScript (ES2020+), React 18.2.0
- Backend: C# 12.0, .NET 8.0, ASP.NET Core 8.0

**Primary Dependencies**: 
- Existing: React 18.2.0, @fluentui/react-components v9.72.11, @azure/msal-react 3.0.25, Vite 5.4.21
- Backend: Microsoft.EntityFrameworkCore 8.0.0, Microsoft.AspNetCore.App 8.0.0

**Storage**: SQLite database (MeetingRequests table with RequestorName and RequestorEmail columns already exist)  

**Testing**: 
- Frontend: React Testing Library (unit tests), Playwright 1.40.0 (E2E tests)
- Backend: xUnit integration tests for API endpoints

**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), responsive web (mobile 320-640px, tablet 641-1023px, desktop 1024px+)  

**Performance Goals**: 
- Toggle response time <500ms (filter refresh)
- Filter state identification <1s (visual clarity)
- No performance degradation for infinite scroll with filter active
- API query with filter executes in <100ms for typical dataset (up to 10,000 requests)

**Constraints**: 
- WCAG 2.1 AA accessibility compliance (keyboard navigation, ARIA labels, screen reader support)
- Filter state is session-based only (resets on page refresh, not persisted to database or localStorage)
- Must work with existing search functionality (filter applies before search)
- Must integrate with existing infinite scroll without breaking pagination
- Backend API change must be backwards compatible (optional query parameter)

**Scale/Scope**: 
- Single table query optimization (add WHERE clause for requestor filtering)
- Affects 2 files: MeetingRequestsList.jsx (frontend), MeetingRequestsController.cs (backend)
- ~50-100 lines of new code across both files
- No database migrations required (uses existing columns)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Library-First Principle
**Status**: ✅ COMPLIANT  
**Rationale**: Using existing Fluent UI library components (ToggleButton/Pivot) for filter control. No custom UI library creation needed.

### CLI Interface Principle
**Status**: ✅ NOT APPLICABLE  
**Rationale**: Feature is a web UI component with no CLI interaction.

### Test-First Principle (NON-NEGOTIABLE)
**Status**: ⚠️ REQUIRES ATTENTION  
**Assessment**: 
- Backend API endpoint tests needed before implementation
- Frontend component tests needed for filter state management
- E2E tests needed for toggle interaction and filter behavior

**Compliance Plan**:
1. Write backend API test: `GET /api/meetingrequests?requestorEmail=user@example.com` returns only user's requests
2. Write backend API test: `GET /api/meetingrequests` (no filter) returns all requests
3. Write frontend unit test: Toggle state changes correctly between "my-requests" and "all-requests"
4. Write frontend integration test: API calls include correct requestor parameter based on filter state
5. Write E2E test: User sees only their requests on load, clicks toggle, sees all requests
6. Implement backend filtering logic to pass API tests
7. Implement frontend toggle component to pass unit/integration tests
8. Verify E2E tests pass

### Integration Testing Principle
**Status**: ✅ COMPLIANT (with plan)  
**Assessment**: 
- Backend integration test will verify API filter parameter affects query results
- Frontend integration test will verify filter state propagates to API calls
- E2E test will verify end-to-end filter behavior including pagination

**Plan**: Create integration test suite covering:
- Backend: Filter query returns correct subset of requests
- Frontend: Toggle triggers API call with correct filter parameter
- End-to-end: Filter works with search and infinite scroll

### Observability & Versioning Principle
**Status**: ✅ COMPLIANT  
**Assessment**: 
- Backend API change is backwards compatible (optional query parameter)
- No version bump required (non-breaking change)
- Frontend component change is internal (no public API change)
- Existing logging will capture API requests with filter parameter

**Summary**: Feature compliant with constitution. Primary action: Write tests before implementation per Test-First principle.

## Project Structure

### Documentation (this feature)

```text
specs/1-requestor-filter/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: Filter implementation patterns, backend query optimization
├── data-model.md        # Phase 1 output: Filter state structure, API contract
├── quickstart.md        # Phase 1 output: Step-by-step implementation guide
├── contracts/           # Phase 1 output: API and component contracts
│   └── README.md        # Filter API endpoint spec, component props, state management
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

**Relevant Structure for this Feature**:

```text
my-project-today/
├── src/
│   ├── client/                        # Frontend SPA (React + Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── MeetingRequestsList.jsx  # ✏️ PRIMARY FILE: Add filter toggle
│   │   │   └── auth/
│   │   │       └── useAuth.js        # Read user identity for filter
│   │   └── e2e/
│   │       └── tests/
│   │           └── filter.spec.ts    # ✅ CREATE: E2E tests for filter
│   └── server/                        # Backend API (.NET 8)
│       ├── Controllers/
│       │   └── MeetingRequestsController.cs  # ✏️ UPDATE: Add requestorEmail query param
│       └── Tests/
│           └── MeetingRequestsControllerTests.cs  # ✅ CREATE: API filter tests
└── specs/
    └── 1-requestor-filter/            # This feature's documentation
```

**File Change Summary**:
- **Create**: 
  - `src/server/Tests/MeetingRequestsControllerTests.cs` (backend API tests)
  - `src/client/e2e/tests/filter.spec.ts` (E2E filter tests)
  - `specs/1-requestor-filter/research.md`
  - `specs/1-requestor-filter/data-model.md`
  - `specs/1-requestor-filter/quickstart.md`
  - `specs/1-requestor-filter/contracts/README.md`
- **Modify**: 
  - `src/server/Controllers/MeetingRequestsController.cs` (add filter parameter to List endpoint)
  - `src/client/src/components/MeetingRequestsList.jsx` (add toggle control, filter state, filtered API calls)
- **Delete**: None

**Structure Decision**: 
- Standard web application structure with frontend/backend separation
- Frontend filter state managed in React component (no global state management needed)
- Backend filtering implemented as optional query parameter (backwards compatible)
- Tests colocated with relevant code (backend tests in server/, E2E tests in client/e2e/)

---

## Phase 0: Research

**Objective**: Resolve all NEEDS CLARIFICATION items, research implementation patterns, document technology decisions.

### Research Tasks

**Task 1**: Backend filtering implementation patterns
- **Question**: Best practice for filtering by user identity in ASP.NET Core with Entity Framework?
- **Research Areas**:
  - Query parameter vs. header-based filtering
  - LINQ Where clause optimization for requestor filtering
  - Index optimization for RequestorEmail column
  - Backwards compatibility patterns for optional filters
- **Decision Needed**: Use `?requestorEmail=` query parameter or `?myRequests=true` boolean flag?

**Task 2**: User identity extraction from authentication context
- **Question**: How to reliably get current user's email from MSAL authentication in both frontend and backend?
- **Research Areas**:
  - MSAL React hooks for user email extraction
  - ASP.NET Core User.Identity claims for email
  - Matching strategy: email vs. username vs. object ID
- **Decision Needed**: Which user identity field to use for matching (email, username, or both)?

**Task 3**: Fluent UI toggle component selection
- **Question**: Which Fluent UI component best represents a two-state filter toggle?
- **Research Areas**:
  - `ToggleButton` component (button with pressed state)
  - `Pivot` component (tab-like selection)
  - `MenuButton` with checkmark for selected option
  - Accessibility considerations for each option
- **Decision Needed**: Which component provides clearest UX for filter mode?

**Task 4**: Filter state management strategy
- **Question**: Should filter state be in React component state, context, or URL query parameter?
- **Research Areas**:
  - React useState vs. URL query params for filter state
  - Session persistence approaches (sessionStorage, React state, URL)
  - Interaction with browser back/forward navigation
  - Reset behavior on page refresh
- **Decision Needed**: Storage mechanism for filter state (requirement says session-based, resets on refresh)?

**Task 5**: Integration with infinite scroll
- **Question**: How to reset infinite scroll pagination when filter changes?
- **Research Areas**:
  - Reset page counter to 1 when filter toggles
  - Clear existing items array before loading filtered page 1
  - Intersection Observer disconnect/reconnect strategy
  - Loading state management during filter change
- **Decision Needed**: Pagination reset strategy to avoid stale data?

### Expected Outputs

- `research.md` document containing:
  - Backend filtering: Use `?requestorEmail=user@example.com` query parameter (compatible, explicit)
  - User identity: Extract email from MSAL account.username in frontend, User.FindFirst("email") in backend
  - Toggle component: Use Fluent UI `Pivot` component (clear visual separation, accessible)
  - State management: React useState in MeetingRequestsList component (session-based, resets on refresh)
  - Infinite scroll: Reset page to 1, clear items array, setHasMore(true) when filter changes

---

## Phase 1: Design & Contracts

**Objective**: Generate data models, API contracts, component interfaces, and quickstart guide.

### Design Tasks

**Task 1**: Data model for filter state
- Define filter state structure in React component
- Define API request/response contract with filter parameter
- Document user identity matching logic

**Task 2**: API contract for filtered requests endpoint
- Extend existing `GET /api/meetingrequests` endpoint
- Add optional `requestorEmail` query parameter
- Define response format (existing paginated response format)
- Document backwards compatibility

**Task 3**: Component interface contract
- Define props for MeetingRequestsList component (no changes to props)
- Define internal state for filter mode
- Define toggle event handlers
- Document integration with existing search and pagination

**Task 4**: Quickstart implementation guide
- Step-by-step instructions for backend API change
- Step-by-step instructions for frontend toggle addition
- Testing procedures (backend, frontend, E2E)
- Deployment considerations

### Expected Outputs

- `data-model.md`:
  - Filter state structure: `{ filterMode: "my-requests" | "all-requests", userEmail: string }`
  - User matching logic: Compare request.requestorEmail with current user's account.username
  - API query parameter: `requestorEmail` string (optional)

- `contracts/README.md`:
  - API endpoint spec: `GET /api/meetingrequests?page=1&pageSize=20&requestorEmail=user@example.com`
  - Response format: Existing paginated response `{ items, page, pageSize, totalCount, hasMore }`
  - Component state: Filter mode, toggle handlers, API integration points
  - Test contracts: API test cases, component test cases, E2E test scenarios

- `quickstart.md`:
  - Backend implementation steps (5-7 steps)
  - Frontend implementation steps (8-10 steps)
  - Testing checklist
  - Rollout plan

---

## Phase 2: Implementation Breakdown

**Objective**: Break down implementation into granular, testable tasks with acceptance criteria.

### Backend Implementation (API Filtering)

**Task Group 1**: Backend API Tests (Test-First)
- [ ] **Task 1.1**: Create MeetingRequestsControllerTests.cs test file
  - Acceptance: Test file exists with xUnit setup
  - Estimate: 15 minutes
  
- [ ] **Task 1.2**: Write test: Filter by requestor email returns only matching requests
  - Test: GET /api/meetingrequests?requestorEmail=user@example.com returns only requests with that requestorEmail
  - Acceptance: Test fails (filter not implemented yet)
  - Estimate: 20 minutes
  
- [ ] **Task 1.3**: Write test: No filter parameter returns all requests
  - Test: GET /api/meetingrequests returns all requests (backwards compatibility)
  - Acceptance: Test passes (existing behavior)
  - Estimate: 10 minutes

**Task Group 2**: Backend API Implementation
- [ ] **Task 2.1**: Add requestorEmail query parameter to List method signature
  - Update: `public async Task<IActionResult> List([FromQuery] string? requestorEmail, ...)`
  - Acceptance: Parameter available in controller method
  - Estimate: 5 minutes
  
- [ ] **Task 2.2**: Add LINQ Where clause for requestor filtering
  - Logic: `if (!string.IsNullOrWhiteSpace(requestorEmail)) q = q.Where(x => x.RequestorEmail == requestorEmail || x.RequestorName == requestorEmail);`
  - Acceptance: Query filters by requestorEmail when parameter provided
  - Estimate: 10 minutes
  
- [ ] **Task 2.3**: Run backend tests - verify all pass
  - Acceptance: All API tests pass (filter test, backwards compatibility test)
  - Estimate: 5 minutes

**Total Backend Estimate**: 65 minutes (~1 hour)

### Frontend Implementation (Toggle Control)

**Task Group 3**: Frontend Component Tests (Test-First)
- [ ] **Task 3.1**: Add filter state to MeetingRequestsList component
  - Add: `const [filterMode, setFilterMode] = useState("my-requests")`
  - Acceptance: State variable exists
  - Estimate: 5 minutes
  
- [ ] **Task 3.2**: Write unit test: Initial filter mode is "my-requests"
  - Test: Component renders with filterMode = "my-requests"
  - Acceptance: Test fails if default is not "my-requests"
  - Estimate: 15 minutes
  
- [ ] **Task 3.3**: Write unit test: Toggle changes filter mode
  - Test: Clicking toggle changes filterMode from "my-requests" to "all-requests" and vice versa
  - Acceptance: Test fails (toggle not implemented yet)
  - Estimate: 20 minutes

**Task Group 4**: Frontend Toggle UI
- [ ] **Task 4.1**: Import Fluent UI Pivot component
  - Add: `import { Pivot, PivotItem } from '@fluentui/react-components'`
  - Acceptance: Component imported without errors
  - Estimate: 5 minutes
  
- [ ] **Task 4.2**: Add Pivot toggle control above meeting requests list
  - UI: Render Pivot with two PivotItems ("My Requests", "All Requests")
  - Position: Above filter tabs, before "Showing X of Y" count
  - Acceptance: Toggle visible in UI
  - Estimate: 20 minutes
  
- [ ] **Task 4.3**: Wire toggle to filterMode state
  - Logic: `selectedKey={filterMode}` and `onTabSelect={(_, { value }) => setFilterMode(value)}`
  - Acceptance: Clicking toggle updates filterMode state
  - Estimate: 10 minutes
  
- [ ] **Task 4.4**: Add visual styling for active/inactive toggle states
  - Style: Use Fluent UI's default Pivot styling (no custom CSS needed)
  - Acceptance: Active filter is visually distinct
  - Estimate: 5 minutes

**Task Group 5**: Frontend API Integration
- [ ] **Task 5.1**: Extract user email from MSAL authentication context
  - Logic: `const userEmail = accounts[0]?.username`
  - Acceptance: userEmail contains authenticated user's email
  - Estimate: 5 minutes
  
- [ ] **Task 5.2**: Update initial data load to include filter parameter
  - Modify: `fetch(/api/meetingrequests?page=1&pageSize=20&requestorEmail=${filterMode === 'my-requests' ? userEmail : ''})`
  - Acceptance: Initial API call includes requestorEmail when in "my-requests" mode
  - Estimate: 15 minutes
  
- [ ] **Task 5.3**: Update infinite scroll loadMore to include filter parameter
  - Modify: loadMore function to append requestorEmail parameter based on filterMode
  - Acceptance: Subsequent pages respect current filter mode
  - Estimate: 10 minutes
  
- [ ] **Task 5.4**: Reset pagination when filter mode changes
  - Logic: useEffect watching filterMode, reset page=1, clear items array, call load()
  - Acceptance: Changing filter refreshes list from page 1
  - Estimate: 15 minutes
  
- [ ] **Task 5.5**: Update count display to reflect filtered dataset
  - Modify: "Showing X of Y" count uses totalCount from filtered API response
  - Acceptance: Count updates when filter changes
  - Estimate: 5 minutes

**Task Group 6**: Frontend Integration & Search
- [ ] **Task 6.1**: Verify search works with filter mode
  - Test: Search operates on filtered dataset (my requests or all requests)
  - Acceptance: Search results respect current filter mode
  - Estimate: 10 minutes
  
- [ ] **Task 6.2**: Add contextual empty state message
  - Logic: Display "You haven't created any requests yet" when filterMode="my-requests" and items.length=0
  - Acceptance: Empty state message is filter-aware
  - Estimate: 10 minutes

**Task Group 7**: Accessibility & Polish
- [ ] **Task 7.1**: Add ARIA labels to Pivot component
  - Add: `aria-label="Filter meeting requests by requestor"`
  - Acceptance: Screen reader announces toggle purpose
  - Estimate: 5 minutes
  
- [ ] **Task 7.2**: Verify keyboard navigation works
  - Test: Tab to toggle, Arrow keys to switch options, Enter/Space to select
  - Acceptance: Keyboard-only users can operate toggle
  - Estimate: 10 minutes
  
- [ ] **Task 7.3**: Run axe-core accessibility scan on toggle
  - Tool: axe DevTools or @axe-core/react
  - Acceptance: Zero critical accessibility violations
  - Estimate: 10 minutes

**Total Frontend Estimate**: 160 minutes (~2.7 hours)

### End-to-End Testing

**Task Group 8**: E2E Tests
- [ ] **Task 8.1**: Create filter.spec.ts E2E test file
  - Setup: Playwright test file with authentication setup
  - Acceptance: Test file runs
  - Estimate: 15 minutes
  
- [ ] **Task 8.2**: Write E2E test: Default filter shows only user's requests
  - Test: Login → navigate to list → verify only current user's requests visible
  - Acceptance: Test passes
  - Estimate: 25 minutes
  
- [ ] **Task 8.3**: Write E2E test: Toggle to "All Requests" shows all requests
  - Test: Click toggle → verify requests from all users visible
  - Acceptance: Test passes
  - Estimate: 20 minutes
  
- [ ] **Task 8.4**: Write E2E test: Toggle back to "My Requests" filters again
  - Test: Click toggle twice → verify back to user's requests only
  - Acceptance: Test passes
  - Estimate: 15 minutes
  
- [ ] **Task 8.5**: Write E2E test: Search works within filter mode
  - Test: Toggle to "All Requests" → search → verify results from all users
  - Acceptance: Test passes
  - Estimate: 20 minutes
  
- [ ] **Task 8.6**: Write E2E test: Infinite scroll respects filter
  - Test: Toggle to "My Requests" → scroll to load more → verify page 2 is filtered
  - Acceptance: Test passes
  - Estimate: 20 minutes

**Total E2E Estimate**: 115 minutes (~2 hours)

### Documentation & Rollout

**Task Group 9**: Documentation
- [ ] **Task 9.1**: Update README or user documentation with filter feature
  - Content: Describe "My Requests" vs "All Requests" toggle
  - Acceptance: Documentation clear and accurate
  - Estimate: 20 minutes
  
- [ ] **Task 9.2**: Add inline code comments for filter logic
  - Comments: Explain filter state management, API integration, pagination reset
  - Acceptance: Code reviewable and maintainable
  - Estimate: 15 minutes

**Task Group 10**: Testing & Validation
- [ ] **Task 10.1**: Manual testing - verify all user scenarios from spec
  - Test: All 7 user scenarios from spec.md
  - Acceptance: All scenarios work as specified
  - Estimate: 30 minutes
  
- [ ] **Task 10.2**: Performance testing - verify toggle response time <500ms
  - Test: Measure time from toggle click to list refresh
  - Acceptance: Response time meets performance goal
  - Estimate: 15 minutes
  
- [ ] **Task 10.3**: Cross-browser testing - Chrome, Firefox, Safari, Edge
  - Test: Toggle functionality across browsers
  - Acceptance: Works in all target browsers
  - Estimate: 20 minutes

**Total Documentation & Testing Estimate**: 100 minutes (~1.7 hours)

---

## Total Effort Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 0: Research | 5 research topics | 2-3 hours |
| Backend API | 6 tasks | 1 hour |
| Frontend Toggle | 18 tasks | 2.7 hours |
| E2E Testing | 6 tasks | 2 hours |
| Documentation & Validation | 5 tasks | 1.7 hours |
| **TOTAL** | **40 tasks** | **9-10 hours** |

**Risk Buffer**: Add 20% for unexpected issues = **11-12 hours total**

---

## Success Criteria Checklist

- [ ] Toggle control visible above meeting requests list (FR-1)
- [ ] Default filter is "My Requests" on page load (FR-2)
- [ ] User identity correctly matches requestorEmail field (FR-3)
- [ ] Toggle action refreshes list with filtered data (FR-4)
- [ ] Pagination works with filter active (FR-5)
- [ ] Count display reflects filtered dataset (FR-6)
- [ ] Search operates within current filter scope (FR-7)
- [ ] Filter state persists during session navigation (FR-8)
- [ ] Infinite scroll loads filtered pages (FR-9)
- [ ] Toggle has clear visual active/inactive states (FR-10)
- [ ] Toggle is keyboard accessible with ARIA labels (FR-11)
- [ ] Toggle response time <500ms (Success Criteria)
- [ ] Filter state identifiable within 1s (Success Criteria)
- [ ] 100% keyboard operability (Success Criteria)
- [ ] Zero WCAG AA violations (Success Criteria)
- [ ] All E2E tests pass (Integration Testing Principle)
- [ ] All unit tests pass (Test-First Principle)

---

## Implementation Notes

**Technology Decisions** (to be finalized in Phase 0 research.md):
- **Backend filter parameter**: `?requestorEmail=user@example.com` (recommended: explicit, compatible)
- **Toggle component**: Fluent UI `Pivot` (recommended: clear visual separation, accessible)
- **State management**: React useState in MeetingRequestsList (recommended: simple, session-based)
- **User identity matching**: Compare requestorEmail field with MSAL account.username (recommended: reliable)
- **Pagination reset**: Clear items array, reset page to 1, reload when filter changes (recommended: clean state)

**Backwards Compatibility**:
- Backend API optional parameter ensures existing clients work without filter
- Frontend gracefully handles missing requestorEmail in existing records (treat as empty)

**Future Enhancements** (out of scope for this feature):
- Persist filter preference in localStorage across sessions
- Add keyboard shortcuts (Ctrl+M, Ctrl+A)
- Add filter mode indicator badge with counts
- Team-based filtering (show requests from specific team)

---

**Plan Status**: ✅ READY FOR PHASE 0 RESEARCH  
**Next Command**: Review this plan, then proceed to generate research.md with detailed technology decisions.
