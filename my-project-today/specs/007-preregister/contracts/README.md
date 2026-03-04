# API and Component Contracts: Pre-registration Feature

**Feature**: Add Pre-register Button for Announced Requests  
**Branch**: `007-preregister`  
**Date**: 2026-02-14  
**Phase**: Phase 1 Design

---

## API Endpoints

### 1. Create Pre-registration

**Endpoint**: `POST /api/meetingrequests/{id}/preregister`

**Purpose**: Registers the authenticated user for a meeting

**Authentication**: Required (JWT Bearer token)

**Path Parameters**:
- `id` (int, required): MeetingRequest ID

**Request Body**: None (user identity from JWT claims)

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Success Response (201 Created)**:
```json
{
  "id": 1,
  "meetingRequestId": 42,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userName": "John Doe",
  "userEmail": "john.doe@company.com",
  "registeredAt": "2026-02-14T10:30:00Z",
  "status": "Registered"
}
```

**Error Responses**:

**400 Bad Request** - Invalid meeting status
```json
{
  "message": "Pre-registration is only allowed for announced meetings.",
  "statusCode": 400
}
```

**401 Unauthorized** - Not authenticated
```json
{
  "message": "Authentication required to pre-register.",
  "statusCode": 401
}
```

**404 Not Found** - Meeting doesn't exist
```json
{
  "message": "Meeting request not found.",
  "statusCode": 404
}
```

**409 Conflict** - User already registered
```json
{
  "message": "You are already registered for this meeting.",
  "statusCode": 409
}
```

**Implementation Notes**:
- Extract user identity from JWT claims: `oid/sub` (userId), `name` (userName), `preferred_username/email` (userEmail)
- Validate meeting exists and status is "Announced"
- Check for existing active registration (duplicate prevention)
- Create registration with `RegisteredAt = DateTime.UtcNow`
- Return 201 Created with full registration object

---

### 2. Cancel Pre-registration

**Endpoint**: `DELETE /api/meetingrequests/{id}/preregister`

**Purpose**: Cancels the authenticated user's registration (soft-delete)

**Authentication**: Required (JWT Bearer token)

**Path Parameters**:
- `id` (int, required): MeetingRequest ID

**Request Body**: None (user identity from JWT claims)

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**Success Response (204 No Content)**:
```
(empty body)
```

**Error Responses**:

**401 Unauthorized** - Not authenticated
```json
{
  "message": "Authentication required to cancel registration.",
  "statusCode": 401
}
```

**404 Not Found** - Registration doesn't exist or already cancelled
```json
{
  "message": "Active registration not found.",
  "statusCode": 404
}
```

**Implementation Notes**:
- Extract userId from JWT claims
- Find active registration for (MeetingRequestId, UserId)
- If not found, return 404
- Soft-delete: Set `CancelledAt = DateTime.UtcNow`, `Status = "Cancelled"`
- Return 204 No Content on success

---

### 3. List Pre-registrations

**Endpoint**: `GET /api/meetingrequests/{id}/preregistrations`

**Purpose**: Retrieves list of users registered for a meeting

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `id` (int, required): MeetingRequest ID

**Query Parameters**: None

**Headers**:
```http
Accept: application/json
```

**Success Response (200 OK)**:
```json
[
  {
    "id": 1,
    "userName": "John Doe",
    "userEmail": "john.doe@company.com",
    "registeredAt": "2026-02-14T10:30:00Z"
  },
  {
    "id": 3,
    "userName": "Jane Smith",
    "userEmail": "jane.smith@company.com",
    "registeredAt": "2026-02-14T09:15:00Z"
  }
]
```

**Empty Response (200 OK)**:
```json
[]
```

**Error Responses**:

**404 Not Found** - Meeting doesn't exist
```json
{
  "message": "Meeting request not found.",
  "statusCode": 404
}
```

**Implementation Notes**:
- Query active registrations only (global query filter excludes cancelled)
- Sort by `RegisteredAt DESC` (most recent first)
- Project to list item DTO (excludes userId for privacy)
- Return empty array if no registrations

---

### 4. Update Meeting Request DTOs

**Endpoint**: `GET /api/meetingrequests` and `GET /api/meetingrequests/{id}`

**Purpose**: Include pre-registration count in meeting request responses

**Changes to Response DTO**:
```json
{
  "id": 42,
  "title": "Board Meeting - March Planning",
  "description": "...",
  "status": "Announced",
  // ... other existing properties ...
  "preRegistrationCount": 5  // NEW PROPERTY
}
```

**Implementation Notes**:
- Add `PreRegistrationCount` property to `MeetingRequestDto`
- Calculate in DTO projection: `.Select(m => new { ..., PreRegistrationCount = m.PreRegistrations.Count() })`
- Global query filter automatically counts active registrations only
- Default to 0 if no registrations

---

## Backend Controller Methods

### PreRegister Method Signature

```csharp
[HttpPost("{id}/preregister")]
[Authorize]
public async Task<IActionResult> PreRegister(int id)
```

**Responsibilities**:
1. Extract user identity from JWT claims
2. Validate meeting exists and status is "Announced"
3. Check for duplicate registration
4. Create new registration record
5. Return 201 Created with registration DTO

### CancelPreRegistration Method Signature

```csharp
[HttpDelete("{id}/preregister")]
[Authorize]
public async Task<IActionResult> CancelPreRegistration(int id)
```

**Responsibilities**:
1. Extract userId from JWT claims
2. Find active registration for user and meeting
3. Soft-delete registration (set CancelledAt, update Status)
4. Return 204 No Content

### GetPreRegistrations Method Signature

```csharp
[HttpGet("{id}/preregistrations")]
[AllowAnonymous]
public async Task<IActionResult> GetPreRegistrations(int id)
```

**Responsibilities**:
1. Validate meeting exists
2. Query active registrations for meeting
3. Map to list item DTO
4. Return 200 OK with array

---

## Frontend Components

### MeetingRequestCard Component

**File**: `src/client/src/components/MeetingRequestCard.jsx`

**Changes**: Add pre-registration count badge

**Props** (no changes to existing props):
```typescript
interface MeetingRequestCardProps {
  meeting: {
    id: number;
    title: string;
    status: string;
    // ... other existing properties
    preRegistrationCount: number; // NEW PROPERTY from API
  };
  onClick?: () => void;
}
```

**UI Changes**:
- Display count badge if `meeting.preRegistrationCount > 0`
- Position: Next to meeting status badge
- Style: Fluent UI `Badge` component with informative appearance
- Text: `{count} pre-registered`
- ARIA label: `{count} users pre-registered for this meeting`

**Example Rendering**:
```jsx
{meeting.preRegistrationCount > 0 && (
  <Badge 
    appearance="filled" 
    color="informative"
    aria-label={`${meeting.preRegistrationCount} users pre-registered for this meeting`}
  >
    {meeting.preRegistrationCount} pre-registered
  </Badge>
)}
```

---

### MeetingRequestDetail Component

**File**: `src/client/src/components/MeetingRequestDetail.jsx`

**Changes**: Add pre-register button and registrations list section

**New State**:
```typescript
interface RegistrationState {
  isRegistered: boolean;        // Current user's registration status
  isRegistering: boolean;        // Loading state during API call
  registrationCount: number;     // Local count (optimistic updates)
  error: string | null;          // Error message if operation fails
}
```

**New Methods**:
```typescript
const handlePreRegister = async () => {
  // Optimistic update
  setIsRegistered(true);
  setRegistrationCount(prev => prev + 1);
  setError(null);
  
  try {
    await fetch(`/api/meetingrequests/${meeting.id}/preregister`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    // Success - UI already updated
  } catch (error) {
    // Rollback on error
    setIsRegistered(false);
    setRegistrationCount(prev => prev - 1);
    setError('Failed to register. Please try again.');
  }
};

const handleCancelRegistration = async () => {
  // Optimistic update
  setIsRegistered(false);
  setRegistrationCount(prev => prev - 1);
  setError(null);
  
  try {
    await fetch(`/api/meetingrequests/${meeting.id}/preregister`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    // Success - UI already updated
  } catch (error) {
    // Rollback on error
    setIsRegistered(true);
    setRegistrationCount(prev => prev + 1);
    setError('Failed to cancel registration. Please try again.');
  }
};
```

**UI Additions**:
```jsx
{/* Pre-register section - only for Announced status */}
{meeting.status === "Announced" && (
  <div className={styles.preRegisterSection}>
    {!isRegistered ? (
      <Button 
        appearance="primary"
        onClick={handlePreRegister}
        disabled={!isAuthenticated || isRegistering}
        aria-label="Pre-register for this meeting"
      >
        Pre-register
      </Button>
    ) : (
      <div>
        <Button 
          appearance="outline"
          disabled
          icon={<CheckmarkIcon />}
        >
          Registered
        </Button>
        <Button 
          appearance="subtle"
          onClick={handleCancelRegistration}
          disabled={isRegistering}
        >
          Cancel Registration
        </Button>
      </div>
    )}
    
    {error && (
      <MessageBar intent="error">
        {error}
      </MessageBar>
    )}
    
    <PreRegistrationList 
      meetingId={meeting.id} 
      count={registrationCount}
    />
  </div>
)}
```

---

### PreRegistrationList Component (NEW)

**File**: `src/client/src/components/PreRegistrationList.jsx`

**Purpose**: Display list of users registered for a meeting

**Props**:
```typescript
interface PreRegistrationListProps {
  meetingId: number;        // Meeting ID to fetch registrations for
  count: number;            // Total count (for section header)
}
```

**State**:
```typescript
interface PreRegistrationListState {
  registrations: Registration[];
  loading: boolean;
  error: string | null;
}

interface Registration {
  id: number;
  userName: string;
  userEmail: string;
  registeredAt: string; // ISO 8601 datetime
}
```

**Component Structure**:
```jsx
import { List, ListItem, Avatar, Text, Spinner } from '@fluentui/react-components';

function PreRegistrationList({ meetingId, count }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadRegistrations() {
      setLoading(true);
      try {
        const response = await fetch(`/api/meetingrequests/${meetingId}/preregistrations`);
        const data = await response.json();
        setRegistrations(data);
      } catch (error) {
        console.error('Failed to load registrations:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRegistrations();
  }, [meetingId, count]); // Reload when count changes
  
  if (loading) return <Spinner label="Loading registrations..." />;
  if (registrations.length === 0) return <Text>No registrations yet.</Text>;
  
  return (
    <div>
      <Text weight="semibold">
        Pre-registered Attendees ({registrations.length})
      </Text>
      <List style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {registrations.map(reg => (
          <ListItem key={reg.id}>
            <Avatar name={reg.userName} size={32} color="colorful" />
            <div style={{ marginLeft: '12px' }}>
              <Text weight="semibold">{reg.userName}</Text>
              <Text size={200}>
                Registered {formatDate(reg.registeredAt)}
              </Text>
            </div>
          </ListItem>
        ))}
      </List>
    </div>
  );
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
```

---

## Frontend API Integration

### API Service Methods

**Create helper functions for API calls**:

```javascript
// src/client/src/services/preRegistrationService.js

export async function preRegisterForMeeting(meetingId, accessToken) {
  const response = await fetch(`/api/meetingrequests/${meetingId}/preregister`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('You are already registered for this meeting.');
    }
    if (response.status === 404) {
      throw new Error('Meeting not found.');
    }
    throw new Error('Failed to register. Please try again.');
  }
  
  return await response.json();
}

export async function cancelPreRegistration(meetingId, accessToken) {
  const response = await fetch(`/api/meetingrequests/${meetingId}/preregister`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Registration not found.');
    }
    throw new Error('Failed to cancel registration. Please try again.');
  }
}

export async function getPreRegistrations(meetingId) {
  const response = await fetch(`/api/meetingrequests/${meetingId}/preregistrations`);
  
  if (!response.ok) {
    throw new Error('Failed to load registrations.');
  }
  
  return await response.json();
}
```

---

## Component Integration Flow

### Initial Load Flow

1. User navigates to Meeting Detail page
2. Component loads meeting data (includes `preRegistrationCount`)
3. If `status === "Announced"`:
   - Render pre-register button
   - Check if current user is registered (optional: call API to verify)
   - Load registrations list
4. Display appropriate button state

### Pre-register Flow

1. User clicks "Pre-register" button
2. **Optimistic update**: 
   - Button changes to "Registered"
   - Count increments
3. API call: POST /api/meetingrequests/{id}/preregister
4. **Success**: No additional UI change (already updated)
5. **Error**: 
   - Rollback button to "Pre-register"
   - Decrement count
   - Show error message
6. Refresh registrations list (reload data)

### Cancel Registration Flow

1. User clicks "Cancel Registration" button
2. **Optimistic update**: 
   - Button changes to "Pre-register"
   - Count decrements
3. API call: DELETE /api/meetingrequests/{id}/preregister
4. **Success**: No additional UI change
5. **Error**: 
   - Rollback button to "Registered"
   - Increment count
   - Show error message
6. Refresh registrations list

---

## Authentication Integration

### Extract User Identity from MSAL

```javascript
import { useMsal } from '@azure/msal-react';

function MeetingRequestDetail({ meetingId }) {
  const { instance, accounts } = useMsal();
  
  // Extract user identity
  const userId = accounts[0]?.localAccountId;
  const userName = accounts[0]?.name;
  const userEmail = accounts[0]?.username;
  const isAuthenticated = accounts.length > 0;
  
  // Get access token for API calls
  const getAccessToken = async () => {
    const request = {
      scopes: ["api://<your-api-client-id>/access_as_user"],
      account: accounts[0]
    };
    const response = await instance.acquireTokenSilent(request);
    return response.accessToken;
  };
  
  // ... component logic
}
```

---

## Error Handling

### Backend Error Response Format

All errors follow consistent format:

```json
{
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### Frontend Error Display

**Option 1: Inline MessageBar** (recommended)
```jsx
{error && (
  <MessageBar intent="error" onDismiss={() => setError(null)}>
    {error}
  </MessageBar>
)}
```

**Option 2: Toast Notification**
```javascript
import { useToastController } from '@fluentui/react-components';

const { dispatchToast } = useToastController();

// On error:
dispatchToast({
  title: 'Registration Failed',
  body: error.message,
  intent: 'error',
  timeout: 5000
});
```

---

## Accessibility Requirements

### Button Accessibility

```jsx
<Button 
  appearance="primary"
  onClick={handlePreRegister}
  disabled={!isAuthenticated || isRegistering}
  aria-label="Pre-register for this meeting"
  aria-pressed={isRegistered}
>
  {isRegistered ? 'Registered' : 'Pre-register'}
</Button>
```

**Requirements**:
- ✅ Keyboard accessible (Tab, Enter/Space)
- ✅ ARIA label describes action
- ✅ ARIA pressed state for toggle-like behavior
- ✅ Disabled state prevents accidental clicks
- ✅ Focus visible indicator

### Badge Accessibility

```jsx
<Badge 
  appearance="filled" 
  color="informative"
  aria-label={`${count} users pre-registered for this meeting`}
>
  {count} pre-registered
</Badge>
```

**Requirements**:
- ✅ ARIA label provides context for screen readers
- ✅ Sufficient color contrast (WCAG AA)
- ✅ Information available without color alone

### List Accessibility

```jsx
<List aria-label="Pre-registered attendees">
  {registrations.map(reg => (
    <ListItem key={reg.id} aria-label={`${reg.userName} registered on ${formatDate(reg.registeredAt)}`}>
      {/* ... */}
    </ListItem>
  ))}
</List>
```

**Requirements**:
- ✅ Semantic HTML (`<ul>`, `<li>`)
- ✅ ARIA labels for list and items
- ✅ Keyboard navigation supported
- ✅ Screen reader announces list size

---

## Testing Contracts

### Backend Unit Tests

**Test: PreRegister creates registration**
```csharp
[Fact]
public async Task PreRegister_CreatesRegistration_ReturnsCreated()
{
    // Arrange
    var meetingId = 1;
    var userId = "user123";
    
    // Act
    var response = await _controller.PreRegister(meetingId);
    
    // Assert
    var result = Assert.IsType<CreatedResult>(response);
    var registration = Assert.IsType<PreRegistrationDto>(result.Value);
    Assert.Equal(meetingId, registration.MeetingRequestId);
    Assert.Equal(userId, registration.UserId);
}
```

**Test: PreRegister returns 409 for duplicate**
```csharp
[Fact]
public async Task PreRegister_WhenAlreadyRegistered_ReturnsConflict()
{
    // Arrange
    var meetingId = 1;
    // Existing registration created in setup
    
    // Act
    var response = await _controller.PreRegister(meetingId);
    
    // Assert
    Assert.IsType<ConflictObjectResult>(response);
}
```

### Frontend Component Tests

**Test: Button renders only for Announced status**
```javascript
test('pre-register button only visible for Announced meetings', () => {
  const meeting = { id: 1, status: 'Announced', preRegistrationCount: 0 };
  render(<MeetingRequestDetail meeting={meeting} />);
  expect(screen.getByRole('button', { name: /pre-register/i })).toBeInTheDocument();
  
  const draftMeeting = { id: 2, status: 'Draft', preRegistrationCount: 0 };
  render(<MeetingRequestDetail meeting={draftMeeting} />);
  expect(screen.queryByRole('button', { name: /pre-register/i })).not.toBeInTheDocument();
});
```

**Test: Button changes to Registered after successful registration**
```javascript
test('button changes to Registered state after registration', async () => {
  const meeting = { id: 1, status: 'Announced', preRegistrationCount: 0 };
  render(<MeetingRequestDetail meeting={meeting} />);
  
  const button = screen.getByRole('button', { name: /pre-register/i });
  await userEvent.click(button);
  
  // Optimistic update
  expect(screen.getByText(/registered/i)).toBeInTheDocument();
});
```

### E2E Tests

**Test: Complete pre-registration flow**
```javascript
test('user can pre-register and cancel registration', async ({ page }) => {
  // Login
  await page.goto('/login');
  await loginAsUser(page);
  
  // Navigate to announced meeting
  await page.goto('/meetings');
  await page.click('text=Announced Meeting');
  
  // Pre-register
  await page.click('button:has-text("Pre-register")');
  await expect(page.locator('button:has-text("Registered")')).toBeVisible();
  await expect(page.locator('text=/1 pre-registered/')).toBeVisible();
  
  // Cancel registration
  await page.click('button:has-text("Cancel Registration")');
  await expect(page.locator('button:has-text("Pre-register")')).toBeVisible();
  await expect(page.locator('text=/0 pre-registered/')).toBeVisible();
});
```

---

## Contract Summary

✅ **API Endpoints Defined**: 3 endpoints (POST, DELETE, GET) with full request/response specs  
✅ **DTO Contracts**: PreRegistrationDto, PreRegistrationListItemDto, MeetingRequestDto extension  
✅ **Component Contracts**: MeetingRequestCard, MeetingRequestDetail, PreRegistrationList  
✅ **State Management**: Optimistic UI with rollback on error  
✅ **Authentication**: MSAL integration for user identity extraction  
✅ **Error Handling**: Consistent error format and display strategies  
✅ **Accessibility**: ARIA labels, keyboard navigation, screen reader support  
✅ **Testing Contracts**: Unit, integration, and E2E test patterns defined

**Next Step**: Generate step-by-step implementation guide in `quickstart.md`
