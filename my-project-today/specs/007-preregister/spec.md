# Feature: Add Pre-register Button for Announced Requests

## Summary

Add a "Pre-register" button to meeting requests that have been announced, allowing board members and authorized users to express their intent to attend the meeting. This provides early visibility into meeting attendance and helps organizers plan accordingly.

## Actors

- Board members (primary users who pre-register)
- Meeting organizers/requestors (view pre-registration data)
- SEC Admin (manage pre-registrations)
- System: SPA (React) and API (ASP.NET Core)

## Actions

- User views an announced meeting request
- User clicks "Pre-register" button to indicate attendance intent
- System records pre-registration with user details and timestamp
- User can cancel their pre-registration
- Meeting organizer can view list of pre-registered users
- System tracks total pre-registration count

## Data

- Pre-registration record: { id, meetingRequestId, userId, userName, userEmail, registeredAt, status }
- Registration status: "Registered", "Cancelled"
- Display: Pre-registration count badge on meeting cards

## Constraints

- Pre-register button only visible for requests with status "Announced"
- Users can only pre-register once per meeting
- Users can cancel their own pre-registration
- Pre-registration doesn't guarantee meeting attendance (non-binding)
- Must work with existing authentication system (MSAL)

## Assumptions

- Authenticated users have display name and email from MSAL
- Pre-registration is optional and doesn't require approval
- Cancelled pre-registrations are soft-deleted (retained in database)
- Pre-registration data remains available even after meeting occurs
- No maximum limit on number of pre-registrations per meeting

## User Scenarios & Testing

### 1. Pre-register for announced meeting (happy path)
   - Given an authenticated user viewing an announced meeting request
   - When they click the "Pre-register" button
   - Then the system records their pre-registration
   - And the button changes to "Registered" with option to cancel
   - And the pre-registration count increments
   - Test: Verify database record created with correct user info and timestamp

### 2. Cancel pre-registration
   - Given a user who has pre-registered for a meeting
   - When they click "Cancel Registration"
   - Then their pre-registration is cancelled
   - And the button returns to "Pre-register" state
   - And the pre-registration count decrements
   - Test: Verify registration status updated to "Cancelled"

### 3. View pre-registration list
   - Given a meeting with multiple pre-registrations
   - When viewing the meeting details
   - Then the pre-registration list shows all registered users
   - And displays their names, registration timestamps
   - Test: Verify list updates in real-time when new registrations occur

### 4. Prevent duplicate registration
   - Given a user who is already pre-registered
   - When they attempt to register again
   - Then the system shows their current registration status
   - And prevents duplicate registration
   - Test: API returns appropriate error for duplicate attempts

### 5. Button visibility by status
   - Given meeting requests with different statuses
   - When viewing the requests list and details
   - Then Pre-register button only appears for "Announced" status
   - And button is hidden for Draft, Pending, Approved, Confirmed, Cancelled
   - Test: Verify button visibility logic for each status

### 6. Unauthenticated user
   - Given an unauthenticated user viewing an announced meeting
   - When they see the meeting details
   - Then the Pre-register button is disabled or shows "Sign in to register"
   - Test: Verify authentication requirement

## Functional Requirements (testable)

- **FR1**: System displays "Pre-register" button on announced meeting requests in list view and detail view. (Verify button presence and placement)

- **FR2**: Clicking Pre-register creates a registration record with authenticated user's name, email, and timestamp. (Verify API POST creates correct record)

- **FR3**: After pre-registering, button changes to "Registered" state with "Cancel Registration" option. (Verify UI state change)

- **FR4**: System prevents duplicate registrations by same user for same meeting. (Verify API returns 409 Conflict for duplicates)

- **FR5**: Cancelling registration updates status to "Cancelled" and allows re-registration. (Verify soft-delete behavior)

- **FR6**: Meeting detail view displays list of pre-registered users with names and registration timestamps. (Verify list rendering)

- **FR7**: Pre-registration count badge displays on meeting cards showing total active registrations. (Verify count calculation excludes cancelled)

- **FR8**: Only authenticated users can pre-register; button is disabled for unauthenticated users. (Verify authentication check)

- **FR9**: Pre-register button only appears for meetings with status "Announced". (Verify conditional rendering by status)

- **FR10**: System stores registration data persistently in database. (Verify database schema and queries)

## Success Criteria

- Users can pre-register for announced meetings within 2 clicks (view details → pre-register)
- Pre-registration count updates immediately without page refresh (< 1 second)
- 95% of pre-registration attempts succeed without errors in testing
- Duplicate registration attempts are prevented with clear user feedback
- Pre-registration list loads and displays within 2 seconds for meetings with up to 100 registrations
- Cancellation process completes within 1 second with visual confirmation

## Key Entities

### MeetingRequestPreRegistration
- Id (int, primary key)
- MeetingRequestId (int, foreign key)
- UserId (string, from authentication)
- UserName (string)
- UserEmail (string)
- RegisteredAt (DateTime)
- CancelledAt (DateTime?, nullable)
- Status (string: "Registered", "Cancelled")

Relations:
- MeetingRequestPreRegistration.MeetingRequestId → MeetingRequest.Id (many-to-one)

## Dependencies

- Existing authentication system (MSAL)
- MeetingRequests endpoint and database table
- Fluent UI components for button styling
- Backend support for new API endpoints

## Open Questions

None - Feature is well-defined and ready for implementation planning.

---

**Spec ready for planning**
