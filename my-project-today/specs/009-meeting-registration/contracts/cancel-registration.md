# API Contract: Cancel Registration

## Endpoint

```
DELETE /api/meetingrequests/{meetingId}/registrations/current
```

## Description

Cancel the authenticated user's registration for a meeting. Updates registration status to "Cancelled" and triggers waitlist promotion if applicable.

## Authentication

**Required**: Yes (Azure AD MSAL)

## Authorization

- User can only cancel their own registration
- Registration must be in "Confirmed" or "Waitlisted" status
- Meeting date must not have passed

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meetingId | integer | Yes | ID of the meeting to cancel registration for |

### Headers

```
Authorization: Bearer {access_token}
```

### Body

Optional cancellation reason:

```json
{
  "reason": "Schedule conflict - cannot attend"
}
```

### Example Request

```http
DELETE /api/meetingrequests/42/registrations/current HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

## Response

### Success Response (200 OK)

**Condition**: Cancellation successful

```json
{
  "message": "Registration cancelled successfully",
  "registrationId": 123,
  "cancellationDate": "2026-02-28T14:45:00Z",
  "waitlistPromoted": true,
  "promotedUser": {
    "userName": "Jane Smith",
    "userEmail": "jane.smith@company.com",
    "promotedFromPosition": 1
  }
}
```

### Success Response (200 OK - No Promotion)

**Condition**: Cancellation successful but no waitlist to promote

```json
{
  "message": "Registration cancelled successfully",
  "registrationId": 124,
  "cancellationDate": "2026-02-28T14:50:00Z",
  "waitlistPromoted": false
}
```

### Error Responses

#### 404 Not Found - No Active Registration

**Condition**: User has no active registration for this meeting

```json
{
  "error": "Registration not found",
  "detail": "You do not have an active registration for this meeting"
}
```

#### 400 Bad Request - Cannot Cancel Past Meeting

**Condition**: Meeting date has already passed

```json
{
  "error": "Cannot cancel registration",
  "detail": "Cancellation not allowed for past meetings",
  "meetingDate": "2026-02-27T15:00:00Z"
}
```

#### 400 Bad Request - Already Cancelled

**Condition**: Registration already has "Cancelled" status

```json
{
  "error": "Registration already cancelled",
  "detail": "This registration was cancelled on 2026-02-28T10:00:00Z"
}
```

#### 404 Not Found - Meeting Not Found

```json
{
  "error": "Meeting not found",
  "detail": "No meeting exists with ID 42"
}
```

#### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "detail": "You must be logged in to cancel registrations"
}
```

## Business Rules

1. User must be authenticated via Azure AD
2. User must have an active registration (Status: "Confirmed" or "Waitlisted")
3. Meeting date must not have passed
4. Registration status updated to "Cancelled"
5. CancellationDate set to current timestamp
6. CancellationReason stored if provided
7. If cancelled registration had Status="Confirmed", promote first waitlisted user:
   - Find registration with Status="Waitlisted", lowest WaitlistPosition
   - Update promoted registration: Status="Confirmed", WaitlistPosition=NULL
   - Decrement WaitlistPosition for all remaining waitlisted users

## Database Operations

```sql
-- 1. Find user's registration
SELECT Id, Status, MeetingRequestId FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId 
  AND UserEmail = @userEmail
  AND Status IN ('Confirmed', 'Waitlisted');

-- 2. Check meeting date
SELECT MeetingDate FROM MeetingRequests WHERE Id = @meetingId;

-- 3. Update registration to cancelled (within transaction)
UPDATE MeetingRegistrations
SET Status = 'Cancelled',
    CancellationDate = @now,
    CancellationReason = @reason,
    UpdatedAt = @now
WHERE Id = @registrationId;

-- 4. If was Confirmed, find next waitlisted user
SELECT Id, UserEmail, UserName, WaitlistPosition 
FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId 
  AND Status = 'Waitlisted'
ORDER BY WaitlistPosition ASC
LIMIT 1;

-- 5. Promote waitlisted user
UPDATE MeetingRegistrations
SET Status = 'Confirmed',
    WaitlistPosition = NULL,
    UpdatedAt = @now
WHERE Id = @waitlistedId;

-- 6. Recalculate remaining waitlist positions
UPDATE MeetingRegistrations
SET WaitlistPosition = WaitlistPosition - 1,
    UpdatedAt = @now
WHERE MeetingRequestId = @meetingId
  AND Status = 'Waitlisted'
  AND WaitlistPosition > @promotedPosition;
```

## Waitlist Promotion Logic

```
IF cancelled_registration.Status == 'Confirmed':
    next_waitlisted = SELECT TOP 1 FROM Registrations 
                      WHERE Status='Waitlisted' 
                      ORDER BY WaitlistPosition ASC
    
    IF next_waitlisted EXISTS:
        next_waitlisted.Status = 'Confirmed'
        next_waitlisted.WaitlistPosition = NULL
        
        UPDATE remaining_waitlisted
        SET WaitlistPosition = WaitlistPosition - 1
        WHERE WaitlistPosition > next_waitlisted.original_position
        
        RETURN {waitlistPromoted: true, promotedUser: next_waitlisted}
```

## Performance

- **Expected latency**: < 300ms (includes waitlist recalculation)
- **Transaction**: Required for atomic cancellation + promotion
- **Lock duration**: Minimal (single meeting scope)

## Testing Scenarios

### Happy Path
1. User cancels Confirmed registration → Success, first waitlisted promoted
2. User cancels Waitlisted registration → Success, waitlist positions recalculated
3. User cancels with reason → Reason stored in database

### Edge Cases
1. Last registered user cancels (no waitlist) → Success, no promotion
2. User cancels 1 minute before meeting → Success
3. User attempts to cancel after meeting → 400 Bad Request
4. User attempts to cancel already-cancelled registration → 400 Bad Request
5. Multiple waitlisted users when promotion happens → Only first promoted

## Implementation Notes

- Use database transaction to ensure atomic cancellation + promotion
- Extract user email from `User.Claims`
- Compare DateTime.UtcNow with MeetingDate for past meeting check
- Waitlist promotion is automatic (user doesn't need to accept)
- Future enhancement: Send email notification to promoted user

## Related Endpoints

- POST /api/meetingrequests/{meetingId}/registrations - Register for meeting
- GET /api/meetingrequests/{meetingId}/registrations - View attendee list
- GET /api/registrations/my-registrations - View user's registrations
