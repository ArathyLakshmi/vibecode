# API Contract: Get Attendee List

## Endpoint

```
GET /api/meetingrequests/{meetingId}/registrations
```

## Description

Retrieve the list of registered attendees for a meeting, including both confirmed and waitlisted users. Returns attendee details with registration status and timestamps.

## Authentication

**Required**: Yes (Azure AD MSAL)

## Authorization

- Meeting requestor (creator) can view attendees for their meetings
- Administrators (SecAdmin, EdOffice, ManagementOffice) can view attendees for any meeting
- Other users receive 403 Forbidden

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meetingId | integer | Yes | ID of the meeting to get attendees for |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | all | Filter by status: "confirmed", "waitlisted", "all" |
| page | integer | No | 1 | Page number for pagination |
| pageSize | integer | No | 50 | Number of results per page (max: 100) |

### Headers

```
Authorization: Bearer {access_token}
```

### Example Request

```http
GET /api/meetingrequests/42/registrations?status=all&page=1&pageSize=50 HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## Response

### Success Response (200 OK)

```json
{
  "meetingId": 42,
  "meetingTitle": "Board Strategy Meeting Q1 2026",
  "meetingDate": "2026-03-15T14:00:00Z",
  "capacity": {
    "maxAttendees": 30,
    "registeredCount": 28,
    "waitlistedCount": 5,
    "availableSpots": 2
  },
  "attendees": {
    "confirmed": [
      {
        "userName": "John Doe",
        "userEmail": "john.doe@company.com",
        "registrationDate": "2026-02-28T10:00:00Z",
        "status": "Confirmed",
        "waitlistPosition": null
      },
      {
        "userName": "Jane Smith",
        "userEmail": "jane.smith@company.com",
        "registrationDate": "2026-02-28T11:30:00Z",
        "status": "Confirmed",
        "waitlistPosition": null
      }
    ],
    "waitlisted": [
      {
        "userName": "Bob Johnson",
        "userEmail": "bob.johnson@company.com",
        "registrationDate": "2026-02-28T15:00:00Z",
        "status": "Waitlisted",
        "waitlistPosition": 1
      },
      {
        "userName": "Alice Williams",
        "userEmail": "alice.williams@company.com",
        "registrationDate": "2026-02-28T15:10:00Z",
        "status": "Waitlisted",
        "waitlistPosition": 2
      }
    ]
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalCount": 33,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### Success Response (200 OK - No Registrations)

```json
{
  "meetingId": 45,
  "meetingTitle": "Monthly Review Meeting",
  "meetingDate": "2026-03-20T10:00:00Z",
  "capacity": {
    "maxAttendees": 50,
    "registeredCount": 0,
    "waitlistedCount": 0,
    "availableSpots": 50
  },
  "attendees": {
    "confirmed": [],
    "waitlisted": []
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalCount": 0,
    "totalPages": 0,
    "hasMore": false
  }
}
```

### Error Responses

#### 403 Forbidden - Not Authorized

**Condition**: User is not meeting requestor or administrator

```json
{
  "error": "Access denied",
  "detail": "Only meeting organizers and administrators can view attendee lists"
}
```

#### 404 Not Found

**Condition**: Meeting with specified ID does not exist

```json
{
  "error": "Meeting not found",
  "detail": "No meeting exists with ID 42"
}
```

#### 400 Bad Request - Invalid Status

**Condition**: Invalid status filter value

```json
{
  "error": "Invalid status filter",
  "detail": "Status must be one of: confirmed, waitlisted, all"
}
```

#### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "detail": "You must be logged in to view attendee lists"
}
```

## Business Rules

1. User must be authenticated via Azure AD
2. User must be:
   - Meeting requestor (createdBy or requestorEmail matches user), OR
   - Administrator (SecAdmin, EdOffice, or ManagementOffice role)
3. Confirmed attendees sorted by registration date (ascending)
4. Waitlisted attendees sorted by waitlist position (ascending)
5. Pagination applies to total attendee count (confirmed + waitlisted combined)
6. Cancelled and Attended registrations excluded from results

## Database Operations

```sql
-- 1. Check meeting exists and user authorization
SELECT m.Id, m.Title, m.MeetingDate, m.MaxAttendees, m.RequestorEmail, m.CreatedBy
FROM MeetingRequests m
WHERE m.Id = @meetingId;

-- 2. Count registrations by status
SELECT 
    COUNT(CASE WHEN Status = 'Confirmed' THEN 1 END) as ConfirmedCount,
    COUNT(CASE WHEN Status = 'Waitlisted' THEN 1 END) as WaitlistedCount
FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId
  AND Status IN ('Confirmed', 'Waitlisted');

-- 3. Get confirmed attendees (with pagination)
SELECT UserName, UserEmail, RegistrationDate, Status, WaitlistPosition
FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId
  AND Status = 'Confirmed'
ORDER BY RegistrationDate ASC
LIMIT @pageSize OFFSET @offset;

-- 4. Get waitlisted attendees (with pagination)
SELECT UserName, UserEmail, RegistrationDate, Status, WaitlistPosition
FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId
  AND Status = 'Waitlisted'
ORDER BY WaitlistPosition ASC
LIMIT @pageSize OFFSET @offset;
```

## Authorization Logic

```csharp
var meeting = await _context.MeetingRequests.FindAsync(meetingId);
var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

var isRequestor = meeting.RequestorEmail == userEmail || meeting.CreatedBy == userEmail;
var isAdmin = userRoles.Any(r => r == "SecAdmin" || r == "EdOffice" || r == "ManagementOffice");

if (!isRequestor && !isAdmin)
{
    return Forbid();
}
```

## Performance

- **Expected latency**: < 500ms for 100 registrations
- **Pagination**: Recommended for meetings with >50 registrations
- **Caching**: None (real-time data required)
- **Indexes**: MeetingRequestId, Status for optimal query performance

## Export Format

For CSV export endpoint (GET /api/meetingrequests/{meetingId}/registrations/export):

```csv
Name,Email,Registration Date,Status,Waitlist Position
John Doe,john.doe@company.com,2026-02-28 10:00:00,Confirmed,
Jane Smith,jane.smith@company.com,2026-02-28 11:30:00,Confirmed,
Bob Johnson,bob.johnson@company.com,2026-02-28 15:00:00,Waitlisted,1
Alice Williams,alice.williams@company.com,2026-02-28 15:10:00,Waitlisted,2
```

## Testing Scenarios

### Happy Path
1. Meeting requestor views attendee list → Success, all attendees returned
2. Administrator views attendee list → Success, all attendees returned
3. Filter by confirmed only → Only confirmed attendees returned
4. Filter by waitlisted only → Only waitlisted attendees returned

### Edge Cases
1. Non-requestor, non-admin user attempts to view → 403 Forbidden
2. Meeting with 200 registrations, page 1 (50 per page) → First 50 returned
3. Meeting with no registrations → Empty arrays, count: 0
4. Invalid status filter → 400 Bad Request

## Implementation Notes

- Extract user email and roles from `User.Claims`
- Use EF Core `Include()` to load meeting details with single query
- Separate queries for confirmed and waitlisted for cleaner sorting
- Consider caching capacity info if performance becomes issue
- Future enhancement: Real-time updates via SignalR

## Related Endpoints

- POST /api/meetingrequests/{meetingId}/registrations - Register for meeting
- DELETE /api/meetingrequests/{meetingId}/registrations/current - Cancel registration
- GET /api/meetingrequests/{meetingId}/registrations/export - Export to CSV
