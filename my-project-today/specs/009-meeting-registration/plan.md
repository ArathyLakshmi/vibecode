# Implementation Plan: Meeting Registration & Attendance

**Feature**: 009-meeting-registration  
**Branch**: `009-meeting-registration`  
**Created**: February 28, 2026  
**Status**: Ready for Implementation

## Overview

This implementation plan breaks down the meeting registration feature into concrete, actionable tasks organized by workstream (Backend, Frontend, Testing, Documentation).

## Prerequisites

- ✅ Feature specification complete ([spec.md](spec.md))
- ✅ Research complete ([ research.md](research.md))
- ✅ Data model defined ([data-model.md](data-model.md))
- ✅ API contracts documented ([contracts/](contracts/))
- ✅ Development environment set up (ASP.NET Core + React + SQLite)

## Implementation Phases

### Phase 1: Database & Models (Priority: P0 - Foundation)

**Goal**: Create database schema and entity models

#### Task 1.1: Create EF Core Migration
- [ ] Create `MeetingRegistration` entity class in `Models/MeetingRegistration.cs`
- [ ] Add `MaxAttendees` and `RegistrationDeadlineMinutes` properties to existing `MeetingRequest` entity
- [ ] Update `AppDbContext` to include `DbSet<MeetingRegistration>`
- [ ] Configure relationships and constraints in `OnModelCreating`
- [ ] Generate migration: `dotnet ef migrations add AddMeetingRegistrations`
- [ ] Review generated migration SQL for correctness
- [ ] Apply migration: `dotnet ef database update`

**Acceptance**: 
- Migration creates `MeetingRegistrations` table with all columns
- Unique constraint on (MeetingRequestId, UserEmail) exists
- Foreign key relationship established
- Indexes created on MeetingRequestId, UserEmail, Status

**Estimated Time**: 2 hours

---

#### Task 1.2: Create DTOs
- [ ] Create `RegistrationRequestDto.cs` in `Services/DTOs/`
- [ ] Create `RegistrationResponseDto.cs` in `Services/DTOs/`
- [ ] Create `AttendeeDto.cs` in `Services/DTOs/`
- [ ] Create `CapacityInfoDto.cs` in `Services/DTOs/`
- [ ] Create `MyRegistrationDto.cs` in `Services/DTOs/`
- [ ] Add validation attributes to DTOs ([Required], [EmailAddress], etc.)

**Acceptance**:
- All DTOs compile without errors
- Validation attributes present on required fields
- DTOs match API contract specifications

**Estimated Time**: 1 hour

---

### Phase 2: Backend API Implementation (Priority: P0 - Core Features)

#### Task 2.1: Registration Service
- [ ] Create `IRegistrationService` interface in `Services/`
- [ ] Create `RegistrationService` class implementing interface
- [ ] Implement `RegisterForMeetingAsync(int meetingId, string userEmail, string userName)` method
  - Validate meeting exists and status is Confirmed/Announced
  - Check registration deadline not passed
  - Check for existing registration (duplicate)
  - Count confirmed registrations
  - Determine status (Confirmed vs Waitlisted) based on capacity
  - Calculate waitlist position if needed
  - Use transaction for atomic operation
- [ ] Implement `CancelRegistrationAsync(int meetingId, string userEmail, string? reason)` method
  - Find user's registration
  - Validate meeting date not passed
  - Update registration to Cancelled
  - Trigger waitlist promotion if applicable
  - Use transaction
- [ ] Implement `PromoteFromWaitlistAsync(int meetingId)` helper method
  - Find first waitlisted registration
  - Update to Confirmed status
  - Recalculate remaining waitlist positions
- [ ] Register service in `Program.cs`: `builder.Services.AddScoped<IRegistrationService, RegistrationService>()`

**Acceptance**:
- All methods handle errors gracefully with appropriate exceptions
- Transactions used for data consistency
- Capacity enforcement logic correctly handles race conditions
- Waitlist promotion works automatically

**Estimated Time**: 6 hours

---

#### Task 2.2: Registration API Endpoints
- [ ] Create `RegistrationsController.cs` in `Controllers/`
- [ ] Implement `POST /api/meetingrequests/{meetingId}/registrations` endpoint
  - Extract user from claims
  - Call `RegistrationService.RegisterForMeetingAsync()`
  - Return 201 Created with RegistrationResponseDto
  - Handle exceptions: 400 (bad request), 409 (conflict), 404 (not found)
- [ ] Implement `DELETE /api/meetingrequests/{meetingId}/registrations/current` endpoint
  - Extract user from claims
  - Call `RegistrationService.CancelRegistrationAsync()`
  - Return 200 OK with cancellation details
  - Handle exceptions: 400 (cannot cancel), 404 (not found)
- [ ] Implement `GET /api/meetingrequests/{meetingId}/registrations` endpoint
  - Validate user authorization (requestor or admin)
  - Query registrations grouped by status
  - Return AttendeeDto list with capacity info
  - Support pagination and status filtering
- [ ] Implement `GET /api/registrations/my-registrations` endpoint
  - Extract user from claims
  - Query user's registrations with meeting details
  - Support filter parameter (upcoming/past/cancelled/all)
  - Return MyRegistrationDto list with summary counts
- [ ] Add [Authorize] attribute to all endpoints
- [ ] Add XML comments for Swagger documentation

**Acceptance**:
- All endpoints return correct HTTP status codes
- Request/response bodies match API contracts
- Error responses are consistent and informative
- Swagger UI shows all endpoints with documentation

**Estimated Time**: 5 hours

---

#### Task 2.3: CSV Export Endpoint
- [ ] Install CsvHelper NuGet package: `dotnet add package CsvHelper`
- [ ] Create `CsvExportService` in `Services/`
- [ ] Implement `ExportAttendeesToCsvAsync(int meetingId)` method
  - Query all confirmed and waitlisted registrations
  - Map to CSV-friendly format
  - Generate CSV content with headers
- [ ] Implement `GET /api/meetingrequests/{meetingId}/registrations/export` endpoint
  - Validate user authorization (requestor or admin)
  - Call export service
  - Return file download response with Content-Disposition header
  - Set Content-Type: text/csv
- [ ] Test CSV download in browser

**Acceptance**:
- CSV file downloads correctly with proper filename
- CSV contains all attendee data with headers
- CSV opens correctly in Excel/Google Sheets

**Estimated Time**: 2 hours

---

### Phase 3: Frontend Components (Priority: P0 - Core UI)

#### Task 3.1: Drawer Registration Controls
- [ ] Open `src/client/src/components/MeetingRequestsList.jsx`
- [ ] Add `canRegister` computed property:
  - Check meeting status is Confirmed or Announced
  - Check registration deadline not passed
  - Check user not already registered
- [ ] Add `userRegistration` state to track current user's registration
- [ ] Add `capacityInfo` state for meeting capacity details
- [ ] Implement `handleRegister` function:
  - POST to `/api/meetingrequests/${meetingId}/registrations`
  - Update UI optimistically (show "Registering..." state)
  - On success: Update userRegistration state, show success message
  - On error: Revert UI, show error message
- [ ] Implement `handleCancelRegistration` function:
  - Show confirmation dialog
  - DELETE to `/api/meetingrequests/${meetingId}/registrations/current`
  - Update UI optimistically
  - On success: Clear userRegistration state, refresh capacity
- [ ] Add registration button to Drawer:
  - Show "Register to Attend" if user not registered and can register
  - Show "Registered ✓" badge with "Cancel Registration" button if registered
  - Show "Waitlisted (Position #N)" badge if waitlisted
  - Hide button if meeting not eligible or deadline passed
- [ ] Add capacity indicator UI:
  - Display "X/Y spots filled" with progress bar
  - Fluent UI ProgressBar component
  - Show "Waitlist: N users" if applicable
- [ ] Fetch capacity and user registration status when drawer opens

**Acceptance**:
- Registration button appears only for eligible meetings
- Button click registers user successfully
- UI updates immediately showing registered status
- Capacity indicator displays accurate counts
- Cancellation flow works with confirmation dialog

**Estimated Time**: 4 hours

---

#### Task 3.2: View Attendees Component
- [ ] Create `src/client/src/components/AttendeeListView.jsx`
- [ ] Implement component structure:
  - Separate sections for Confirmed and Waitlisted attendees
  - Fluent UI DataGrid or simple list view
  - Columns: Name, Email, Registration Date, Waitlist Position
- [ ] Implement `fetchAttendees` function:
  - GET from `/api/meetingrequests/${meetingId}/registrations`
  - Handle loading and error states
- [ ] Add "View Attendees" button to Drawer (next to other actions)
  - Show only for meeting requestor or admin users
  - Open modal or slide-over panel with AttendeeListView
- [ ] Add export button to attendee view:
  - Link to `/api/meetingrequests/${meetingId}/registrations/export`
  - Target="_blank" for download
- [ ] Add search/filter functionality (optional enhancement)

**Acceptance**:
- Attendee list displays all registered users
- Confirmed and waitlisted users shown in separate sections
- Export button downloads CSV file
- Only authorized users see "View Attendees" button

**Estimated Time**: 3 hours

---

#### Task 3.3: My Registrations Page
- [ ] Create `src/client/src/pages/MyRegistrationsPage.jsx`
- [ ] Implement page layout:
  - Header with title "My Meeting Registrations"
  - Filter tabs: Upcoming / Past / Cancelled / All
  - Summary cards: Total Upcoming, Confirmed, Waitlisted
  - List of registrations with meeting details
- [ ] Implement `fetchMyRegistrations` function:
  - GET from `/api/registrations/my-registrations?filter=${filter}`
  - Handle pagination parameters
- [ ] Display registration cards:
  - Meeting title, reference number, date
  - Registration status badge (Confirmed / Waitlisted / Cancelled)
  - Days until meeting counter
  - "View Details" button → navigate to meeting drawer
  - "Cancel Registration" button (if canCancel is true)
- [ ] Add pagination controls (if needed)
- [ ] Implement filter switching (update query and reload)
- [ ] Add to navigation in `AppShell.jsx`:
  - Icon: Calendar with checkmark
  - Label: "My Registrations"
  - Route: `/my-registrations`

**Acceptance**:
- Page loads and displays user's registrations
- Filter tabs work correctly
- Registration cards show accurate information
- Cancel registration works from this page
- Page accessible from main navigation

**Estimated Time**: 4 hours

---

#### Task 3.4: Meeting List Capacity Indicators
- [ ] Open `src/client/src/components/MeetingRequestsList.jsx`
- [ ] Add `capacity` field to meeting items displayed in list/table
- [ ] Fetch capacity info when loading meetings (or as separate calls)
- [ ] Display capacity badge on meeting cards:
  - "20/30 spots" with color indicator
  - Green if < 80% full
  - Yellow if 80-99% full
  - Red if 100% full
  - Gray badge "Waitlist: 5" if applicable
- [ ] Add small progress bar under meeting title (optional)

**Acceptance**:
- Capacity badges visible on confirmed/announced meetings in list view
- Colors accurately reflect capacity status
- Badge hidden for meetings without capacity limits

**Estimated Time**: 2 hours

---

### Phase 4: Testing (Priority: P1 - Quality Assurance)

#### Task 4.1: Backend Unit Tests
- [ ] Create `RegistrationServiceTests.cs` in `Tests/Services/`
- [ ] Test `RegisterForMeetingAsync`:
  - Happy path: Successful registration (Confirmed status)
  - Capacity reached: Registration added to waitlist
  - Duplicate registration: Throws exception
  - Invalid meeting status: Throws exception
  - Deadline passed: Throws exception
- [ ] Test `CancelRegistrationAsync`:
  - Happy path confirmed: Cancellation + waitlist promotion
  - Happy path waitlisted: Cancellation + position recalculation
  - Past meeting: Throws exception
  - No registration found: Throws exception
- [ ] Test `PromoteFromWaitlistAsync`:
  - Promotion successful: First waitlisted user promoted
  - Position recalculation: Remaining users decremented
  - No waitlisted users: No-op
- [ ] Use in-memory database for tests
- [ ] Aim for >80% code coverage on service layer

**Estimated Time**: 6 hours

---

#### Task 4.2: API Integration Tests
- [ ] Create `RegistrationsControllerTests.cs` in `Tests/Controllers/`
- [ ] Test POST /api/meetingrequests/{id}/registrations:
  - 201 Created with authenticated user
  - 401 Unauthorized without auth
  - 409 Conflict on duplicate
  - 400 Bad Request on invalid meeting
- [ ] Test DELETE /api/meetingrequests/{id}/registrations/current:
  - 200 OK on successful cancellation
  - 404 Not Found if no registration
  - 400 Bad Request if past meeting
- [ ] Test GET /api/meetingrequests/{id}/registrations:
  - 200 OK with attendee list for authorized user
  - 403 Forbidden for unauthorized user
  - Pagination works correctly
- [ ] Test GET /api/registrations/my-registrations:
  - 200 OK with user's registrations
  - Filters work correctly (upcoming/past/cancelled/all)
- [ ] Use TestServer and in-memory database

**Estimated Time**: 6 hours

---

#### Task 4.3: Frontend Component Tests
- [ ] Create test file for Drawer registration controls
- [ ] Test registration button visibility logic
- [ ] Test registration button click handler (mock API)
- [ ] Test cancellation flow with confirmation dialog
- [ ] Create test file for MyRegistrationsPage
- [ ] Test page rendering with mock data
- [ ] Test filter tab switching
- [ ] Test cancel registration from page
- [ ] Use React Testing Library + Vitest
- [ ] Mock fetch API calls

**Estimated Time**: 4 hours

---

#### Task 4.4: End-to-End Testing
- [ ] Create E2E test scenario: Complete registration flow
  - User navigates to meeting list
  - Opens meeting details (Confirmed meeting)
  - Clicks "Register to Attend"
  - Sees "Registered" status
  - Cancels registration
  - Confirms cancellation
  - Status returns to "Register to Attend"
- [ ] Create E2E test scenario: Waitlist promotion
  - Meeting at full capacity
  - User A registers → waitlisted
  - User B (confirmed) cancels
  - User A automatically promoted to confirmed
- [ ] Create E2E test scenario: My Registrations page
  - User registers for 3 meetings
  - Navigates to My Registrations
  - Sees all 3 registrations listed
  - Filters by upcoming
  - Cancels one registration from page
- [ ] Use Playwright or existing E2E framework

**Estimated Time**: 5 hours

---

### Phase 5: Documentation & Polish (Priority: P2 - Production Readiness)

#### Task 5.1: API Documentation
- [ ] Update Swagger/OpenAPI documentation with registration endpoints
- [ ] Add example requests/responses to Swagger UI
- [ ] Document error codes and meanings
- [ ] Create Postman collection for API testing

**Estimated Time**: 2 hours

---

#### Task 5.2: User Documentation
- [ ] Create user guide: "How to Register for Meetings"
  - Screenshots of registration flow
  - Explanation of waitlist
  - Cancellation policy
- [ ] Update README with feature description
- [ ] Create admin guide: "Managing Meeting Registrations"
  - How to set capacity
  - How to view attendee lists
  - How to export attendee data

**Estimated Time**: 3 hours

---

#### Task 5.3: Error Handling & Logging
- [ ] Add structured logging to RegistrationService
  - Log registration attempts
  - Log cancellations and promotions
  - Log errors with context
- [ ] Improve frontend error messages
  - User-friendly error text
  - Suggestions for resolution
  - Link to support if needed
- [ ] Add Sentry or similar error tracking (optional)

**Estimated Time**: 2 hours

---

#### Task 5.4: Performance Optimization
- [ ] Add database indexes if missing (should be done in Phase 1)
- [ ] Optimize attendee list query for large datasets
- [ ] Consider caching capacity info (5-minute TTL)
- [ ] Add pagination to attendee list if >100 attendees
- [ ] Load test registration endpoint with concurrent requests

** Estimated Time**: 3 hours

---

## Summary

### Total Estimated Time: **60 hours** (~1.5-2 weeks for 1 developer)

### Task Breakdown by Workstream:
- **Backend**: 21 hours (35%)
- **Frontend**: 13 hours (22%)
- **Testing**: 21 hours (35%)
- **Documentation & Polish**: 10 hours (17%)

### Critical Path Dependencies:
1. Phase 1 (Database) must complete before Phase 2 (Backend API)
2. Phase 2 must complete before Phase 3 (Frontend)
3. Phase 3 should complete before Phase 4 (E2E testing)
4. Phase 5 can run in parallel with testing

### Risk Mitigation:
- **Concurrent registration race conditions**: Mitigated by database transactions
- **Waitlist promotion complexity**: Well-defined logic with comprehensive tests
- **Large attendee lists**: Pagination and indexes planned
- **User confusion about waitlist**: Clear UI messaging and documentation

## Next Steps

1. Review this plan with team
2. Assign tasks to developers
3. Set up task tracking in project management tool (GitHub Issues/Jira)
4. Begin Phase 1: Database & Models
5. Daily standups to track progress

## Success Metrics

- ✅ All functional requirements (FR-001 to FR-025) implemented
- ✅ All acceptance criteria from spec met
- ✅ Test coverage >80% on backend
- ✅ No critical bugs in production after 1 week
- ✅ User can register for meeting in <5 seconds
- ✅ Attendee list loads in <2 seconds for 200 attendees
