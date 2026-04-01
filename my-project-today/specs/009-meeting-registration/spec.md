# Feature Specification: Meeting Registration & Attendance

**Feature Branch**: `009-meeting-registration`  
**Created**: February 28, 2026  
**Status**: Draft  
**Input**: User description: "add register for attending meeting for announced and confirmed meetings"

## Summary

A meeting registration system that allows authenticated users to register their attendance for confirmed and announced meetings. Users can view meeting details, register to attend, and receive confirmation of their registration. Administrators can view the list of registered attendees, track attendance capacity, and manage registrations. The feature integrates with the existing meeting request workflow and becomes available once a meeting reaches "Confirmed" or "Announced" status.

## Actors

- **Authenticated User**: Registers to attend meetings, views their registrations, cancels registration
- **Meeting Requestor**: Creates meetings, views registrations for their meetings
- **Administrator (SecAdmin, EdOffice, ManagementOffice)**: Views all meeting registrations, manages attendee lists, exports registration data
- **System**: Tracks registrations, enforces capacity limits, sends notifications, updates meeting status

## Goals

- Enable users to express interest and commit to attending meetings
- Provide organizers with accurate headcount for planning purposes
- Track meeting attendance and participation
- Enforce capacity limits for meeting venues
- Simplify communication by identifying confirmed attendees
- Support post-meeting follow-up with attendee lists

## Scope & Constraints

**In Scope:**
- Registration for Confirmed and Announced meetings only
- User self-registration with one-click action
- Registration cancellation by users before meeting date
- View list of registered attendees (with privacy controls)
- Meeting capacity limits with waitlist support
- Registration status indicators in meeting details
- Email confirmation upon registration (optional future enhancement)
- Export attendee list to CSV/PDF

**Out of Scope:**
- Guest registration (unregistered users)
- Proxy registration (registering on behalf of others)
- Recurring meeting registration series
- Calendar integration (iCal, Outlook invites)
- Check-in system for actual attendance tracking
- Badge/QR code generation for entry
- Dietary preferences or accommodation requests
- Payment or ticketing for paid meetings

**Constraints:**
- Must use existing authentication system (MSAL Azure AD)
- Registration only available for meetings with status "Confirmed" or "Announced"
- Users must be authenticated to register
- Meeting capacity must be defined before allowing registrations
- Registration closes when meeting starts or capacity reached
- Follows existing role-based permission model
- Uses Fluent UI components for consistency
- Stores registration data in same SQLite database

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register for Meeting (Priority: P1)

Authenticated users can view confirmed/announced meetings and register their attendance with one click.

**Why this priority**: Core functionality - this is the primary purpose of the feature

**Independent Test**: User navigates to meeting details page, sees "Register to Attend" button, clicks it, registration is confirmed, and button changes to "Registered" with option to cancel

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a Confirmed meeting with available capacity, **When** they click "Register to Attend", **Then** their registration is recorded and confirmation message appears
2. **Given** a user who has registered for a meeting, **When** they view the meeting details, **Then** they see "Registered" status with option to "Cancel Registration"
3. **Given** a meeting at full capacity, **When** a user attempts to register, **Then** they are added to waitlist and notified of waitlist status
4. **Given** a Draft or Pending meeting, **When** a user views details, **Then** the registration button is hidden or disabled with message "Registration opens when meeting is confirmed"
5. **Given** a user registered for a meeting, **When** the meeting date passes, **Then** registration status shows "Attended" and cancellation is no longer possible

---

### User Story 2 - View Registered Attendees (Priority: P1)

Meeting organizers and administrators can view the list of users registered to attend a meeting.

**Why this priority**: Essential for meeting planning and capacity management

**Independent Test**: Organizer opens meeting details, clicks "View Attendees", sees list of 15 registered users with names, registration dates, and total count

**Acceptance Scenarios**:

1. **Given** a meeting with 10 registered attendees, **When** the organizer clicks "View Attendees", **Then** they see a list of attendee names, emails, and registration timestamps
2. **Given** a user viewing attendee list, **When** registrations are anonymous (privacy setting enabled), **Then** they see only attendee count, not individual names
3. **Given** a meeting at 80% capacity, **When** viewing attendees, **Then** capacity indicator shows "24/30 registered" with visual progress bar
4. **Given** a meeting with waitlist, **When** viewing attendees, **Then** confirmed and waitlisted attendees are displayed in separate sections
5. **Given** an administrator, **When** they view any meeting, **Then** they can access full attendee list regardless of privacy settings

---

### User Story 3 - Cancel Registration (Priority: P2)

Users can cancel their meeting registration before the meeting start time.

**Why this priority**: Important for accurate planning but not critical for initial release (users can simply not attend)

**Independent Test**: User navigates to their registered meeting, clicks "Cancel Registration", confirms cancellation, registration is removed, and spot becomes available for others

**Acceptance Scenarios**:

1. **Given** a user registered for a meeting in 3 days, **When** they click "Cancel Registration" and confirm, **Then** their registration is removed and capacity counter decreases
2. **Given** a user on the waitlist becomes available, **When** another user cancels registration, **Then** first waitlisted user is automatically moved to registered (with notification)
3. **Given** a meeting starting in 1 hour, **When** a user attempts to cancel, **Then** cancellation is blocked with message "Registration cancellation closed"
4. **Given** a user canceling registration for a full meeting, **When** cancellation is confirmed, **Then** next waitlisted user is notified of available spot
5. **Given** a user viewing "My Registrations" page, **When** they cancel a registration, **Then** the meeting is moved to "Cancelled Registrations" section with timestamp

---

### User Story 4 - Manage Meeting Capacity (Priority: P2)

Meeting organizers can set and update capacity limits for meetings, controlling registration availability.

**Why this priority**: Important for venue planning but can default to unlimited capacity if not set

**Independent Test**: Organizer edits meeting details, sets capacity to 50, saves, and registration stops accepting new attendees after 50th registration

**Acceptance Scenarios**:

1. **Given** a meeting without capacity limit, **When** organizer sets capacity to 30, **Then** registration accepts up to 30 attendees and additional users join waitlist
2. **Given** a meeting with 25 registrations and capacity 30, **When** organizer reduces capacity to 20, **Then** most recent 5 registrations are moved to waitlist
3. **Given** a meeting with capacity 50, **When** 50th user registers, **Then** registration button changes to "Join Waitlist" for subsequent users
4. **Given** a meeting with unlimited capacity setting, **When** viewing registration, **Then** capacity shows "No limit" or "Unlimited capacity"
5. **Given** a meeting organizer, **When** they increase capacity from 30 to 40, **Then** waitlisted users are automatically moved to registered (first 10) and notified

---

### User Story 5 - View My Registrations (Priority: P3)

Users can view a list of all meetings they have registered to attend, with filtering and status indicators.

**Why this priority**: Nice-to-have for user convenience, users can track registrations manually

**Independent Test**: User navigates to "My Registrations" page, sees 5 upcoming meetings they registered for, meeting dates, and registration status (Registered/Waitlisted)

**Acceptance Scenarios**:

1. **Given** a user registered for 3 meetings, **When** they visit "My Registrations" page, **Then** they see all 3 meetings with dates, titles, and registration status
2. **Given** a user viewing their registrations, **When** filtering by date range, **Then** only meetings within selected date range are displayed
3. **Given** a user with both confirmed and waitlisted registrations, **When** viewing the list, **Then** registrations are grouped by status with clear visual distinction
4. **Given** a user's registration, **When** meeting is cancelled by organizer, **Then** status updates to "Meeting Cancelled" in their registrations list
5. **Given** a user viewing past registrations, **When** meeting date has passed, **Then** registrations show "Past Event" status

---

### Edge Cases

- **Registration deadline**: User attempts to register 30 minutes before meeting start → system blocks registration with message "Registration closed for this meeting"
- **Capacity increase during waitlist**: Capacity increased from 20 to 30 with 5 on waitlist → first 5 waitlisted users automatically moved to registered and notified
- **Meeting cancellation**: Organizer cancels meeting with 50 registrations → all registrants notified and registrations marked as cancelled
- **Duplicate registration**: User clicks "Register" button twice rapidly → system detects duplicate and shows error "You are already registered"
- **Meeting status change**: Meeting changes from Announced back to Approved (rare case) → registrations remain but new registrations are blocked
- **User deactivation**: Registered user account is deactivated → registration remains in list marked as "Inactive user"
- **Simultaneous registration**: Two users register for last available spot simultaneously → first request wins, second joins waitlist (database locking)
- **Waitlist promotion**: First waitlisted user declines promotion → system offers to next waitlisted user automatically
- **Registration for past meeting**: User attempts to access registration for meeting 2 days ago → registration option hidden, only "View Details" available
- **Capacity set to zero**: Organizer sets capacity to 0 → all new registrations blocked, existing registrations remain, message shows "Registration closed by organizer"
- **Anonymous meeting access**: Unauthenticated user views announced meeting → they see meeting details and attendee count but "Register" button redirects to login

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to register for meetings with status "Confirmed" or "Announced"
- **FR-002**: System MUST display "Register to Attend" button on meeting detail page for eligible meetings
- **FR-003**: System MUST record registration with user ID, meeting ID, registration timestamp, and status (Confirmed/Waitlisted)
- **FR-004**: System MUST prevent duplicate registrations by same user for same meeting
- **FR-005**: System MUST enforce meeting capacity limits when configured
- **FR-006**: System MUST automatically add users to waitlist when meeting is at full capacity
- **FR-007**: System MUST allow users to cancel their registration before meeting start time minus configured cutoff period
- **FR-008**: System MUST automatically promote waitlisted users when spots become available (first-in-first-out)
- **FR-009**: System MUST display registration count and capacity on meeting details page
- **FR-010**: System MUST provide attendee list view for meeting organizers and administrators
- **FR-011**: System MUST allow meeting organizers to set and update capacity limits
- **FR-012**: System MUST close registrations at configured time before meeting start (default: 30 minutes)
- **FR-013**: System MUST mark registrations as "Attended" status after meeting end time
- **FR-014**: System MUST display user's registration status on meeting detail page (Registered/Waitlisted/Not Registered)
- **FR-015**: System MUST provide "My Registrations" page showing all user's current registrations
- **FR-016**: System MUST allow administrators to export attendee list to CSV format
- **FR-017**: System MUST display capacity indicator with visual progress bar on meeting cards
- **FR-018**: System MUST handle meeting cancellation by notifying all registered users (future: email, current: status update)
- **FR-019**: System MUST prevent registration for meetings that have already started or passed
- **FR-020**: System MUST integrate registration button into existing Drawer component for meetings
- **FR-021**: System MUST use Fluent UI components for all registration interfaces
- **FR-022**: System MUST respect existing role-based permissions for viewing attendee details
- **FR-023**: System MUST validate user authentication before allowing registration actions
- **FR-024**: System MUST provide visual distinction between Confirmed and Waitlisted registrations
- **FR-025**: System MUST update registration counts in real-time across all users viewing same meeting

### Key Entities

- **MeetingRegistration**: Registration record with ID, MeetingId, UserId, RegistrationDate, Status (Confirmed/Waitlisted/Cancelled), CancellationDate, CancellationReason
- **MeetingCapacity**: Capacity configuration with MeetingId, MaxAttendees (nullable for unlimited), RegistrationDeadline, AllowWaitlist (boolean), WaitlistLimit
- **AttendeeList**: View/aggregate showing all registrations for a meeting with user details, registration status, timestamps
- **UserRegistration**: View showing all meetings a user has registered for with meeting details and registration status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration for a meeting in under 5 seconds with single button click
- **SC-002**: Meeting organizers can view complete attendee list in under 2 seconds for meetings with up to 200 registrants
- **SC-003**: System prevents duplicate registrations with 100% accuracy in testing
- **SC-004**: Waitlist promotion occurs within 1 second of spot becoming available
- **SC-005**: Registration capacity enforcement is accurate in 100% of concurrent registration tests
- **SC-006**: Attendee count updates across all viewers within 3 seconds of registration action
- **SC-007**: Users can find and view their registrations in under 3 clicks from main page
- **SC-008**: CSV export of attendee list completes in under 5 seconds for meetings with 500 registrants
- **SC-009**: Registration cutoff time is enforced with 100% accuracy (no registrations after deadline)
- **SC-010**: 95% of users successfully register on first attempt without errors

## Assumptions

- Users have valid Azure AD accounts and are authenticated via MSAL
- Meeting capacity is set by meeting organizers at meeting creation or later
- Default registration cutoff is 30 minutes before meeting start time (configurable by system admin)
- Users understand that registration is commitment to attend but not legally binding
- Waitlist promotions are automatic and do not require user acceptance
- Meeting organizers have access to attendee information for their meetings
- Registration data is retained for 90 days after meeting date for reporting purposes
- No payment or approval process required for registration (free open registration)
- Users registering are assumed to have calendar access to add meeting to their schedule manually
- Meeting location and virtual link details are visible to registered attendees only (future enhancement)
- Anonymous registration is not supported; users must authenticate
- One registration per user per meeting (no +1 or group registration)
- Cancelled registrations do not reopen automatically; users must re-register if desired
- System assumes stable network during registration; no offline registration capability
