# Implementation Plan: Pre-register Button for Announced Requests

**Branch**: `007-preregister` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-preregister/spec.md`

## Summary

Add a "Pre-register" button to meeting requests with status "Announced", allowing authenticated users to express their intent to attend. The feature records pre-registration with user details, prevents duplicates, allows cancellation and re-registration, displays active registration count as a badge on meeting cards, and shows the full list of registrants in the detail view. Backend implements new MeetingRequestPreRegistration entity with soft-delete support for cancellations. Frontend integrates button with existing meeting card and detail components, using Fluent UI styling for visual consistency. Pre-registration is non-binding and informational only.

**Technical Approach** (from requirements):
- Create new database table `MeetingRequestPreRegistrations` with foreign key to `MeetingRequests`
- Implement REST API endpoints: POST /api/meetingrequests/{id}/preregister, DELETE /api/meetingrequests/{id}/preregister, GET /api/meetingrequests/{id}/preregistrations
- Add `PreRegistrationCount` property to MeetingRequest DTO (calculated from active registrations)
- Extend MeetingRequestCard component to show pre-registration count badge
- Extend MeetingRequestDetail component to display pre-register button and registrants list
- Extract user identity from MSAL authentication (userId from claims, userName from accounts[0].name, email from accounts[0].username)
- Implement duplicate prevention with unique constraint on (MeetingRequestId, UserId)
- Use soft-delete pattern: set CancelledAt timestamp instead of hard deleting records
- Conditional button rendering: only show for status === "Announced"
- Optimistic UI updates for immediate feedback

## Technical Context

**Language/Version**: 
- Frontend: JavaScript (ES2020+), React 18.2.0
- Backend: C# 12.0, .NET 8.0, ASP.NET Core 8.0

**Primary Dependencies**: 
- Existing: React 18.2.0, @fluentui/react-components v9.72.11, @azure/msal-react 3.0.25, Vite 5.4.21
- Backend: Microsoft.EntityFrameworkCore 8.0.0, Microsoft.AspNetCore.App 8.0.0, SQLite database

**Storage**: 
- New table: `MeetingRequestPreRegistrations` (SQLite)
- Columns: Id (int PK), MeetingRequestId (int FK), UserId (string), UserName (string), UserEmail (string), RegisteredAt (datetime), CancelledAt (datetime nullable), Status (string)
- Index on (MeetingRequestId, UserId) with unique constraint for active registrations
- Relationship: MeetingRequestPreRegistrations.MeetingRequestId → MeetingRequests.Id (many-to-one with cascade read)

**Testing**: 
- Frontend: React Testing Library (unit tests), Playwright 1.40.0 (E2E tests for registration flow)
- Backend: xUnit integration tests (API endpoints, duplicate prevention, soft-delete)
- Database: Test migration rollback and re-apply

**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), responsive web (mobile 320-640px, tablet 641-1023px, desktop 1024px+)  

**Performance Goals**: 
- Pre-registration POST request completes in <500ms
- Count badge updates within 1s of registration (optimistic UI)
- Registrations list loads in <2s for meetings with up to 100 registrants
- Button state change provides immediate visual feedback (no spinner for simple POST)
- Cancel registration completes within 1s

**Constraints**: 
- WCAG 2.1 AA accessibility compliance (button keyboard accessible, ARIA labels for count badge)
- Pre-register button ONLY visible for status === "Announced" (not Draft, Pending, Approved, Confirmed, Cancelled)
- One active registration per user per meeting (unique constraint enforced)
- Soft-delete only: cancelled registrations retained in database with CancelledAt timestamp
- Authentication required: unauthenticated users see disabled button or sign-in prompt
- Pre-registration is non-binding and informational (no approval workflow)
- Must work with existing MSAL authentication infrastructure

**Scale/Scope**: 
- New table with potential for 1000s of registrations across all meetings
- Affects 5 files: DbContext, Controller, MeetingRequestCard.jsx, MeetingRequestDetail.jsx, Migration
- ~300-400 lines of new code (150 backend, 150 frontend, plus tests)
- Database migration required (additive, no destructive changes)
- No impact on existing meeting request functionality

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Library-First Principle
**Status**: ✅ COMPLIANT  
**Rationale**: Using existing Fluent UI components (Button, Badge, List) for pre-register UI. Uses Entity Framework Core for ORM (existing library). No custom libraries created.

### CLI Interface Principle
**Status**: ✅ NOT APPLICABLE  
**Rationale**: Feature is a web UI component with no CLI interaction.

### Test-First Principle (NON-NEGOTIABLE)
**Status**: ⚠️ REQUIRES ATTENTION  
**Assessment**: 
- Backend API endpoint tests needed before implementation
- Database migration test needed (migration up/down)
- Frontend component tests needed for button state management
- E2E tests needed for full registration flow
- Duplicate prevention test critical for data integrity

**Compliance Plan**:
1. **Database tests**: Write migration test to verify table creation and rollback
2. **Backend API tests**: 
   - POST /preregister creates record with correct user data
   - POST /preregister returns 409 for duplicate registration
   - DELETE /preregister soft-deletes (sets CancelledAt, changes Status)
   - GET /preregistrations returns active registrations only
3. **Frontend unit tests**: 
   - Button renders only for "Announced" status
   - Button shows "Registered" state after successful registration
   - Count badge displays correct number
4. **Frontend integration tests**: 
   - Registration API call includes correct meetingRequestId and user identity
   - Cancellation updates UI state correctly
5. **E2E tests**: 
   - Complete flow: view announced meeting → pre-register → verify registration shown → cancel → verify registration removed
6. **Implement code** to pass all tests

### Integration Testing Principle
**Status**: ✅ COMPLIANT (with plan)  
**Assessment**: 
- Backend integration test will verify full registration lifecycle (create → read → cancel → verify soft-delete)
- Frontend integration test will verify API calls propagate to UI state
- E2E test will verify end-to-end flow including authentication

**Plan**: Create integration test suite covering:
- Backend: Registration CRUD operations, duplicate prevention, soft-delete behavior, count calculation
- Frontend: Button state management, API integration, optimistic updates
- End-to-end: Authenticated user registration flow with cancellation

### Observability & Versioning Principle
**Status**: ✅ COMPLIANT  
**Assessment**: 
- Database change is additive (new table, no modifications to existing schema)
- API change is additive (new endpoints, no breaking changes to existing endpoints)
- No version bump required (non-breaking change)
- Existing logging will capture new API requests
- Consider adding structured logging for registration events (audit trail)

**Summary**: Feature compliant with constitution. Primary action: Write comprehensive tests before implementation per Test-First principle. Database migration is additive and reversible.

## Project Structure

### Documentation (this feature)

```text
specs/007-preregister/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: Registration patterns, soft-delete strategies, duplicate prevention
├── data-model.md        # Phase 1 output: MeetingRequestPreRegistration entity, migration plan
├── quickstart.md        # Phase 1 output: Step-by-step implementation guide
├── contracts/           # Phase 1 output: API and component contracts
│   └── README.md        # API endpoint specs, DTO contracts, component props
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

**Relevant Structure for this Feature**:

```text
my-project-today/
├── src/
│   ├── client/                                  # Frontend SPA (React + Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── MeetingRequestCard.jsx      # ✏️ UPDATE: Add pre-registration count badge
│   │   │   │   ├── MeetingRequestDetail.jsx    # ✏️ UPDATE: Add pre-register button & list
│   │   │   │   └── PreRegistrationList.jsx     # ✅ CREATE: Display registrants list component
│   │   │   └── auth/
│   │   │       └── useAuth.js                  # Read user identity for registration
│   │   └── e2e/
│   │       └── tests/
│   │           └── preregister.spec.ts         # ✅ CREATE: E2E tests for registration flow
│   └── server/                                  # Backend API (.NET 8)
│       ├── Data/
│       │   └── MeetingRequestsDbContext.cs     # ✏️ UPDATE: Add MeetingRequestPreRegistration DbSet
│       ├── Models/
│       │   └── MeetingRequestPreRegistration.cs # ✅ CREATE: Entity model
│       ├── Controllers/
│       │   └── MeetingRequestsController.cs    # ✏️ UPDATE: Add pre-register endpoints
│       ├── Migrations/
│       │   └── YYYYMMDDHHMMSS_AddPreRegistration.cs  # ✅ CREATE: Database migration
│       └── Tests/
│           ├── MeetingRequestsControllerTests.cs    # ✏️ UPDATE: Add pre-register API tests
│           └── PreRegistrationIntegrationTests.cs   # ✅ CREATE: Registration lifecycle tests
└── specs/
    └── 007-preregister/                         # This feature's documentation
```

**File Change Summary**:
- **Create**: 
  - `src/server/Models/MeetingRequestPreRegistration.cs` (entity model)
  - `src/server/Migrations/YYYYMMDDHHMMSS_AddPreRegistration.cs` (database migration)
  - `src/server/Tests/PreRegistrationIntegrationTests.cs` (integration tests)
  - `src/client/src/components/PreRegistrationList.jsx` (registrants list component)
  - `src/client/e2e/tests/preregister.spec.ts` (E2E tests)
  - `specs/007-preregister/research.md`
  - `specs/007-preregister/data-model.md`
  - `specs/007-preregister/quickstart.md`
  - `specs/007-preregister/contracts/README.md`
  
- **Modify**: 
  - `src/server/Data/MeetingRequestsDbContext.cs` (add DbSet)
  - `src/server/Controllers/MeetingRequestsController.cs` (add 3 endpoints)
  - `src/server/Tests/MeetingRequestsControllerTests.cs` (add API tests)
  - `src/client/src/components/MeetingRequestCard.jsx` (add count badge)
  - `src/client/src/components/MeetingRequestDetail.jsx` (add button and list)
  
- **Delete**: None

**Structure Decision**: 
- Standard web application structure with frontend/backend separation
- Pre-registration data managed via new entity with foreign key relationship
- Frontend registration state managed locally in MeetingRequestDetail component (no global state management needed)
- Backend implements soft-delete pattern for audit trail and data retention
- Tests colocated with relevant code (backend tests in server/Tests/, E2E tests in client/e2e/)

---

## Phase 0: Research

**Objective**: Resolve all technical unknowns, research implementation patterns, document technology decisions.

### Research Tasks

**Task 1**: Soft-delete pattern for pre-registrations
- **Question**: Best practice for implementing soft-delete with Entity Framework Core to retain cancelled registrations?
- **Research Areas**:
  - Use `CancelledAt` datetime nullable column vs. `IsDeleted` boolean flag
  - Query filter configuration with `.HasQueryFilter(e => e.CancelledAt == null)` to exclude cancelled by default
  - Explicit inclusion of cancelled registrations when needed
  - Impact on count calculations and list queries
- **Decision Needed**: Column approach (CancelledAt datetime recommended for audit trail)

**Task 2**: Duplicate prevention strategy
- **Question**: How to enforce one active registration per user per meeting at database and API level?
- **Research Areas**:
  - Unique constraint on (MeetingRequestId, UserId) - conflicts with soft-delete reactivation
  - Unique index with filtered predicate (WHERE CancelledAt IS NULL) - SQLite limitations?
  - API-level duplicate check before INSERT
  - Race condition handling for concurrent registration attempts
- **Decision Needed**: Database constraint vs. API validation (likely API validation due to SQLite unique index limitations with WHERE clause)

**Task 3**: User identity extraction from JWT claims
- **Question**: Which JWT claims should be used for UserId, UserName, UserEmail in ASP.NET Core?
- **Research Areas**:
  - Azure AD claims: `sub` (subject), `oid` (object ID), `preferred_username`, `name`, `email`, `upn`
  - Best practice for stable user ID (oid vs. sub)
  - Handling missing name or email claims
  - Frontend: MSAL account object properties (accounts[0].localAccountId, .name, .username)
- **Decision Needed**: UserId = oid/sub/localAccountId, UserName = name, UserEmail = preferred_username/email (align with existing MeetingRequests.RequestorEmail logic)

**Task 4**: Pre-registration count calculation strategy
- **Question**: Should count be calculated on-demand, cached in MeetingRequest table, or aggregated in DTO?
- **Research Areas**:
  - Real-time count: `.Include(m => m.PreRegistrations.Where(p => p.CancelledAt == null)).Count()` in List query
  - Cached count: Add `PreRegistrationCount` column to MeetingRequests, update on register/cancel
  - DTO projection: Calculate during SELECT mapping with GROUP BY or subquery
  - Performance impact for large datasets
- **Decision Needed**: Real-time calculation in DTO projection (recommended: accurate, acceptable performance for expected scale)

**Task 5**: Frontend button state management
- **Question**: How to manage registration state in UI (optimistic updates vs. wait for API response)?
- **Research Areas**:
  - Optimistic UI: Update button state immediately, rollback on API error
  - Pessimistic UI: Disable button, show spinner, update after successful response
  - Local state management: useState in MeetingRequestDetail component vs. shared context
  - Cache invalidation: Refresh meeting details after registration to get updated count
- **Decision Needed**: Optimistic UI with error rollback (recommended: better UX)

**Task 6**: Registrants list UI component design
- **Question**: Which Fluent UI component best displays list of registered users with names and timestamps?
- **Research Areas**:
  - `List` component with `ListItem` (simple, accessible)
  - `DataGrid` component (overkill for simple list)
  - Custom styled `<ul>` with Fluent tokens (more control)
  - Avatar integration for user display names
  - Sorting options (by registration time, by name)
- **Decision Needed**: Fluent UI `List` component (recommended: accessible, styled, appropriate for use case)

### Expected Outputs

- `research.md` document containing:
  - **Soft-delete pattern**: Use `CancelledAt` datetime nullable column, configure global query filter to exclude cancelled, calculate active registrations with `WHERE CancelledAt IS NULL`
  - **Duplicate prevention**: API-level validation (check existing active registration before INSERT), return 409 Conflict for duplicates, avoid unique constraint due to soft-delete re-registration complexity
  - **User identity**: UserId = User.FindFirst("oid")?.Value ?? User.FindFirst("sub")?.Value, UserName = User.FindFirst("name")?.Value, UserEmail = User.FindFirst("preferred_username")?.Value ?? User.FindFirst("email")?.Value (align with existing auth logic)
  - **Count calculation**: Real-time calculation using `.Count(p => p.CancelledAt == null)` in DTO projection, acceptable performance for expected scale (<1000 registrations per meeting)
  - **Button state management**: Optimistic UI updates with async setState and error rollback, show inline error message on failure
  - **Registrants list UI**: Fluent UI `List` component with `ListItem`, display name + "registered on {date}", sort by RegisteredAt descending (most recent first)

---

## Phase 1: Design & Contracts

**Objective**: Generate data models, API contracts, component interfaces, and quickstart guide.

### Design Tasks

**Task 1**: Data model for MeetingRequestPreRegistration entity
- Define entity class with properties and relationships
- Define database migration script
- Configure Entity Framework relationships and indexes
- Document soft-delete query filter configuration

**Task 2**: API contracts for pre-registration endpoints
- POST /api/meetingrequests/{id}/preregister - Create registration
- DELETE /api/meetingrequests/{id}/preregister - Cancel registration (soft-delete)
- GET /api/meetingrequests/{id}/preregistrations - List registrants
- Update GET /api/meetingrequests/{id} and List responses to include `preRegistrationCount` property
- Define request/response DTOs and error responses (400, 401, 404, 409)

**Task 3**: Component interface contracts
- Define props for MeetingRequestCard (add preRegistrationCount to meeting object)
- Define props for MeetingRequestDetail (add button and list section)
- Define props for PreRegistrationList component (registrations array, loading state)
- Define registration state management in MeetingRequestDetail component
- Document button visibility logic (status === "Announced")

**Task 4**: Quickstart implementation guide
- Step-by-step instructions for database migration
- Step-by-step instructions for backend API endpoints
- Step-by-step instructions for frontend components
- Testing procedures (migration test, backend tests, frontend tests, E2E tests)
- Deployment considerations (migration order)

### Expected Outputs

- `data-model.md`:
  - **MeetingRequestPreRegistration entity**:
    ```csharp
    public class MeetingRequestPreRegistration {
      public int Id { get; set; }
      public int MeetingRequestId { get; set; }
      public string UserId { get; set; }
      public string UserName { get; set; }
      public string UserEmail { get; set; }
      public DateTime RegisteredAt { get; set; }
      public DateTime? CancelledAt { get; set; }
      public string Status { get; set; } // "Registered" or "Cancelled"
      public MeetingRequest MeetingRequest { get; set; }
    }
    ```
  - **Relationships**: MeetingRequest.PreRegistrations (one-to-many), MeetingRequestPreRegistration.MeetingRequest (many-to-one)
  - **Indexes**: Index on MeetingRequestId for efficient queries
  - **Query filter**: `.HasQueryFilter(p => p.CancelledAt == null)` to exclude cancelled registrations globally

- `contracts/README.md`:
  - **API endpoints**:
    - `POST /api/meetingrequests/{id}/preregister` → 201 Created with registration object, 409 Conflict if duplicate, 404 if meeting not found
    - `DELETE /api/meetingrequests/{id}/preregister` → 204 No Content on success, 404 if registration not found
    - `GET /api/meetingrequests/{id}/preregistrations` → 200 OK with array of { id, userName, userEmail, registeredAt }
  - **DTO changes**: Add `preRegistrationCount: number` to MeetingRequest DTO
  - **Component contracts**:
    - MeetingRequestCard: Expects `meeting.preRegistrationCount` for badge display
    - MeetingRequestDetail: Manages registration state (isRegistered, isRegistering), renders PreRegistrationList
    - PreRegistrationList: Props `{ registrations: Array, loading: boolean }`

- `quickstart.md`:
  - **Phase 1**: Create entity model and migration (30 min)
  - **Phase 2**: Implement backend API endpoints (2 hours)
  - **Phase 3**: Update DTO and List query to include count (30 min)
  - **Phase 4**: Add count badge to MeetingRequestCard (30 min)
  - **Phase 5**: Add pre-register button to MeetingRequestDetail (1 hour)
  - **Phase 6**: Create PreRegistrationList component (1 hour)
  - **Phase 7**: Write and run all tests (3 hours)
  - **Phase 8**: Deploy migration and test in staging (1 hour)

---

## Phase 2: Implementation Breakdown

**Objective**: Break down implementation into granular, testable tasks with acceptance criteria.

### Database & Entity Model

**Task Group 1**: Database Migration (Test-First)
- [ ] **Task 1.1**: Create MeetingRequestPreRegistration.cs entity model
  - Properties: Id, MeetingRequestId, UserId, UserName, UserEmail, RegisteredAt, CancelledAt, Status
  - Navigation: MeetingRequest property
  - Acceptance: Entity compiles without errors
  - Estimate: 10 minutes
  
- [ ] **Task 1.2**: Update MeetingRequestsDbContext.cs with DbSet
  - Add: `public DbSet<MeetingRequestPreRegistration> MeetingRequestPreRegistrations { get; set; }`
  - Configure relationship: `modelBuilder.Entity<MeetingRequestPreRegistration>()...HasOne(p => p.MeetingRequest).WithMany(m => m.PreRegistrations).HasForeignKey(p => p.MeetingRequestId)`
  - Configure query filter: `.HasQueryFilter(p => p.CancelledAt == null)`
  - Create index: `HasIndex(p => p.MeetingRequestId)`
  - Acceptance: DbContext builds successfully
  - Estimate: 15 minutes
  
- [ ] **Task 1.3**: Generate EF Core migration
  - Command: `dotnet ef migrations add AddPreRegistration --project src/server`
  - Acceptance: Migration file created in Migrations/ folder
  - Estimate: 5 minutes
  
- [ ] **Task 1.4**: Write migration test - verify table creation
  - Test: Apply migration, verify MeetingRequestPreRegistrations table exists with correct columns
  - Acceptance: Test passes after migration applied
  - Estimate: 20 minutes
  
- [ ] **Task 1.5**: Write migration test - verify rollback
  - Test: Rollback migration, verify table removed
  - Acceptance: Test passes, database returns to previous state
  - Estimate: 10 minutes
  
- [ ] **Task 1.6**: Apply migration to development database
  - Command: `dotnet ef database update --project src/server`
  - Acceptance: Migration applied successfully, table exists
  - Estimate: 5 minutes

**Total Database Estimate**: 65 minutes (~1 hour)

### Backend API Implementation

**Task Group 2**: Backend API Tests (Test-First)
- [ ] **Task 2.1**: Create PreRegistrationIntegrationTests.cs test file
  - Setup: xUnit test class with in-memory database
  - Acceptance: Test file runs
  - Estimate: 15 minutes
  
- [ ] **Task 2.2**: Write test: POST /preregister creates registration
  - Test: POST with authenticated user → verify registration record created with correct UserId, UserName, UserEmail, RegisteredAt
  - Expected: 201 Created with registration object
  - Acceptance: Test fails (endpoint not implemented)
  - Estimate: 25 minutes
  
- [ ] **Task 2.3**: Write test: POST /preregister returns 409 for duplicate
  - Test: POST twice with same user and meeting → second request returns 409 Conflict
  - Acceptance: Test fails (duplicate check not implemented)
  - Estimate: 20 minutes
  
- [ ] **Task 2.4**: Write test: DELETE /preregister soft-deletes registration
  - Test: DELETE → verify CancelledAt set, Status changed to "Cancelled"
  - Expected: 204 No Content
  - Acceptance: Test fails (endpoint not implemented)
  - Estimate: 20 minutes
  
- [ ] **Task 2.5**: Write test: GET /preregistrations returns active registrations only
  - Test: Create registrations, cancel one, GET → verify only active registrations returned
  - Expected: 200 OK with filtered array
  - Acceptance: Test fails (endpoint not implemented)
  - Estimate: 20 minutes
  
- [ ] **Task 2.6**: Write test: POST /preregister returns 404 for non-existent meeting
  - Test: POST with invalid meetingRequestId → 404 Not Found
  - Acceptance: Test fails (validation not implemented)
  - Estimate: 15 minutes

**Task Group 3**: Backend API Implementation
- [ ] **Task 3.1**: Add PreRegister endpoint to MeetingRequestsController
  - Signature: `[HttpPost("{id}/preregister")] public async Task<IActionResult> PreRegister(int id)`
  - Extract user identity: UserId from claims (oid/sub), UserName from name claim, UserEmail from preferred_username/email
  - Check meeting exists: return 404 if not found
  - Check duplicate: query existing active registration for (MeetingRequestId, UserId), return 409 if exists
  - Create registration: new MeetingRequestPreRegistration { MeetingRequestId = id, UserId, UserName, UserEmail, RegisteredAt = DateTime.UtcNow, Status = "Registered" }
  - Save to database: `_context.MeetingRequestPreRegistrations.Add(registration); await _context.SaveChangesAsync();`
  - Return 201 Created with registration object
  - Acceptance: API endpoint responds, tests pass
  - Estimate: 45 minutes
  
- [ ] **Task 3.2**: Add CancelPreRegistration endpoint
  - Signature: `[HttpDelete("{id}/preregister")] public async Task<IActionResult> CancelPreRegistration(int id)`
  - Extract UserId from claims
  - Query registration: Find active registration for (MeetingRequestId, UserId), return 404 if not found
  - Soft-delete: Set `CancelledAt = DateTime.UtcNow`, `Status = "Cancelled"`
  - Save changes: `await _context.SaveChangesAsync();`
  - Return 204 No Content
  - Acceptance: Endpoint responds, soft-delete test passes
  - Estimate: 30 minutes
  
- [ ] **Task 3.3**: Add GetPreRegistrations endpoint
  - Signature: `[HttpGet("{id}/preregistrations")] public async Task<IActionResult> GetPreRegistrations(int id)`
  - Query registrations: `_context.MeetingRequestPreRegistrations.Where(p => p.MeetingRequestId == id).OrderByDescending(p => p.RegisteredAt).ToListAsync()`
  - Project to DTO: `Select(p => new { id = p.Id, userName = p.UserName, userEmail = p.UserEmail, registeredAt = p.RegisteredAt })`
  - Return 200 OK with array
  - Acceptance: Endpoint responds, active-only test passes
  - Estimate: 25 minutes
  
- [ ] **Task 3.4**: Update List endpoint to include PreRegistrationCount
  - Modify SELECT projection: Add `.Select(x => new { ...existing props..., preRegistrationCount = x.PreRegistrations.Count(p => p.CancelledAt == null) })`
  - Acceptance: List response includes preRegistrationCount property
  - Estimate: 15 minutes
  
- [ ] **Task 3.5**: Update GetById endpoint to include PreRegistrationCount
  - Modify: Add `.Include(m => m.PreRegistrations)` and project count in DTO
  - Acceptance: Detail response includes preRegistrationCount property
  - Estimate: 10 minutes
  
- [ ] **Task 3.6**: Run all backend tests - verify all pass
  - Acceptance: All API tests pass (create, duplicate, cancel, list, 404)
  - Estimate: 10 minutes

**Total Backend API Estimate**: 250 minutes (~4.2 hours)

### Frontend Component Implementation

**Task Group 4**: Frontend Component Tests (Test-First)
- [ ] **Task 4.1**: Write test: Pre-register button renders only for "Announced" status
  - Test: Render MeetingRequestDetail with different statuses, verify button presence
  - Acceptance: Test fails for non-Announced statuses (button logic not implemented)
  - Estimate: 20 minutes
  
- [ ] **Task 4.2**: Write test: Button changes to "Registered" after successful registration
  - Test: Mock API POST success, verify button text changes and shows cancel option
  - Acceptance: Test fails (button state logic not implemented)
  - Estimate: 25 minutes
  
- [ ] **Task 4.3**: Write test: Count badge displays correct number
  - Test: Render MeetingRequestCard with preRegistrationCount, verify badge text
  - Acceptance: Test fails (badge not implemented)
  - Estimate: 15 minutes
  
- [ ] **Task 4.4**: Write test: PreRegistrationList renders registrants
  - Test: Render PreRegistrationList with mock data, verify names and timestamps displayed
  - Acceptance: Test fails (component not created)
  - Estimate: 20 minutes

**Task Group 5**: Frontend Count Badge Implementation
- [ ] **Task 5.1**: Update MeetingRequestCard to display pre-registration count badge
  - Import: `import { Badge } from '@fluentui/react-components'`
  - Conditional render: Show badge only if `meeting.preRegistrationCount > 0`
  - Badge content: `${meeting.preRegistrationCount} pre-registered`
  - Position: Next to meeting title or status badge
  - Style: Use Fluent UI badge appearance="filled" with informative color
  - Acceptance: Badge visible on cards with registrations
  - Estimate: 25 minutes
  
- [ ] **Task 5.2**: Add ARIA label to badge for accessibility
  - Add: `aria-label={`${meeting.preRegistrationCount} users pre-registered for this meeting`}`
  - Acceptance: Screen reader announces badge content
  - Estimate: 5 minutes

**Task Group 6**: Frontend Pre-register Button Implementation
- [ ] **Task 6.1**: Add registration state to MeetingRequestDetail component
  - Add state: `const [isRegistered, setIsRegistered] = useState(false)`
  - Add state: `const [isRegistering, setIsRegistering] = useState(false)`
  - Add state: `const [registrationError, setRegistrationError] = useState(null)`
  - Acceptance: State variables exist
  - Estimate: 5 minutes
  
- [ ] **Task 6.2**: Check user's registration status on component mount
  - useEffect: Fetch `/api/meetingrequests/${id}/preregistrations`, check if current user's ID is in list
  - Set: `setIsRegistered(userIsInList)`
  - Acceptance: Initial registration state correctly reflects user's registration
  - Estimate: 20 minutes
  
- [ ] **Task 6.3**: Implement handlePreRegister function
  - Extract user identity: `const userId = accounts[0].localAccountId`, `userName = accounts[0].name`, `userEmail = accounts[0].username`
  - Optimistic update: `setIsRegistering(true)`, `setRegistrationError(null)`
  - API call: `POST /api/meetingrequests/${id}/preregister`
  - On success: `setIsRegistered(true)`, `setIsRegistering(false)`, increment local count
  - On error: `setRegistrationError(error.message)`, `setIsRegistering(false)`, rollback optimistic UI
  - Acceptance: Function executes without errors, state updates correctly
  - Estimate: 30 minutes
  
- [ ] **Task 6.4**: Implement handleCancelRegistration function
  - Optimistic update: `setIsRegistering(true)`, `setRegistrationError(null)`
  - API call: `DELETE /api/meetingrequests/${id}/preregister`
  - On success: `setIsRegistered(false)`, `setIsRegistering(false)`, decrement local count
  - On error: `setRegistrationError(error.message)`, `setIsRegistering(false)`, rollback optimistic UI
  - Acceptance: Function executes, state updates correctly
  - Estimate: 25 minutes
  
- [ ] **Task 6.5**: Render pre-register button in MeetingRequestDetail
  - Conditional render: Only show if `meeting.status === "Announced"`
  - Button text: Show "Pre-register" if !isRegistered, "Registered ✓" if isRegistered
  - Button action: Call handlePreRegister if !isRegistered
  - Disabled state: Disable if isRegistering or not authenticated
  - Style: Use Fluent UI Button component with appearance="primary" for pre-register, "outline" for registered
  - Acceptance: Button renders with correct text and behavior
  - Estimate: 25 minutes
  
- [ ] **Task 6.6**: Add cancel registration UI
  - Render: Show "Cancel Registration" link/button when isRegistered = true
  - Action: Call handleCancelRegistration on click
  - Confirmation: Optional: Show confirmation dialog before cancelling
  - Acceptance: User can cancel registration
  - Estimate: 20 minutes
  
- [ ] **Task 6.7**: Display registration error message
  - Conditional render: Show error message if registrationError is set
  - Style: Use Fluent UI MessageBar with intent="error"
  - Clear: Error clears on next registration attempt
  - Acceptance: Error message visible on API failure
  - Estimate: 15 minutes

**Task Group 7**: Frontend Registrants List Component
- [ ] **Task 7.1**: Create PreRegistrationList.jsx component file
  - Setup: Functional component with props `{ registrations, loading }`
  - Export: Default export
  - Acceptance: Component file exists and compiles
  - Estimate: 5 minutes
  
- [ ] **Task 7.2**: Implement registrations list rendering
  - Import: `import { List, ListItem, Spinner } from '@fluentui/react-components'`
  - Conditional: Show Spinner if loading
  - Conditional: Show "No registrations yet" if registrations.length === 0
  - Map: Render ListItem for each registration with userName and formatted registeredAt
  - Format date: Use `new Date(reg.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })`
  - Acceptance: List displays registrations correctly
  - Estimate: 30 minutes
  
- [ ] **Task 7.3**: Add styling and spacing to list
  - Style: Use Fluent UI tokens for spacing, typography
  - Layout: Avatar (optional, can use initials), name, timestamp
  - Acceptance: List is visually consistent with app design
  - Estimate: 15 minutes
  
- [ ] **Task 7.4**: Integrate PreRegistrationList into MeetingRequestDetail
  - Import: `import PreRegistrationList from './PreRegistrationList'`
  - Fetch registrations: Call GET endpoint on mount and after registration changes
  - Render: Place list below pre-register button in detail view
  - Section header: "Pre-registered attendees" with count
  - Acceptance: List appears in detail view and updates correctly
  - Estimate: 20 minutes

**Task Group 8**: Frontend Integration & Polish
- [ ] **Task 8.1**: Refresh meeting data after registration/cancellation
  - After successful POST/DELETE: Re-fetch meeting details to get updated count
  - Update: Refresh registrations list as well
  - Acceptance: Count updates across all UI elements
  - Estimate: 15 minutes
  
- [ ] **Task 8.2**: Add loading states during API calls
  - Button: Show spinner or "Registering..." text while isRegistering = true
  - List: Show skeleton or spinner while loading registrations
  - Acceptance: User sees loading feedback
  - Estimate: 10 minutes
  
- [ ] **Task 8.3**: Add keyboard accessibility to button
  - Verify: Button is keyboard accessible (Tab, Enter/Space to activate)
  - ARIA: Add aria-label="Pre-register for this meeting" and aria-pressed for registered state
  - Acceptance: Fully keyboard operable
  - Estimate: 10 minutes
  
- [ ] **Task 8.4**: Run axe-core accessibility scan on new components
  - Tool: axe DevTools or @axe-core/react
  - Acceptance: Zero critical accessibility violations on button, badge, list
  - Estimate: 10 minutes

**Total Frontend Estimate**: 350 minutes (~5.8 hours)

### End-to-End Testing

**Task Group 9**: E2E Tests
- [ ] **Task 9.1**: Create preregister.spec.ts E2E test file
  - Setup: Playwright test file with authentication setup
  - Acceptance: Test file runs
  - Estimate: 15 minutes
  
- [ ] **Task 9.2**: Write E2E test: Pre-register for announced meeting
  - Test: Login → create meeting with "Announced" status → open detail → click "Pre-register" → verify button changes to "Registered" → verify count increments
  - Acceptance: Test passes
  - Estimate: 35 minutes
  
- [ ] **Task 9.3**: Write E2E test: Cancel pre-registration
  - Test: Follow pre-register flow → click "Cancel Registration" → verify button returns to "Pre-register" → verify count decrements
  - Acceptance: Test passes
  - Estimate: 25 minutes
  
- [ ] **Task 9.4**: Write E2E test: Button only visible for Announced status
  - Test: Create meetings with different statuses → verify pre-register button only appears for "Announced"
  - Acceptance: Test passes
  - Estimate: 25 minutes
  
- [ ] **Task 9.5**: Write E2E test: Prevent duplicate registration
  - Test: Pre-register → attempt to register again → verify no duplicate created (button shows "Registered" state)
  - Acceptance: Test passes
  - Estimate: 20 minutes
  
- [ ] **Task 9.6**: Write E2E test: Registrations list displays users
  - Test: Pre-register → open registrations list → verify current user appears with timestamp
  - Acceptance: Test passes
  - Estimate: 20 minutes
  
- [ ] **Task 9.7**: Write E2E test: Count badge displays on card
  - Test: Pre-register → return to list view → verify meeting card shows count badge
  - Acceptance: Test passes
  - Estimate: 20 minutes

**Total E2E Estimate**: 160 minutes (~2.7 hours)

### Documentation & Validation

**Task Group 10**: Documentation
- [ ] **Task 10.1**: Update API documentation with new endpoints
  - Document: POST /preregister, DELETE /preregister, GET /preregistrations
  - Include: Request/response examples, error codes
  - Acceptance: Documentation clear and accurate
  - Estimate: 25 minutes
  
- [ ] **Task 10.2**: Add inline code comments for registration logic
  - Comments: Explain soft-delete pattern, duplicate prevention, optimistic UI updates
  - Acceptance: Code reviewable and maintainable
  - Estimate: 20 minutes
  
- [ ] **Task 10.3**: Update README or user guide with pre-registration feature
  - Content: Describe how to pre-register, cancel registration, view registrants
  - Screenshots: Optional, show pre-register button and count badge
  - Acceptance: User-facing documentation updated
  - Estimate: 15 minutes

**Task Group 11**: Testing & Validation
- [ ] **Task 11.1**: Manual testing - verify all user scenarios from spec
  - Test: All 6 user scenarios from spec.md
  - Acceptance: All scenarios work as specified
  - Estimate: 40 minutes
  
- [ ] **Task 11.2**: Performance testing - verify registration response time <500ms
  - Test: Measure time from button click to registration confirmation
  - Acceptance: Performance goal met
  - Estimate: 15 minutes
  
- [ ] **Task 11.3**: Performance testing - verify list loads <2s for 100 registrants
  - Test: Seed database with 100 registrations, measure list load time
  - Acceptance: Performance goal met
  - Estimate: 20 minutes
  
- [ ] **Task 11.4**: Cross-browser testing - Chrome, Firefox, Safari, Edge
  - Test: Pre-registration flow across browsers
  - Acceptance: Works in all target browsers
  - Estimate: 25 minutes
  
- [ ] **Task 11.5**: Error handling testing - simulate API failures
  - Test: Network error, 409 duplicate, 404 not found → verify error messages display correctly
  - Acceptance: All error states handled gracefully
  - Estimate: 20 minutes

**Total Documentation & Validation Estimate**: 180 minutes (~3 hours)

---

## Total Effort Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 0: Research | 6 research topics | 3-4 hours |
| Database & Migration | 6 tasks | 1 hour |
| Backend API | 12 tasks | 4.2 hours |
| Frontend Components | 24 tasks | 5.8 hours |
| E2E Testing | 7 tasks | 2.7 hours |
| Documentation & Validation | 8 tasks | 3 hours |
| **TOTAL** | **63 tasks** | **19-20 hours** |

**Risk Buffer**: Add 25% for unexpected issues = **24-25 hours total**

---

## Success Criteria Checklist

*From spec.md functional requirements and success criteria*

- [ ] Pre-register button displays on announced meeting requests in list and detail view (FR-1)
- [ ] Clicking pre-register creates registration record with user name, email, timestamp (FR-2)
- [ ] Button changes to "Registered" state with cancel option after registration (FR-3)
- [ ] System prevents duplicate registrations by same user for same meeting (FR-4, returns 409)
- [ ] Cancelling registration updates status to "Cancelled" and allows re-registration (FR-5)
- [ ] Meeting detail view displays list of pre-registered users with names and timestamps (FR-6)
- [ ] Pre-registration count badge displays on meeting cards showing total active registrations (FR-7)
- [ ] Only authenticated users can pre-register; button disabled for unauthenticated users (FR-8)
- [ ] Pre-register button only appears for meetings with status "Announced" (FR-9)
- [ ] System stores registration data persistently in database (FR-10)
- [ ] Users can pre-register within 2 clicks (view details → pre-register) (Success Criteria)
- [ ] Pre-registration count updates immediately without page refresh <1s (Success Criteria)
- [ ] 95% of pre-registration attempts succeed without errors in testing (Success Criteria)
- [ ] Duplicate registration attempts prevented with clear user feedback (Success Criteria)
- [ ] Pre-registration list loads within 2s for meetings with up to 100 registrations (Success Criteria)
- [ ] Cancellation process completes within 1s with visual confirmation (Success Criteria)
- [ ] All E2E tests pass (Integration Testing Principle)
- [ ] All unit and integration tests pass (Test-First Principle)
- [ ] Zero WCAG AA violations (Accessibility constraint)

---

## Implementation Notes

**Technology Decisions** (to be finalized in Phase 0 research.md):
- **Soft-delete pattern**: `CancelledAt` datetime nullable column (recommended: audit trail, reactivation support)
- **Duplicate prevention**: API-level validation before INSERT (recommended: flexible, handles edge cases)
- **User identity**: UserId = oid/sub claim, UserName = name claim, UserEmail = preferred_username/email claim (align with existing auth)
- **Count calculation**: Real-time calculation in DTO projection with `.Count(p => p.CancelledAt == null)` (recommended: accurate, acceptable performance)
- **Button state management**: Optimistic UI with async setState and error rollback (recommended: better UX)
- **Registrants list UI**: Fluent UI `List` component with `ListItem` (recommended: accessible, styled)

**Database Migration Strategy**:
- Create new table `MeetingRequestPreRegistrations` with foreign key to `MeetingRequests.Id`
- No destructive changes to existing schema
- Migration is additive and reversible (safe to rollback)
- Apply migration before deploying backend code

**Backwards Compatibility**:
- New API endpoints are additive (no breaking changes to existing endpoints)
- Frontend gracefully handles missing `preRegistrationCount` (treats as 0)
- Existing meeting request functionality unaffected

**Security Considerations**:
- Use authenticated user's claims (from JWT) for registration identity - never trust client-provided userId
- Validate meeting exists before allowing registration (prevent invalid foreign keys)
- Authorization: Currently all authenticated users can register - future enhancement could restrict by role
- Soft-delete preserves audit trail for security and compliance

**Performance Optimizations**:
- Index on MeetingRequestId for efficient registration queries
- Eager loading: `.Include(m => m.PreRegistrations)` only when needed
- Count calculation using SQL aggregate in projection (avoid N+1 queries)
- Frontend: Optimistic UI updates reduce perceived latency

**Future Enhancements** (out of scope for this feature):
- Email notifications when someone pre-registers
- Maximum registration limit per meeting
- Waitlist functionality if limit reached
- Export registrations to CSV for organizers
- Registration deadline (cutoff date before meeting)
- Calendar integration (add to user's calendar when registered)
- Real-time updates using SignalR (show registrations live)

---

**Plan Status**: ✅ READY FOR PHASE 0 RESEARCH  
**Next Command**: Review this plan, then proceed to generate research.md with detailed technology decisions and implementation patterns.
