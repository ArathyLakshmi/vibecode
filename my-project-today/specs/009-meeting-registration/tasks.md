# Implementation Tasks: Meeting Registration & Attendance

**Feature**: 009-meeting-registration  
**Branch**: `009-meeting-registration`  
**Created**: February 28, 2026  
**Status**: Ready for Implementation

## Task Execution Order

Tasks are organized into phases. Complete each phase before moving to the next. Within each phase, tasks can be executed in parallel where marked with [P], otherwise execute sequentially.

---

## Phase 1: Setup - Database & Models

**Goal**: Create database schema and entity models

### Task 1.1: Create MeetingRegistration Entity
**Files**: `src/server/Models/MeetingRegistration.cs`

- [ ] Create `MeetingRegistration.cs` entity class with properties:
  - Id, MeetingRequestId, UserEmail, UserName, RegistrationDate
  - Status, WaitlistPosition, CancellationDate, CancellationReason
  - CreatedAt, UpdatedAt
- [ ] Add navigation property to MeetingRequest
- [ ] Add validation attributes ([Required], [MaxLength], etc.)

### Task 1.2: Update MeetingRequest Entity
**Files**: `src/server/Models/MeetingRequest.cs`

- [ ] Add `MaxAttendees` property (nullable int)
- [ ] Add `RegistrationDeadlineMinutes` property (nullable int, default 30)
- [ ] Add `Registrations` navigation property (ICollection<MeetingRegistration>)

### Task 1.3: Update Database Context
**Files**: `src/server/Data/AppDbContext.cs`

- [ ] Add `DbSet<MeetingRegistration> MeetingRegistrations` property
- [ ] Configure entity relationships in `OnModelCreating`:
  - Foreign key: MeetingRequestId → MeetingRequests.Id (CASCADE delete)
  - Unique constraint: (MeetingRequestId, UserEmail)
  - Indexes: MeetingRequestId, UserEmail, Status, WaitlistPosition

### Task 1.4: Create and Apply Migration
**Commands**: 
```bash
cd src/server
dotnet ef migrations add AddMeetingRegistrations
dotnet ef database update
```

- [ ] Generate EF Core migration
- [ ] Review migration SQL for correctness
- [ ] Apply migration to database
- [ ] Verify MeetingRegistrations table created with all columns and indexes

### Task 1.5: Create DTOs [P]
**Files**: `src/server/Services/DTOs/RegistrationDtos.cs`

- [ ] Create `RegistrationResponseDto` with all registration fields
- [ ] Create `AttendeeDto` for attendee list view
- [ ] Create `CapacityInfoDto` for capacity information
- [ ] Create `MyRegistrationDto` for user registration dashboard
- [ ] Add validation attributes where needed

---

## Phase 2: Tests - Backend Service Layer

**Goal**: Create test infrastructure and core service tests

### Task 2.1: Create Registration Service Tests
**Files**: `src/server/Tests/Services/RegistrationServiceTests.cs`

- [ ] Test `RegisterForMeetingAsync` - successful registration (Confirmed)
- [ ] Test `RegisterForMeetingAsync` - capacity reached (Waitlisted)
- [ ] Test `RegisterForMeetingAsync` - duplicate registration (throws exception)
- [ ] Test `RegisterForMeetingAsync` - invalid meeting status (throws)
- [ ] Test `RegisterForMeetingAsync` - deadline passed (throws)
- [ ] Test `CancelRegistrationAsync` - confirmed user cancels (waitlist promotion)
- [ ] Test `CancelRegistrationAsync` - waitlisted user cancels (position recalc)
- [ ] Test `CancelRegistrationAsync` - past meeting (throws)
- [ ] Test waitlist promotion logic (FIFO order)

---

## Phase 3: Core - Backend API Implementation

**Goal**: Implement registration service and API endpoints

### Task 3.1: Create Registration Service Interface
**Files**: `src/server/Services/IRegistrationService.cs`

- [ ] Define `RegisterForMeetingAsync(int meetingId, string userEmail, string userName)` signature
- [ ] Define `CancelRegistrationAsync(int meetingId, string userEmail, string? reason)` signature
- [ ] Define `GetCapacityInfoAsync(int meetingId)` signature
- [ ] Define `GetAttendeesAsync(int meetingId, string? statusFilter)` signature
- [ ] Define `GetMyRegistrationsAsync(string userEmail, string filter)` signature

### Task 3.2: Implement Registration Service
**Files**: `src/server/Services/RegistrationService.cs`

- [ ] Implement `RegisterForMeetingAsync`:
  - Validate meeting exists and status is Confirmed/Announced
  - Check registration deadline not passed
  - Check for existing registration (duplicate detection)
  - Count confirmed registrations for capacity check
  - Determine status (Confirmed vs Waitlisted)
  - Calculate waitlist position if needed
  - Use database transaction for atomic operation
- [ ] Implement `CancelRegistrationAsync`:
  - Find user's active registration
  - Validate meeting date not passed
  - Update registration status to Cancelled
  - Promote first waitlisted user if cancelled was Confirmed
  - Recalculate remaining waitlist positions
  - Use database transaction
- [ ] Implement `GetCapacityInfoAsync`:
  - Query meeting and registrations
  - Calculate counts and available spots
- [ ] Implement `GetAttendeesAsync`:
  - Query registrations with optional status filter
  - Separate confirmed and waitlisted
  - Return attendee DTOs
- [ ] Implement `GetMyRegistrationsAsync`:
  - Query user's registrations with meeting details
  - Filter by upcoming/past/cancelled/all
  - Calculate canCancel flag
  - Return summary counts

### Task 3.3: Register Service in Dependency Injection
**Files**: `src/server/Program.cs`

- [ ] Add `builder.Services.AddScoped<IRegistrationService, RegistrationService>()`

### Task 3.4: Create Registrations Controller
**Files**: `src/server/Controllers/RegistrationsController.cs`

- [ ] Create controller with [Authorize] attribute
- [ ] Implement POST `/api/meetingrequests/{meetingId}/registrations`:
  - Extract user email/name from claims
  - Call RegistrationService.RegisterForMeetingAsync
  - Return 201 Created with RegistrationResponseDto
  - Handle exceptions (400, 409, 404 status codes)
- [ ] Implement DELETE `/api/meetingrequests/{meetingId}/registrations/current`:
  - Extract user email from claims
  - Call RegistrationService.CancelRegistrationAsync
  - Return 200 OK with cancellation details
  - Handle exceptions (400, 404)
- [ ] Implement GET `/api/meetingrequests/{meetingId}/registrations`:
  - Validate user is requestor or admin
  - Call RegistrationService.GetAttendeesAsync
  - Return attendee list with capacity info
  - Support status filter and pagination
- [ ] Implement GET `/api/registrations/my-registrations`:
  - Extract user email from claims
  - Call RegistrationService.GetMyRegistrationsAsync
  - Return user's registrations with summary
  - Support filter parameter
- [ ] Add XML comments for Swagger documentation

### Task 3.5: Create CSV Export Service [P]
**Files**: `src/server/Services/CsvExportService.cs`

- [ ] Install CsvHelper NuGet package: `dotnet add package CsvHelper`
- [ ] Create service class with export method
- [ ] Implement CSV generation from attendee list
- [ ] Add controller endpoint GET `/api/meetingrequests/{meetingId}/registrations/export`
- [ ] Return file download with correct Content-Type and disposition

---

## Phase 4: Integration - Frontend Components

**Goal**: Implement UI components for registration workflow

### Task 4.1: Add Registration State to MeetingRequestsList
**Files**: `src/client/src/components/MeetingRequestsList.jsx`

- [ ] Add state variables:
  - `userRegistration` (current user's registration for selected meeting)
  - `registeringMeeting` (loading state during registration)
  - `capacityInfo` (meeting capacity details)
- [ ] Add `fetchUserRegistration` function to load user's registration status
- [ ] Add `fetchCapacityInfo` function to load meeting capacity
- [ ] Call fetch functions when drawer opens for eligible meetings

### Task 4.2: Implement Registration Handlers
**Files**: `src/client/src/components/MeetingRequestsList.jsx`

- [ ] Implement `handleRegister` function:
  - POST to `/api/meetingrequests/${meetingId}/registrations`
  - Update UI optimistically (show "Registering..." state)
  - On success: Update state, show success message, refresh capacity
  - On error: Show user-friendly error message, revert UI
- [ ] Implement `handleCancelRegistration` function:
  - Show confirmation dialog with reason input
  - DELETE to `/api/meetingrequests/${meetingId}/registrations/current`
  - Update UI optimistically
  - On success: Clear registration state, update capacity
  - Handle waitlist promotion notification

### Task 4.3: Add Registration UI to Drawer
**Files**: `src/client/src/components/MeetingRequestsList.jsx`

- [ ] Add registration button section to drawer:
  - Show "Register to Attend" button if eligible and not registered
  - Show "Registered ✓" badge with "Cancel" button if registered (Confirmed)
  - Show "Waitlisted (Position #N)" badge with "Cancel" button if waitlisted
  - Hide button if meeting not Confirmed/Announced
  - Hide button if registration deadline passed
  - Disable button during loading states
- [ ] Add capacity indicator UI:
  - Display progress bar showing X/Y spots filled
  - Use Fluent UI ProgressBar component
  - Color coding: Green (<80%), Yellow (80-99%), Red (100%)
  - Show "Waitlist: N users" badge if applicable
  - Show "Unlimited capacity" if MaxAttendees is null

### Task 4.4: Create AttendeeListView Component [P]
**Files**: `src/client/src/components/AttendeeListView.jsx`

- [ ] Create new component file
- [ ] Implement layout with two sections: Confirmed and Waitlisted
- [ ] Use Fluent UI DataGrid or table for attendee list
- [ ] Columns: Name, Email, Registration Date, WaitlistPosition
- [ ] Add search/filter functionality
- [ ] Add "Export CSV" button linking to export endpoint
- [ ] Handle loading and error states
- [ ] Add modal or slide-over integration to Drawer

### Task 4.5: Add "View Attendees" Button to Drawer
**Files**: `src/client/src/components/MeetingRequestsList.jsx`

- [ ] Add "View Attendees" button next to other actions
- [ ] Show button only for meeting requestor or admin users
- [ ] Check user roles: SecAdmin, EdOffice, ManagementOffice, or requestor
- [ ] Open AttendeeListView modal on click
- [ ] Display attendee count badge on button

### Task 4.6: Create MyRegistrationsPage Component [P]
**Files**: `src/client/src/pages/MyRegistrationsPage.jsx`

- [ ] Create new page component file
- [ ] Implement page header with title
- [ ] Add filter tabs: Upcoming / Past / Cancelled / All (Fluent UI TabList)
- [ ] Add summary cards showing counts (Upcoming, Confirmed, Waitlisted)
- [ ] Implement registration card list:
  - Display meeting title, reference, date
  - Show registration status badge (Confirmed/Waitlisted/Cancelled)
  - Show days until meeting counter
  - Add "View Details" button (navigate to meeting drawer)
  - Add "Cancel Registration" button (if canCancel)
- [ ] Implement `fetchMyRegistrations` function
- [ ] Handle pagination if needed
- [ ] Handle loading and empty states

### Task 4.7: Add MyRegistrations to Navigation
**Files**: `src/client/src/App.jsx` or `AppShell.jsx`

- [ ] Add route for `/my-registrations`
- [ ] Add navigation menu item with icon (Calendar with checkmark)
- [ ] Add to main navigation sidebar
- [ ] Test navigation from different pages

### Task 4.8: Add Capacity Badges to Meeting List [P]
**Files**: `src/client/src/components/MeetingRequestsList.jsx`

- [ ] Fetch capacity info when loading meetings
- [ ] Display capacity badge on meeting cards in list view:
  - Show "20/30 spots" with color indicator
  - Green if < 80% full, Yellow if 80-99%, Red if 100%
  - Show "Waitlist: 5" badge if applicable
  - Hide badge for unlimited capacity meetings
- [ ] Add small progress bar under meeting title (optional enhancement)

---

## Phase 5: Polish - Testing & Documentation

**Goal**: Complete test coverage and user documentation

### Task 5.1: API Integration Tests [P]
**Files**: `src/server/Tests/Controllers/RegistrationsControllerTests.cs`

- [ ] Test POST register endpoint (201 Created, 401, 409, 400)
- [ ] Test DELETE cancel endpoint (200 OK, 404, 400)
- [ ] Test GET attendees endpoint (200 OK, 403, pagination)
- [ ] Test GET my-registrations endpoint (200 OK, filters)
- [ ] Use TestServer and in-memory database
- [ ] Verify concurrent registration handling

### Task 5.2: Frontend Component Tests [P]
**Files**: `src/client/src/components/__tests__/`

- [ ] Test registration button visibility logic
- [ ] Test registration button click handler (mock API)
- [ ] Test cancellation flow with confirmation
- [ ] Test MyRegistrationsPage rendering
- [ ] Test filter tab switching
- [ ] Use React Testing Library + Vitest
- [ ] Mock fetch API calls

### Task 5.3: End-to-End Tests [P]
**Files**: `src/tests/e2e/` or similar

- [ ] E2E: Complete registration flow (view → register → confirm → cancel)
- [ ] E2E: Waitlist promotion scenario
- [ ] E2E: My Registrations page workflow
- [ ] Use Playwright or existing E2E framework

### Task 5.4: Error Handling & Logging [P]
**Files**: Various backend files

- [ ] Add structured logging to RegistrationService
- [ ] Log registration attempts, cancellations, promotions
- [ ] Improve frontend error messages (user-friendly text)
- [ ] Add error boundaries for React components

### Task 5.5: User Documentation [P]
**Files**: `docs/` directory

- [ ] Create user guide: "How to Register for Meetings"
- [ ] Create admin guide: "Managing Meeting Registrations"
- [ ] Update README with feature description
- [ ] Add screenshots/GIFs of registration flow

### Task 5.6: API Documentation [P]
**Files**: Swagger configuration

- [ ] Update Swagger/OpenAPI documentation
- [ ] Add example requests/responses
- [ ] Document error codes
- [ ] Create Postman collection

---

## Task Summary

**Total Tasks**: 65 tasks across 5 phases
**Estimated Time**: 60 hours (~1.5-2 weeks)

**Task Breakdown**:
- Phase 1 (Setup): 5 tasks - 3 hours
- Phase 2 (Tests): 9 tasks - 6 hours
- Phase 3 (Core): 17 tasks - 21 hours
- Phase 4 (Integration): 17 tasks - 20 hours
- Phase 5 (Polish): 17 tasks - 10 hours

**Parallel Tasks** (marked with [P]):
- Can be executed simultaneously by multiple developers
- Include: DTOs, CSV export, UI components, tests, documentation

**Sequential Tasks**:
- Must be executed in order within each phase
- Database migrations must complete before backend services
- Backend APIs must complete before frontend integration

## Validation Checkpoints

After each phase, verify:

**Phase 1**: 
- [ ] Migration applied successfully
- [ ] Tables and indexes exist in database
- [ ] Entity models compile without errors

**Phase 2**:
- [ ] All service tests pass
- [ ] Test coverage >80% on service layer

**Phase 3**:
- [ ] API endpoints return correct responses
- [ ] Swagger documentation shows all endpoints
- [ ] Manual API testing successful (Postman/curl)

**Phase 4**:
- [ ] Registration button appears for eligible meetings
- [ ] Registration and cancellation workflows complete successfully
- [ ] My Registrations page displays user data correctly

**Phase 5**:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Documentation complete and accurate
- [ ] No critical errors in logs

## Notes

- Use feature branch: `009-meeting-registration`
- Commit frequently with descriptive messages
- Run tests after each significant change
- Update this file by marking tasks [X] as completed
