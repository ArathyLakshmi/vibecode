# API Contract: Register for Meeting

## Endpoint

```
POST /api/meetingrequests/{meetingId}/registrations
```

## Description

Register the authenticated user to attend a meeting. Creates a new registration record with status "Confirmed" if capacity is available, or "Waitlisted" if meeting is at full capacity.

## Authentication

**Required**: Yes (Azure AD MSAL)

## Authorization

- All authenticated users can register for Confirmed or Announced meetings
- Registration deadline must not have passed
- User cannot already be registered for the meeting

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meetingId | integer | Yes | ID of the meeting to register for |

### Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Body

No request body required. User information is extracted from authentication token.

### Example Request

```http
POST /api/meetingrequests/42/registrations HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json
```

## Response

### Success Response (201 Created)

**Condition**: Registration successful (Confirmed status)

```json
{
  "id": 123,
  "meetingRequestId": 42,
  "userEmail": "john.doe@company.com",
  "userName": "John Doe",
  "registrationDate": "2026-02-28T14:30:00Z",
  "status": "Confirmed",
  "waitlistPosition": null,
  "cancellationDate": null,
  "cancellationReason": null
}
```

### Success Response (201 Created - Waitlisted)

**Condition**: Registration successful but added to waitlist (capacity reached)

```json
{
  "id": 124,
  "meetingRequestId": 42,
  "userEmail": "jane.smith@company.com",
  "userName": "Jane Smith",
  "registrationDate": "2026-02-28T14:35:00Z",
  "status": "Waitlisted",
  "waitlistPosition": 3,
  "cancellationDate": null,
  "cancellationReason": null
}
```

### Error Responses

#### 400 Bad Request - Meeting Not Eligible

**Condition**: Meeting status is not Confirmed or Announced

```json
{
  "error": "Registration not available for this meeting",
  "detail": "Meeting must be Confirmed or Announced to allow registrations"
}
```

#### 400 Bad Request - Registration Deadline Passed

**Condition**: Current time is past registration deadline

```json
{
  "error": "Registration deadline has passed",
  "detail": "Registration closed 30 minutes before meeting start time",
  "meetingDate": "2026-02-28T15:00:00Z",
  "registrationDeadline": "2026-02-28T14:30:00Z"
}
```

#### 409 Conflict - Already Registered

**Condition**: User already has an active registration for this meeting

```json
{
  "error": "Already registered",
  "detail": "You are already registered for this meeting",
  "existingRegistrationId": 123,
  "existingStatus": "Confirmed"
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

#### 401 Unauthorized

**Condition**: User is not authenticated

```json
{
  "error": "Authentication required",
  "detail": "You must be logged in to register for meetings"
}
```

## Business Rules

1. User must be authenticated via Azure AD
2. Meeting status must be "Confirmed" or "Announced"
3. Current time must be before (MeetingDate - RegistrationDeadlineMinutes)
4. User cannot already have an active registration (Confirmed or Waitlisted status)
5. If capacity is available (RegisteredCount < MaxAttendees), status is "Confirmed"
6. If capacity is full, status is "Waitlisted" with next available position
7. If MaxAttendees is NULL, capacity is unlimited (always "Confirmed")

## Database Operations

```sql
-- 1. Validate meeting eligibility
SELECT Status, MeetingDate, RegistrationDeadlineMinutes, MaxAttendees
FROM MeetingRequests
WHERE Id = @meetingId;

-- 2. Check for existing registration
SELECT Id, Status FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId AND UserEmail = @userEmail;

-- 3. Count confirmed registrations (within transaction)
SELECT COUNT(*) FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId AND Status = 'Confirmed';

-- 4. Insert new registration
INSERT INTO MeetingRegistrations 
  (MeetingRequestId, UserEmail, UserName, RegistrationDate, Status, WaitlistPosition, CreatedAt, UpdatedAt)
VALUES 
  (@meetingId, @userEmail, @userName, @now, @status, @waitlistPos, @now, @now);
```

## Performance

- **Expected latency**: < 200ms (database transaction + validation)
- **Concurrent requests**: Handled via transaction isolation
- **Rate limiting**: None (authenticated users only)

## Testing Scenarios

### Happy Path
1. Authenticated user registers for Confirmed meeting with capacity → Status: Confirmed
2. Authenticated user registers for full-capacity meeting → Status: Waitlisted, Position: 1

### Edge Cases
1. User rapidly clicks register twice → Second request returns 409 Conflict
2. Two users register for last available spot simultaneously → First wins (Confirmed), second waitlisted
3. Registration 1 second before deadline → Success
4. Registration 1 second after deadline → 400 Bad Request

## Implementation Notes

- Use database transactions with isolation level to prevent race conditions
- Extract user info from `User.Claims` (NameIdentifier, Email, Name)
- Calculate registration deadline: `MeetingDate.AddMinutes(-RegistrationDeadlineMinutes ?? -30)`
- WaitlistPosition: `MAX(WaitlistPosition) + 1` for meeting, or `1` if first waitlisted

## Related Endpoints

- GET /api/meetingrequests/{meetingId}/registrations - View attendee list
- DELETE /api/meetingrequests/{meetingId}/registrations/current - Cancel registration
- GET /api/registrations/my-registrations - View user's registrations
