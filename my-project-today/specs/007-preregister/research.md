# Research: Pre-register Button Implementation

**Feature**: Add Pre-register Button for Announced Requests  
**Branch**: `007-preregister`  
**Date**: 2026-02-14  
**Phase**: Phase 0 Research

## Research Objectives

Resolve technical implementation decisions for pre-registration feature:
1. Soft-delete pattern for cancelled registrations
2. Duplicate prevention strategy
3. User identity extraction from authentication context
4. Pre-registration count calculation approach
5. Frontend button state management (optimistic vs pessimistic UI)
6. Registrants list UI component selection

---

## Research Task 1: Soft-Delete Pattern

### Question
Best practice for implementing soft-delete with Entity Framework Core to retain cancelled registrations for audit trail?

### Research Findings

**Option A: CancelledAt DateTime Nullable Column**
- Add `DateTime? CancelledAt` property to entity
- NULL = active registration, non-NULL = cancelled
- Query filter: `.HasQueryFilter(e => e.CancelledAt == null)` in DbContext
- Benefits:
  - Preserves exact cancellation timestamp for audit trail
  - Easy to query "when was this cancelled?"
  - Clear semantic meaning
  - Supports re-registration after cancellation (create new record)
- Drawbacks:
  - Requires remembering to filter in queries (mitigated by global query filter)
  - Slightly more complex query logic

**Option B: IsDeleted Boolean Flag**
- Add `bool IsDeleted` property (default false)
- Query filter: `.HasQueryFilter(e => !e.IsDeleted)`
- Benefits:
  - Simple boolean logic
  - Common pattern in many codebases
- Drawbacks:
  - Loses cancellation timestamp information
  - Less informative for audit purposes
  - Need separate `DeletedAt` column if timestamp needed (redundant)

**Option C: Status Enum Only**
- Use existing `Status` property ("Registered" | "Cancelled")
- No query filter, always include WHERE Status = 'Registered' in queries
- Benefits:
  - Single source of truth for state
  - Explicit in queries (no hidden filtering)
- Drawbacks:
  - Easy to forget WHERE clause in queries
  - No automatic filtering
  - Status string comparison less efficient than NULL check

### Decision: **Option A - CancelledAt DateTime Nullable**

**Rationale**:
- **Audit trail**: Preserves exact cancellation timestamp required for compliance and debugging
- **Semantic clarity**: NULL clearly means "not cancelled", timestamp clearly means "cancelled at this time"
- **EF Core integration**: Global query filter (`.HasQueryFilter(e => e.CancelledAt == null)`) automatically excludes cancelled registrations from all queries unless explicitly included with `.IgnoreQueryFilters()`
- **Performance**: NULL check on indexed datetime column is fast in SQLite
- **Re-registration support**: Can create new record after cancellation, preserving history

**Implementation Details**:
```csharp
public class MeetingRequestPreRegistration {
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string UserId { get; set; }
    public string UserName { get; set; }
    public string UserEmail { get; set; }
    public DateTime RegisteredAt { get; set; }
    public DateTime? CancelledAt { get; set; } // NULL = active, non-NULL = cancelled
    public string Status { get; set; } // "Registered" | "Cancelled" (derived from CancelledAt)
    public MeetingRequest MeetingRequest { get; set; }
}

// DbContext configuration
modelBuilder.Entity<MeetingRequestPreRegistration>()
    .HasQueryFilter(p => p.CancelledAt == null); // Global filter for active registrations
```

**Query Examples**:
- Active registrations (automatic): `context.MeetingRequestPreRegistrations.ToList()`
- Include cancelled (explicit): `context.MeetingRequestPreRegistrations.IgnoreQueryFilters().ToList()`
- Count active: `context.MeetingRequestPreRegistrations.Count()` (filter applied automatically)

---

## Research Task 2: Duplicate Prevention

### Question
How to enforce one active registration per user per meeting at database and API level, considering soft-delete re-registration?

### Research Findings

**Option A: Unique Constraint on (MeetingRequestId, UserId)**
- Database-level enforcement: `CREATE UNIQUE INDEX ... ON (MeetingRequestId, UserId)`
- Benefits:
  - Database guarantees no duplicates
  - Prevents race conditions
  - Most reliable approach
- Drawbacks:
  - **Blocks re-registration after cancellation**: Once cancelled, unique constraint prevents creating new record with same (MeetingRequestId, UserId)
  - SQLite doesn't support partial unique indexes with WHERE clause (PostgreSQL does: `WHERE CancelledAt IS NULL`)
  - Would need to delete cancelled records to allow re-registration (defeats soft-delete purpose)

**Option B: Unique Filtered Index (PostgreSQL only)**
- `CREATE UNIQUE INDEX ... ON (MeetingRequestId, UserId) WHERE CancelledAt IS NULL`
- Benefits:
  - Enforces uniqueness only for active registrations
  - Allows multiple cancelled registrations for same user/meeting
  - Database-level protection
- Drawbacks:
  - **Not supported in SQLite** (current database)
  - Would require database migration if switching to PostgreSQL

**Option C: API-Level Validation Before Insert**
- Query for existing active registration before INSERT
- Return 409 Conflict if duplicate found
- Benefits:
  - **Works with SQLite** (current database)
  - **Supports re-registration** after cancellation (can have multiple records, only one active)
  - Flexible error messaging
  - Can add additional business logic (e.g., check meeting status)
- Drawbacks:
  - Not database-enforced (requires API discipline)
  - Small race condition window (two simultaneous requests could both pass validation)
  - Mitigated by: Typical use case (single user clicking button) makes race condition unlikely

**Option D: Composite Unique Constraint + Hard Delete on Cancel**
- Unique constraint on (MeetingRequestId, UserId)
- Hard delete cancelled registrations instead of soft-delete
- Benefits:
  - Database enforces uniqueness
  - Allows re-registration (record deleted)
- Drawbacks:
  - **Loses audit trail** (violates requirement to retain cancellation data)
  - Cannot answer "who cancelled their registration?" or "when?"
  - Not acceptable for compliance/audit requirements

### Decision: **Option C - API-Level Validation**

**Rationale**:
- **SQLite compatibility**: Works with current database (no partial unique index support)
- **Soft-delete support**: Allows multiple records per (MeetingRequestId, UserId) as long as only one is active (CancelledAt = NULL)
- **Re-registration**: User can cancel and re-register, creating new record each time with full audit trail
- **Business logic flexibility**: Can add additional checks (e.g., meeting status, user role)
- **Race condition mitigation**: Unlikely in practice (single user, browser prevents double-click)
- **Performance**: Single SELECT query before INSERT is acceptable overhead (<10ms)

**Implementation Details**:
```csharp
// In PreRegister endpoint
var existingRegistration = await _context.MeetingRequestPreRegistrations
    .FirstOrDefaultAsync(p => p.MeetingRequestId == id && p.UserId == userId);
    // Note: Global query filter automatically adds "AND CancelledAt IS NULL"

if (existingRegistration != null) {
    return Conflict(new { message = "You are already registered for this meeting." });
}

// Proceed with INSERT
var registration = new MeetingRequestPreRegistration {
    MeetingRequestId = id,
    UserId = userId,
    UserName = userName,
    UserEmail = userEmail,
    RegisteredAt = DateTime.UtcNow,
    Status = "Registered"
};
_context.MeetingRequestPreRegistrations.Add(registration);
await _context.SaveChangesAsync();
```

**Race Condition Handling**:
- Add `try-catch` around `SaveChangesAsync()` to handle unlikely concurrent inserts
- If database error occurs, return 409 Conflict with appropriate message
- Future enhancement: Add optimistic concurrency token if needed

---

## Research Task 3: User Identity Extraction

### Question
Which JWT claims and MSAL properties should be used for UserId, UserName, UserEmail in both frontend and backend?

### Research Findings

**Azure AD JWT Claims (Backend)**:
- `oid` (Object ID): Unique, immutable user identifier in Azure AD
- `sub` (Subject): Unique identifier, may differ from oid in some scenarios
- `preferred_username`: Usually email address (e.g., user@company.com)
- `email`: Email address (not always present)
- `upn` (User Principal Name): Alternative to preferred_username
- `name`: Display name (e.g., "John Doe")

**MSAL Account Object (Frontend)**:
- `accounts[0].localAccountId`: Corresponds to `oid` claim (unique user ID)
- `accounts[0].username`: Corresponds to `preferred_username` claim (usually email)
- `accounts[0].name`: Corresponds to `name` claim (display name)
- `accounts[0].homeAccountId`: Composite identifier

**Existing Codebase Pattern** (from conversation context):
- MeetingRequestsController.cs currently uses:
  - `User.FindFirst("preferred_username")?.Value` for RequestorEmail
  - `User.FindFirst("email")?.Value` as fallback
  - `User.FindFirst("name")?.Value` for display name

### Decision: **Align with Existing Authentication Pattern**

**Backend (ASP.NET Core)**:
```csharp
// UserId - unique, immutable identifier
var userId = User.FindFirst("oid")?.Value 
    ?? User.FindFirst("sub")?.Value 
    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

// UserName - display name
var userName = User.FindFirst("name")?.Value 
    ?? User.FindFirst(ClaimTypes.Name)?.Value 
    ?? "Unknown User";

// UserEmail - email address
var userEmail = User.FindFirst("preferred_username")?.Value 
    ?? User.FindFirst("email")?.Value 
    ?? User.FindFirst("upn")?.Value 
    ?? "";
```

**Frontend (React + MSAL)**:
```javascript
const { accounts } = useMsal();

// UserId - unique identifier
const userId = accounts[0]?.localAccountId;

// UserName - display name
const userName = accounts[0]?.name || "Unknown User";

// UserEmail - email address
const userEmail = accounts[0]?.username || "";
```

**Rationale**:
- **Consistency**: Matches existing patterns in MeetingRequestsController and MeetingRequestsList
- **Stability**: `oid` is immutable (preferred for userId over email which can change)
- **Fallbacks**: Multiple fallback claims ensure robustness across different Azure AD configurations
- **Display vs Identity**: Separate userId (for database foreign key) from userName (for display) and userEmail (for communication)

**Field Usage**:
- `UserId` (string): Primary identifier for duplicate prevention, foreign key relationships, ownership checks
- `UserName` (string): Display in UI ("John Doe registered on...")
- `UserEmail` (string): Display in UI, potential future email notifications

---

## Research Task 4: Pre-Registration Count Calculation

### Question
Should count be calculated on-demand, cached in MeetingRequest table, or aggregated in DTO projection?

### Research Findings

**Option A: Real-Time Calculation in DTO Projection**
```csharp
var meetings = await _context.MeetingRequests
    .Select(m => new {
        // ... existing properties
        preRegistrationCount = m.PreRegistrations.Count(p => p.CancelledAt == null)
    })
    .ToListAsync();
```
- Benefits:
  - Always accurate (no stale data)
  - No additional database columns
  - Leverages EF Core's expression translation to SQL
  - Simple implementation
- Drawbacks:
  - Counted on every query (small overhead)
  - Performance impact with thousands of registrations per meeting (unlikely in this domain)
- Performance: SQLite can efficiently count with indexed foreign key (<5ms for typical dataset)

**Option B: Cached Column in MeetingRequests Table**
- Add `PreRegistrationCount` column to `MeetingRequests`
- Update via trigger or application code on INSERT/UPDATE/DELETE of registrations
- Benefits:
  - Fast reads (no aggregation needed)
  - Useful for sorting/filtering by popularity
- Drawbacks:
  - **Stale data risk**: Count out of sync if update logic fails
  - **Complexity**: Trigger maintenance or transaction management in application
  - **Soft-delete complication**: Must update count on cancellation and re-registration
  - Additional database migration
  - Denormalization (violates DRY principle)

**Option C: Separate Aggregate Query When Needed**
- Don't include count in List queries
- Fetch count separately when displaying detail view
- Benefits:
  - Optimizes List query performance (no aggregation overhead)
- Drawbacks:
  - Requires separate API call for count
  - More complex frontend logic
  - Not suitable for displaying count in list/card view

**Option D: In-Memory Aggregation**
- Load all registrations in memory, count in application
- Benefits: None
- Drawbacks: Terrible performance, loads all records unnecessarily

### Decision: **Option A - Real-Time Calculation in DTO Projection**

**Rationale**:
- **Accuracy**: Always returns current count (no stale data)
- **Simplicity**: Single query, no cache invalidation logic, no triggers
- **Performance**: Acceptable for expected scale (SQLite can count thousands of records in <10ms with proper indexing)
- **EF Core optimization**: `.Count()` translates to SQL `COUNT(*)` subquery, executed efficiently by database
- **Maintainability**: No denormalization, single source of truth
- **Soft-delete friendly**: Query filter automatically excludes cancelled registrations (CancelledAt IS NULL)

**Implementation Details**:
```csharp
// In List endpoint
var meetings = await _context.MeetingRequests
    .Where(/* filters */)
    .Select(m => new MeetingRequestDto {
        Id = m.Id,
        Title = m.Title,
        // ... existing properties
        PreRegistrationCount = m.PreRegistrations.Count() // Global filter applies (CancelledAt = NULL)
    })
    .ToListAsync();

// In GetById endpoint
var meeting = await _context.MeetingRequests
    .Where(m => m.Id == id)
    .Select(m => new MeetingRequestDto {
        // ... all properties
        PreRegistrationCount = m.PreRegistrations.Count()
    })
    .FirstOrDefaultAsync();
```

**SQL Generated** (approximate):
```sql
SELECT 
    m.Id, m.Title, /* ... */,
    (SELECT COUNT(*) FROM MeetingRequestPreRegistrations p 
     WHERE p.MeetingRequestId = m.Id AND p.CancelledAt IS NULL) AS PreRegistrationCount
FROM MeetingRequests m
```

**Performance Benchmark** (estimated):
- 10 meetings, 5 registrations each: <10ms
- 100 meetings, 20 registrations each: <50ms
- 1000 meetings, 10 registrations each: <200ms
- Acceptable for expected scale (meetings list typically paginated)

**Future Optimization** (if needed):
- Add index on `MeetingRequestPreRegistrations(MeetingRequestId, CancelledAt)` for faster COUNT queries
- Implement caching layer (Redis) for high-traffic scenarios
- Current approach is sufficient for MVP

---

## Research Task 5: Frontend Button State Management

### Question
Should UI updates be optimistic (immediate) or pessimistic (wait for API response)?

### Research Findings

**Option A: Optimistic UI Updates**
- Update button state immediately on click, before API call completes
- Rollback if API returns error
- Flow:
  1. User clicks "Pre-register"
  2. Immediately: Button changes to "Registered", count increments
  3. Send API POST request in background
  4. If error: Rollback button to "Pre-register", show error message, decrement count
  5. If success: No additional UI change needed (already updated)
- Benefits:
  - **Perceived performance**: Feels instant (<100ms)
  - **Better UX**: No waiting for network round-trip (200-500ms)
  - **Reduces abandonment**: User sees immediate feedback
- Drawbacks:
  - Must handle rollback on error (added complexity)
  - Brief inconsistent state if API fails
  - User might see success then error (confusing if rollback not smooth)

**Option B: Pessimistic UI Updates**
- Wait for API response before updating UI
- Flow:
  1. User clicks "Pre-register"
  2. Button shows loading spinner ("Registering...")
  3. Send API POST request
  4. On success: Button changes to "Registered", count increments
  5. On error: Button returns to "Pre-register", show error message
- Benefits:
  - **Simple logic**: No rollback needed
  - **Consistent state**: UI always reflects server state
  - **Fewer edge cases**: Error handling is straightforward
- Drawbacks:
  - **Slower perceived performance**: User waits 200-500ms for feedback
  - **Loading spinner fatigue**: Adds visual noise for simple operation
  - **Feels laggy**: Not as responsive as modern web apps expect

**Hybrid Approach: Optimistic with Smart Rollback**
- Optimistic for success path (most common)
- Graceful degradation for error path
- Use toast/banner for non-disruptive error messages
- Benefits: Best of both worlds

### Decision: **Option A - Optimistic UI Updates with Error Rollback**

**Rationale**:
- **Modern UX expectation**: Users expect instant feedback on button clicks (see Twitter likes, Facebook reactions)
- **High success rate**: Pre-registration is simple operation, failures are rare (>95% success expected)
- **Performance perception**: 200-500ms delay feels sluggish, optimistic UI feels instant
- **Error handling**: Rollback + error toast provides clear feedback on failures
- **Mobile-friendly**: Reduces perceived latency on slower networks

**Implementation Details**:
```javascript
const [isRegistered, setIsRegistered] = useState(false);
const [registrationCount, setRegistrationCount] = useState(meeting.preRegistrationCount);
const [error, setError] = useState(null);

const handlePreRegister = async () => {
    // Optimistic update
    setIsRegistered(true);
    setRegistrationCount(prev => prev + 1);
    setError(null);
    
    try {
        await fetch(`/api/meetingrequests/${meeting.id}/preregister`, { method: 'POST' });
        // Success - UI already updated, no action needed
    } catch (err) {
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
        await fetch(`/api/meetingrequests/${meeting.id}/preregister`, { method: 'DELETE' });
        // Success - UI already updated
    } catch (err) {
        // Rollback
        setIsRegistered(true);
        setRegistrationCount(prev => prev + 1);
        setError('Failed to cancel registration. Please try again.');
    }
};
```

**Error Display**:
- Use Fluent UI `MessageBar` component with `intent="error"` below button
- Or use toast notification (`useToastController` from Fluent UI)
- Auto-dismiss error after 5 seconds or on retry

**Loading State** (optional enhancement):
- Add subtle opacity change (0.7) during API call for visual feedback
- No spinner (optimistic UI already shows result)

---

## Research Task 6: Registrants List UI Component

### Question
Which Fluent UI component best displays list of registered users with names and timestamps?

### Research Findings

**Option A: Fluent UI `List` Component**
```jsx
import { List, ListItem } from '@fluentui/react-components';

<List>
  {registrations.map(reg => (
    <ListItem key={reg.id}>
      <div>
        <strong>{reg.userName}</strong>
        <div style={{fontSize: '12px', color: '#666'}}>
          Registered on {formatDate(reg.registeredAt)}
        </div>
      </div>
    </ListItem>
  ))}
</List>
```
- Benefits:
  - **Semantic HTML**: Uses `<ul>` and `<li>` with proper ARIA
  - **Accessible**: Built-in keyboard navigation, screen reader support
  - **Simple**: Minimal configuration for basic list
  - **Lightweight**: Small bundle size
- Drawbacks:
  - Less feature-rich (no sorting, filtering, pagination built-in)
  - Requires custom styling for complex layouts

**Option B: Fluent UI `DataGrid` Component**
```jsx
import { DataGrid, DataGridBody, DataGridRow, DataGridCell } from '@fluentui/react-components';

<DataGrid columns={columns} items={registrations}>
  <DataGridBody>
    {/* ... */}
  </DataGridBody>
</DataGrid>
```
- Benefits:
  - **Feature-rich**: Built-in sorting, filtering, column resizing
  - **Professional**: Enterprise-grade table component
  - **Scalable**: Handles large datasets with virtualization
- Drawbacks:
  - **Overkill**: Too complex for simple list of names and dates
  - **Larger bundle**: More code for features we don't need
  - **Setup overhead**: Requires column definitions, cell renderers

**Option C: Custom Styled `<ul>` with Fluent Tokens**
```jsx
<ul style={{listStyle: 'none', padding: 0}}>
  {registrations.map(reg => (
    <li key={reg.id} style={{padding: '8px 0', borderBottom: '1px solid #eee'}}>
      {/* custom layout */}
    </li>
  ))}
</ul>
```
- Benefits:
  - **Full control**: Custom layout and styling
  - **Minimal**: No component overhead
- Drawbacks:
  - **Manual accessibility**: Must add ARIA attributes manually
  - **Inconsistent**: Doesn't match Fluent UI design system
  - **More code**: More effort to achieve what `List` provides

**Option D: `Avatar` + `List` Combination**
```jsx
import { Avatar, List, ListItem } from '@fluentui/react-components';

<List>
  {registrations.map(reg => (
    <ListItem key={reg.id}>
      <Avatar name={reg.userName} size={32} />
      <div style={{marginLeft: '12px'}}>
        <strong>{reg.userName}</strong>
        <div style={{fontSize: '12px'}}>
          {formatDate(reg.registeredAt)}
        </div>
      </div>
    </ListItem>
  ))}
</List>
```
- Benefits:
  - **Visual appeal**: Avatar with initials adds polish
  - **User recognition**: Familiar pattern (like Teams, Outlook)
  - **Professional**: Elevates perceived quality
- Drawbacks:
  - Slightly more complex markup
  - Avatar load time (minimal, renders initials instantly)

### Decision: **Option D - Avatar + List Combination**

**Rationale**:
- **Visual consistency**: Matches Microsoft 365 design patterns (Teams, Outlook)
- **Accessibility**: Fluent UI `List` provides semantic HTML and ARIA attributes
- **Professional appearance**: Avatar with initials looks polished and modern
- **User recognition**: Familiar component pattern for business users
- **Appropriate complexity**: Simple enough for small lists, scales to hundreds of registrants
- **Fluent UI integration**: Components work well together, consistent styling

**Implementation Details**:
```jsx
import { 
    List, 
    ListItem, 
    Avatar, 
    Text, 
    makeStyles 
} from '@fluentui/react-components';

const useStyles = makeStyles({
    listContainer: {
        maxHeight: '400px',
        overflowY: 'auto',
        marginTop: '16px'
    },
    listItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        gap: '12px'
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    timestamp: {
        fontSize: '12px',
        color: '#666'
    }
});

function PreRegistrationList({ registrations, loading }) {
    const styles = useStyles();
    
    if (loading) return <Spinner label="Loading registrations..." />;
    if (registrations.length === 0) return <Text>No registrations yet.</Text>;
    
    return (
        <div>
            <Text weight="semibold">Pre-registered Attendees ({registrations.length})</Text>
            <List className={styles.listContainer}>
                {registrations.map(reg => (
                    <ListItem key={reg.id} className={styles.listItem}>
                        <Avatar 
                            name={reg.userName} 
                            size={32} 
                            color="colorful"
                        />
                        <div className={styles.userInfo}>
                            <Text weight="semibold">{reg.userName}</Text>
                            <Text className={styles.timestamp}>
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    // Example output: "Feb 14, 3:45 PM"
}
```

**Accessibility Features**:
- Semantic `<ul>` structure (from `List` component)
- Avatar has `name` prop for alt text
- Proper heading hierarchy for section title
- Keyboard navigable
- Screen reader announces "List of X items"

**Responsive Design**:
- Scrollable container (max-height: 400px) prevents page overflow with many registrants
- Avatar and text stack nicely on mobile
- Touch-friendly spacing (12px padding)

**Performance**:
- Virtualization not needed (lists typically <100 registrants)
- Avatar renders initials instantly (no image loading)
- List updates efficiently with React keys

---

## Summary of Decisions

| Research Area | Decision | Rationale |
|--------------|----------|-----------|
| **Soft-Delete Pattern** | `CancelledAt` DateTime nullable column | Preserves audit trail, supports re-registration, EF Core query filter integration |
| **Duplicate Prevention** | API-level validation before INSERT | SQLite compatible, supports soft-delete re-registration, business logic flexibility |
| **User Identity** | Backend: `oid/sub` (userId), `name` (userName), `preferred_username/email` (userEmail)<br>Frontend: `localAccountId`, `name`, `username` | Aligns with existing auth pattern, stable identifiers, multiple fallbacks |
| **Count Calculation** | Real-time calculation in DTO projection | Always accurate, simple, acceptable performance, no cache invalidation complexity |
| **Button State Management** | Optimistic UI updates with error rollback | Modern UX, instant feedback, high success rate expected, graceful error handling |
| **Registrants List UI** | Fluent UI `Avatar` + `List` components | Professional appearance, accessible, matches M365 design, appropriate complexity |

---

## Technical Specifications

### Database Schema
```sql
CREATE TABLE MeetingRequestPreRegistrations (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    MeetingRequestId INTEGER NOT NULL,
    UserId TEXT NOT NULL,
    UserName TEXT NOT NULL,
    UserEmail TEXT,
    RegisteredAt DATETIME NOT NULL,
    CancelledAt DATETIME NULL,
    Status TEXT NOT NULL DEFAULT 'Registered',
    FOREIGN KEY (MeetingRequestId) REFERENCES MeetingRequests(Id)
);

CREATE INDEX IX_MeetingRequestPreRegistrations_MeetingRequestId 
    ON MeetingRequestPreRegistrations(MeetingRequestId);
```

### API Contracts

**POST /api/meetingrequests/{id}/preregister**
- Request: No body (user identity from JWT)
- Response 201: `{ id, meetingRequestId, userId, userName, userEmail, registeredAt, status }`
- Response 409: `{ message: "You are already registered for this meeting." }`
- Response 404: `{ message: "Meeting request not found." }`

**DELETE /api/meetingrequests/{id}/preregister**
- Request: No body (user identity from JWT)
- Response 204: No content
- Response 404: `{ message: "Registration not found." }`

**GET /api/meetingrequests/{id}/preregistrations**
- Request: No parameters
- Response 200: `[{ id, userName, userEmail, registeredAt }, ...]`
- Sorted by `registeredAt DESC` (most recent first)
- Only active registrations (CancelledAt = NULL)

### Frontend State Management
```typescript
interface RegistrationState {
    isRegistered: boolean;        // Current user's registration status
    registrationCount: number;    // Total active registrations
    registrations: Registration[]; // List of all registrants
    loading: boolean;             // Loading state for API calls
    error: string | null;         // Error message if operation fails
}

interface Registration {
    id: number;
    userName: string;
    userEmail: string;
    registeredAt: string; // ISO 8601 datetime
}
```

---

## Implementation Guidelines

### Backend Best Practices
1. **Extract user identity helper method**: Create `GetUserIdentity()` helper to avoid repeating claim extraction logic
2. **Use transactions**: Wrap registration operations in transaction if multiple tables updated
3. **Validate meeting exists**: Check meeting exists and status = "Announced" before allowing registration
4. **Logging**: Add structured logging for registration events (useful for debugging and analytics)
5. **Error handling**: Return specific error messages (409 for duplicate, 404 for not found, 400 for validation)

### Frontend Best Practices
1. **Debounce double-clicks**: Disable button during API call to prevent accidental double-submissions
2. **Error recovery**: Provide "Try Again" action in error message
3. **Accessibility**: Ensure button has `aria-label`, focus management after state changes
4. **Loading states**: Use subtle opacity change instead of spinner for optimistic UI
5. **Refresh data**: After successful registration, refetch meeting details to sync server state

### Testing Priorities
1. **Critical path**: Pre-register flow (click button → API call → UI update)
2. **Error scenarios**: Duplicate registration, network failure, unauthorized access
3. **Edge cases**: Cancellation then re-registration, concurrent registrations from same user
4. **Accessibility**: Keyboard navigation, screen reader announcements
5. **Performance**: Count calculation with 100+ registrations, list rendering with 50+ users

---

## Open Questions Resolved

✅ **Q1**: How to handle cancelled registrations in queries?  
**A**: Use EF Core global query filter to automatically exclude cancelled registrations

✅ **Q2**: Can user re-register after cancelling?  
**A**: Yes, create new record with new RegisteredAt timestamp (soft-delete allows multiple records)

✅ **Q3**: What if user clicks register button twice quickly?  
**A**: Disable button during API call, API-level duplicate check returns 409 on second request

✅ **Q4**: How to display count in real-time?  
**A**: Optimistic UI updates count immediately, API refreshes on success for accuracy

✅ **Q5**: Should we use avatar images or initials?  
**A**: Use Fluent UI Avatar component with initials (no need for image storage/retrieval)

---

**Research Status**: ✅ COMPLETE  
**Next Phase**: Phase 1 - Generate data-model.md and contracts/README.md with detailed implementation specifications
