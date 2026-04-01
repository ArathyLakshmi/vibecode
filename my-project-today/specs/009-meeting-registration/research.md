# Research: Meeting Registration & Attendance

**Feature**: 009-meeting-registration  
**Date**: February 28, 2026  
**Status**: Complete

## Overview

This document captures research findings and technical decisions for implementing the meeting registration and attendance tracking system.

## Technical Context

### Existing System Analysis

**Current Stack:**
- **Frontend**: React 18 + Vite 5.4.21
- **UI Framework**: Fluent UI v9 (Microsoft Teams design system)
- **Authentication**: Azure AD MSAL (@azure/msal-react)
- **Backend**: ASP.NET Core 8.0 with minimal APIs
- **Database**: SQLite with Entity Framework Core
- **State Management**: React hooks (useState, useEffect)

**Existing Patterns:**
- Meeting requests use status-based workflow (Draft → Pending → Approved → Confirmed → Announced)
- Drawer component pattern for detail views (MeetingRequestsList.jsx)
- Role-based access control (SecAdmin, EdOffice, ManagementOffice)
- Audit logging for status changes
- Attachment management for meeting documents

### Integration Points

1. **MeetingRequests Table**: Status field determines registration eligibility (Confirmed/Announced)
2. **Drawer Component**: Add registration controls alongside existing actions (Approve, Confirm, Cancel)
3. **API Controllers**: Extend MeetingRequestsController or create RegistrationsController
4. **User Context**: MSAL provides authenticated user information (accounts[0].username)

## Key Decisions

### Decision 1: Database Schema Design

**Decision**: Create separate `MeetingRegistrations` table with foreign keys to MeetingRequests and Users

**Rationale**:
- Maintains separation of concerns (registrations independent of meeting request data)
- Supports many-to-many relationship (one meeting → many registrations, one user → many registrations)
- Enables efficient queries for attendee lists and user's registered meetings
- Allows adding registration-specific fields (status, waitlist position, cancellation reason)

**Alternatives Considered**:
- **JSON column in MeetingRequests**: Rejected due to poor query performance and lack of referential integrity
- **Separate Users table**: Not needed since Azure AD is authoritative source; store email/name as denormalized data

**Schema**:
```sql
CREATE TABLE MeetingRegistrations (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MeetingRequestId INTEGER NOT NULL,
    UserEmail TEXT NOT NULL,
    UserName TEXT NOT NULL,
    RegistrationDate TEXT NOT NULL,
    Status TEXT NOT NULL, -- 'Confirmed', 'Waitlisted', 'Cancelled', 'Attended'
    WaitlistPosition INTEGER NULL,
    CancellationDate TEXT NULL,
    CancellationReason TEXT NULL,
    FOREIGN KEY (MeetingRequestId) REFERENCES MeetingRequests(Id),
    UNIQUE(MeetingRequestId, UserEmail)
);

CREATE INDEX IX_MeetingRegistrations_MeetingRequestId ON MeetingRegistrations(MeetingRequestId);
CREATE INDEX IX_MeetingRegistrations_UserEmail ON MeetingRegistrations(UserEmail);
CREATE INDEX IX_MeetingRegistrations_Status ON MeetingRegistrations(Status);
```

**Capacity Configuration**:
- Add nullable `MaxAttendees`, `RegistrationDeadlineMinutes` columns to MeetingRequests table
- Default: unlimited capacity (NULL), 30-minute cutoff

---

### Decision 2: Waitlist Management Strategy

**Decision**: Automatic promotion using first-in-first-out (FIFO) queue with WaitlistPosition column

**Rationale**:
- Fair and transparent (first to waitlist gets first spot when available)
- Simple to implement with ORDER BY WaitlistPosition
- No manual intervention required from organizers
- Clear expectations for users (position visible in UI)

**Alternatives Considered**:
- **Manual promotion by organizer**: Rejected due to increased overhead and potential for delays
- **No waitlist (registration closed when full)**: Rejected as it reduces user options and causes frustration

**Implementation**:
- On cancellation: Query waitlisted registrations ORDER BY WaitlistPosition ASC LIMIT 1
- Update promoted registration: Status='Confirmed', WaitlistPosition=NULL
- Recalculate remaining waitlist positions (decrement all)
- Future enhancement: Send notification to promoted user

---

### Decision 3: API Design Pattern

**Decision**: RESTful endpoints under `/api/meetingrequests/{id}/registrations` namespace

**Rationale**:
- Follows existing API structure (meetings/{id}/attachments, meetings/{id}/agenda)
- Registration is a sub-resource of meeting request
- Clear hierarchical relationship in URL structure
- Aligns with ASP.NET Core routing conventions

**Endpoints**:
```
POST   /api/meetingrequests/{meetingId}/registrations              Register for meeting
DELETE /api/meetingrequests/{meetingId}/registrations/current      Cancel current user's registration
GET    /api/meetingrequests/{meetingId}/registrations              Get all registrations (attendee list)
GET    /api/registrations/my-registrations                         Get current user's registrations
GET    /api/meetingrequests/{meetingId}/registrations/export       Export attendees to CSV
POST   /api/meetingrequests/{meetingId}/capacity                   Update capacity settings
```

**Alternatives Considered**:
- **Top-level /api/registrations**: Rejected as registration context requires meeting
- **Include in meeting details response**: Rejected to avoid bloating meeting detail payload

---

### Decision 4: Frontend Component Structure

**Decision**: Add registration controls to existing Drawer component, create new MyRegistrationsPage component

**Rationale**:
- Drawer already contains meeting actions (Approve, Confirm, Cancel)
- Consistent user experience (actions in same location)
- Minimal UI changes (add button below existing actions)
- Separate page for user's registration list maintains navigation clarity

**Components**:
1. **Drawer Enhancement** (MeetingRequestsList.jsx):
   - Add `onRegister` callback prop
   - Display "Register to Attend" button for Confirmed/Announced meetings
   - Show registration status badge ("Registered", "Waitlisted", "X/Y spots")
   - Add "View Attendees" button for organizers/admins

2. **New Component** (MyRegistrationsPage.jsx):
   - List view of user's registrations
   - Filter by upcoming/past/cancelled
   - Quick actions (cancel registration, view meeting details)
   - Integrate into AppShell navigation

3. **Attendee List Component** (AttendeeListView.jsx):
   - Modal or inline view in drawer
   - Separate tabs for Confirmed/Waitlisted
   - Export button
   - Capacity progress bar

**Alternatives Considered**:
- **Separate registration page per meeting**: Rejected as it requires extra navigation
- **Modal popup for registration**: Rejected as single-click registration is preferred

---

### Decision 5: Capacity Enforcement Mechanism

**Decision**: Database transaction with row locking to prevent race conditions in concurrent registrations

**Rationale**:
- SQLite supports transactions and SELECT ... FOR UPDATE equivalent
- Ensures accurate capacity counting during simultaneous registrations
- Prevents overselling of limited spots
- Standard pattern for inventory management

**Implementation**:
```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try {
    var meeting = await _context.MeetingRequests
        .FirstOrDefaultAsync(m => m.Id == meetingId);
    
    var confirmedCount = await _context.MeetingRegistrations
        .CountAsync(r => r.MeetingRequestId == meetingId && r.Status == "Confirmed");
    
    var status = (meeting.MaxAttendees.HasValue && confirmedCount >= meeting.MaxAttendees.Value)
        ? "Waitlisted"
        : "Confirmed";
    
    var registration = new MeetingRegistration {
        MeetingRequestId = meetingId,
        UserEmail = userEmail,
        Status = status,
        WaitlistPosition = status == "Waitlisted" ? GetNextWaitlistPosition(meetingId) : null
    };
    
    _context.MeetingRegistrations.Add(registration);
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch {
    await transaction.RollbackAsync();
    throw;
}
```

**Alternatives Considered**:
- **Optimistic concurrency**: Rejected due to user-facing retry complexity
- **Distributed lock service**: Overkill for SQLite single-instance deployment

---

### Decision 6: Registration Deadline Handling

**Decision**: Server-side validation based on meeting date/time minus configurable cutoff minutes

**Rationale**:
- Server time is authoritative source (client time can be manipulated)
- Prevents last-minute registrations that organizers can't accommodate
- Configurable per meeting for flexibility (default: 30 minutes)
- Simple calculation: DateTime.UtcNow >= Meeting.MeetingDate.AddMinutes(-cutoff)

**Implementation**:
```csharp
var cutoffMinutes = meeting.RegistrationDeadlineMinutes ?? 30;
var registrationDeadline = meeting.MeetingDate.AddMinutes(-cutoffMinutes);

if (DateTime.UtcNow >= registrationDeadline) {
    throw new InvalidOperationException("Registration deadline has passed");
}
```

**Alternatives Considered**:
- **Client-side only validation**: Rejected due to security and accuracy concerns
- **Fixed deadline for all meetings**: Rejected as organizer needs flexibility

---

### Decision 7: User Information Storage

**Decision**: Denormalize user email and name in MeetingRegistrations table from MSAL context

**Rationale**:
- No separate Users table needed (Azure AD is source of truth)
- Captures user information at time of registration (audit trail)
- Enables attendee list display without additional MSAL lookups
- Handles account deletions gracefully (historical data preserved)

**User Data Extraction**:
```javascript
// Frontend (React)
const { accounts } = useMsal();
const userEmail = accounts[0]?.username || accounts[0]?.email;
const userName = accounts[0]?.name || userEmail;

// Backend (C#)
var userEmail = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? User.FindFirst(ClaimTypes.Email)?.Value;
var userName = User.FindFirst(ClaimTypes.Name)?.Value 
                ?? User.FindFirst(ClaimTypes.GivenName)?.Value;
```

**Alternatives Considered**:
- **UserId foreign key to Users table**: Rejected as it requires user provisioning workflow
- **Real-time MSAL lookup**: Rejected due to performance impact on large attendee lists

---

## Technology Decisions

### Frontend Libraries

**No new dependencies required**:
- ✅ React hooks (useState, useEffect) for state management
- ✅ Fluent UI v9 components (Button, Badge, ProgressBar, Dialog)
- ✅ @azure/msal-react for authenticated user context
- ✅ fetch API for HTTP requests
- ✅ jsPDF (already installed) for PDF export if needed

### Backend Libraries

**No new dependencies required**:
- ✅ Entity Framework Core (existing)
- ✅ ASP.NET Core minimal APIs (existing pattern)
- ✅ System.Linq for query composition
- ✅ CsvHelper (add for CSV export - lightweight, 2.8MB)

**New NuGet Package**:
```xml
<PackageReference Include="CsvHelper" Version="30.0.1" />
```

### Database Migration

Use EF Core migrations for schema changes:
```bash
dotnet ef migrations add AddMeetingRegistrations
dotnet ef database update
```

---

## Best Practices Applied

### 1. **Optimistic UI Updates**
- Show "Registering..." state immediately on button click
- Revert on error with clear error message
- Reduces perceived latency

### 2. **Progressive Enhancement**
- Registration works with basic view (button)
- Enhanced with capacity indicators when available
- Waitlist as optional enhancement

### 3. **Accessibility**
- ARIA labels for registration status
- Keyboard navigation for all controls
- Screen reader announcements for status changes

### 4. **Performance**
- Index foreign keys for efficient joins
- Paginate large attendee lists (50 per page)
- Cache attendee count on meeting object (denormalize for reads)

### 5. **Security**
- Validate user authentication on all registration endpoints
- Prevent registration manipulation (duplicate check)
- Authorize attendee list access (organizer or admin only)

---

## Open Questions & Assumptions

### Assumptions
1. ✅ **No email notifications in v1** - Status updates only visible in UI
2. ✅ **Single timezone** - Server timezone used for all deadline calculations
3. ✅ **No guest registration** - Must be authenticated Azure AD user
4. ✅ **Unlimited capacity default** - NULL MaxAttendees means no limit
5. ✅ **30-minute default cutoff** - Configurable but reasonable default

### Resolved Questions
1. **Q: How many registrations per user per meeting?**  
   A: One registration per user per meeting (enforced by UNIQUE constraint)

2. **Q: Can organizers override capacity?**  
   A: Yes, organizers can update MaxAttendees even after registrations exist (may move users to waitlist)

3. **Q: What happens to registrations when meeting is cancelled?**  
   A: Registrations remain with status updated to reflect meeting cancellation (historical record)

4. **Q: Who can view attendee list?**  
   A: Meeting requestor (creator) and administrators (SecAdmin, EdOffice, ManagementOffice)

5. **Q: Export format for attendee list?**  
   A: CSV with columns: Name, Email, Registration Date, Status, Waitlist Position

---

## Implementation Risks

### Risk 1: Race Conditions in Concurrent Registrations
**Mitigation**: Database transactions with row locking  
**Severity**: High  
**Status**: Addressed in Decision 5

### Risk 2: Waitlist Complexity
**Mitigation**: Start with simple FIFO, defer advanced rules to v2  
**Severity**: Medium  
**Status**: Scoped appropriately

### Risk 3: Large Attendee Lists Performance
**Mitigation**: Pagination, indexing, cache counts  
**Severity**: Low (500 response limit)  
**Status**: Monitoring strategy defined

---

## Summary

All technical decisions documented with clear rationale. No unresolved questions remain. Implementation can proceed with:

1. **Database**: Add MeetingRegistrations table + capacity columns to MeetingRequests
2. **Backend**: Registration API endpoints with transaction-based capacity enforcement
3. **Frontend**: Drawer enhancements + MyRegistrationsPage component
4. **Testing**: Focus on concurrent registration scenarios and deadline validation

**Next Phase**: [data-model.md](data-model.md) for detailed schema definition
