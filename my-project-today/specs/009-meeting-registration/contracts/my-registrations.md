# API Contract: Get My Registrations

## Endpoint

```
GET /api/registrations/my-registrations
```

## Description

Retrieve all meeting registrations for the authenticated user, including upcoming, past, and cancelled registrations. Returns meeting details with registration status for dashboard view.

## Authentication

**Required**: Yes (Azure AD MSAL)

## Authorization

- All authenticated users can view their own registrations only

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| filter | string | No | upcoming | Filter: "upcoming", "past", "cancelled", "all" |
| page | integer | No | 1 | Page number for pagination |
| pageSize | integer | No | 20 | Number of results per page (max: 50) |

### Headers

```
Authorization: Bearer {access_token}
```

### Example Request

```http
GET /api/registrations/my-registrations?filter=upcoming&page=1&pageSize=20 HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## Response

### Success Response (200 OK)

```json
{
  "userEmail": "john.doe@company.com",
  "userName": "John Doe",
  "registrations": [
    {
      "registrationId": 123,
      "meetingRequestId": 42,
      "meetingTitle": "Board Strategy Meeting Q1 2026",
      "meetingReferenceNumber": "REF-2026-042",
      "meetingDate": "2026-03-15T14:00:00Z",
      "meetingStatus": "Confirmed",
      "registrationStatus": "Confirmed",
      "waitlistPosition": null,
      "registrationDate": "2026-02-28T10:00:00Z",
      "canCancel": true,
      "daysUntilMeeting": 15
    },
    {
      "registrationId": 125,
      "meetingRequestId": 45,
      "meetingTitle": "Monthly Review Meeting",
      "meetingReferenceNumber": "REF-2026-045",
      "meetingDate": "2026-03-20T10:00:00Z",
      "meetingStatus": "Announced",
      "registrationStatus": "Waitlisted",
      "waitlistPosition": 2,
      "registrationDate": "2026-02-28T15:10:00Z",
      "canCancel": true,
      "daysUntilMeeting": 20
    }
  ],
  "summary": {
    "totalUpcoming": 2,
    "totalConfirmed": 1,
    "totalWaitlisted": 1,
    "totalPast": 5,
    "totalCancelled": 1
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalCount": 2,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### Success Response (200 OK - No Registrations)

```json
{
  "userEmail": "new.user@company.com",
  "userName": "New User",
  "registrations": [],
  "summary": {
    "totalUpcoming": 0,
    "totalConfirmed": 0,
    "totalWaitlisted": 0,
    "totalPast": 0,
    "totalCancelled": 0
  },
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalCount": 0,
    "totalPages": 0,
    "hasMore": false
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Filter

**Condition**: Invalid filter value

```json
{
  "error": "Invalid filter",
  "detail": "Filter must be one of: upcoming, past, cancelled, all"
}
```

#### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "detail": "You must be logged in to view your registrations"
}
```

## Business Rules

1. User must be authenticated via Azure AD
2. Returns only registrations for authenticated user's email
3. **Upcoming filter**: Meeting date >= current date AND status IN ('Confirmed', 'Waitlisted')
4. **Past filter**: Meeting date < current date AND status IN ('Confirmed', 'Waitlisted', 'Attended')
5. **Cancelled filter**: Registration status = 'Cancelled'
6. **All filter**: All registrations regardless of date or status
7. **canCancel** = true if:
   - Registration status is 'Confirmed' or 'Waitlisted', AND
   - Meeting date > current date
8. Sorted by meeting date (ascending for upcoming, descending for past)
9. Summary counts are across all registrations (not affected by filter or pagination)

## Database Operations

```sql
-- 1. Get filtered registrations with meeting details
SELECT 
    r.Id as RegistrationId,
    r.MeetingRequestId,
    r.RegistrationStatus,
    r.WaitlistPosition,
    r.RegistrationDate,
    m.Title as MeetingTitle,
    m.ReferenceNumber as MeetingReferenceNumber,
    m.MeetingDate,
    m.Status as MeetingStatus
FROM MeetingRegistrations r
INNER JOIN MeetingRequests m ON r.MeetingRequestId = m.Id
WHERE r.UserEmail = @userEmail
  AND (
    -- Upcoming filter
    (@filter = 'upcoming' AND m.MeetingDate >= @now AND r.Status IN ('Confirmed', 'Waitlisted'))
    OR
    -- Past filter
    (@filter = 'past' AND m.MeetingDate < @now)
    OR
    -- Cancelled filter
    (@filter = 'cancelled' AND r.Status = 'Cancelled')
    OR
    -- All filter
    (@filter = 'all')
  )
ORDER BY 
    CASE WHEN @filter = 'past' THEN m.MeetingDate END DESC,
    CASE WHEN @filter != 'past' THEN m.MeetingDate END ASC
LIMIT @pageSize OFFSET @offset;

-- 2. Get summary counts (always computed regardless of filter)
SELECT 
    COUNT(CASE WHEN m.MeetingDate >= @now AND r.Status = 'Confirmed' THEN 1 END) as TotalConfirmed,
    COUNT(CASE WHEN m.MeetingDate >= @now AND r.Status = 'Waitlisted' THEN 1 END) as TotalWaitlisted,
    COUNT(CASE WHEN m.MeetingDate < @now THEN 1 END) as TotalPast,
    COUNT(CASE WHEN r.Status = 'Cancelled' THEN 1 END) as TotalCancelled
FROM MeetingRegistrations r
INNER JOIN MeetingRequests m ON r.MeetingRequestId = m.Id
WHERE r.UserEmail = @userEmail;
```

## Response Field Calculations

```csharp
// canCancel logic
var canCancel = (registration.Status == "Confirmed" || registration.Status == "Waitlisted")
                && meeting.MeetingDate > DateTime.UtcNow;

// daysUntilMeeting logic
var daysUntilMeeting = (int)(meeting.MeetingDate - DateTime.UtcNow).TotalDays;
```

## Performance

- **Expected latency**: < 300ms for 50 registrations
- **Pagination**: Applied for user convenience (most users have <20 registrations)
- **Join performance**: Single INNER JOIN on indexed MeetingRequestId
- **Summary query**: Separate optimized query for counts

## Filter Behavior Examples

### Upcoming Filter (default)
- Returns: Meetings with date >= today, status Confirmed or Waitlisted
- Sorted: Nearest date first
- Use case: "What meetings do I need to attend?"

### Past Filter
- Returns: Meetings with date < today, any status except Cancelled
- Sorted: Most recent first
- Use case: "What meetings did I attend?"

### Cancelled Filter
- Returns: Registrations with status = Cancelled, any meeting date
- Sorted: Cancellation date descending
- Use case: "What meetings did I cancel?"

### All Filter
- Returns: Everything
- Sorted: Upcoming first (ascending), then past (descending)
- Use case: Complete history

## Testing Scenarios

### Happy Path
1. User with 5 upcoming registrations → All returned with correct status
2. User filters by past meetings → Only past meetings returned
3. User with mixed statuses → Summary counts accurate

### Edge Cases
1. New user with no registrations → Empty array, all counts zero
2. User with registration for cancelled meeting → Meeting status shown, canCancel false
3. User with 50+ registrations, pagination → Correct page returned
4. Registration date today, meeting tomorrow → canCancel true

## UI Integration Points

### Dashboard Widget
```javascript
// Fetch upcoming registrations for dashboard
fetch('/api/registrations/my-registrations?filter=upcoming&pageSize=5')
  .then(res => res.json())
  .then(data => {
    displayUpcomingMeetings(data.registrations);
    updateBadge(data.summary.totalUpcoming);
  });
```

### Full Registrations Page
```javascript
// Fetch with user-selected filter and pagination
const filter = userSelectedFilter; // 'upcoming', 'past', 'cancelled', 'all'
const page = currentPage;
fetch(`/api/registrations/my-registrations?filter=${filter}&page=${page}&pageSize=20`)
  .then(res => res.json())
  .then(data => {
    renderRegistrationsList(data.registrations);
    renderPagination(data.pagination);
    renderSummary(data.summary);
  });
```

## Implementation Notes

- Extract user email from `User.Claims` (NameIdentifier or Email claim)
- Use single database query with complex WHERE clause for efficiency
- Summary query should be independent (not affected by pagination)
- Consider caching summary counts for 5 minutes if performance issue
- Future enhancement: Include meeting location and virtual link in response

## Related Endpoints

- POST /api/meetingrequests/{meetingId}/registrations - Register for meeting
- DELETE /api/meetingrequests/{meetingId}/registrations/current - Cancel registration
- GET /api/meetingrequests/{meetingId} - Get meeting details
