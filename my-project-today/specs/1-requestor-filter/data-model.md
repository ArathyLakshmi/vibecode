# Data Model: Requestor Filter Toggle

**Feature**: 1-requestor-filter | **Phase**: 1 - Design | **Date**: 2026-02-12

## Overview

This document defines the data structures, state models, and entity relationships for the requestor filter toggle feature.

---

## 1. Frontend State Model

### FilterState

**Description**: React component state for managing filter mode and user identity.

**Location**: `src/client/src/components/MeetingRequestsList.jsx`

**Type Definition** (TypeScript equivalent for documentation):
```typescript
type FilterMode = "my-requests" | "all-requests"

interface FilterState {
  filterMode: FilterMode      // Current filter selection
  userEmail: string          // Authenticated user's email address
}
```

**React Implementation**:
```javascript
const [filterMode, setFilterMode] = useState("my-requests")
const { accounts } = useMsal()
const userEmail = accounts?.[0]?.username || ''
```

**State Transitions**:
```
Initial: filterMode = "my-requests"
         userEmail = accounts[0].username

User clicks "All Requests" → filterMode = "all-requests"
User clicks "My Requests"  → filterMode = "my-requests"

Page refresh → Reset to "my-requests"
```

**Validation Rules**:
- `filterMode` must be either "my-requests" or "all-requests" (no other values allowed)
- `userEmail` should be non-empty string when user is authenticated
- If `userEmail` is empty, "my-requests" filter has no effect (shows all requests)

**Dependencies**:
- Requires MSAL authentication context (`useMsal` hook)
- Requires user to be authenticated to get `userEmail`

---

## 2. API Request Model

### GetMeetingRequests Query Parameters

**Endpoint**: `GET /api/meetingrequests`

**Query Parameters** (extended):
```typescript
interface MeetingRequestsQueryParams {
  // Existing parameters
  classification?: string    // Filter by classification
  category?: string          // Filter by category
  status?: string            // Filter by status
  startDate?: string         // Filter by meeting date >= startDate
  endDate?: string           // Filter by meeting date <= endDate
  page?: number              // Page number (default: 1)
  pageSize?: number          // Items per page (default: 20, max: 100)
  
  // NEW: Requestor filter parameter
  requestorEmail?: string    // Filter by requestor email (optional)
}
```

**Backend Model** (C# - ASP.NET Core):
```csharp
[HttpGet]
public async Task<IActionResult> List(
    [FromQuery] string? classification,
    [FromQuery] string? category,
    [FromQuery] string? status,
    [FromQuery] string? startDate,
    [FromQuery] string? endDate,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string? requestorEmail = null)  // NEW PARAMETER
{
    // Implementation...
}
```

**Parameter Rules**:
- `requestorEmail`: Optional, nullable string
- When provided: Filter results to requests where `RequestorEmail == requestorEmail`
- When null/empty: No filter applied (returns all requests matching other criteria)
- URL encoding: Email addresses must be URL-encoded (e.g., `user%40example.com`)

**Example Requests**:
```http
// Get all requests (no filter)
GET /api/meetingrequests?page=1&pageSize=20

// Get only user's requests
GET /api/meetingrequests?page=1&pageSize=20&requestorEmail=user%40example.com

// Get user's requests with additional filters
GET /api/meetingrequests?page=1&pageSize=20&requestorEmail=user%40example.com&status=pending
```

---

## 3. API Response Model

### PaginatedMeetingRequestsResponse

**Description**: Response format for paginated meeting requests list (unchanged from existing implementation).

**Type Definition**:
```typescript
interface MeetingRequest {
  id: number
  title: string
  meetingDate: string | null
  alternateDate: string | null
  category: string
  subcategory: string
  classification: string
  description: string
  comments: string
  status: string
  isDraft: boolean
  referenceNumber: string
  requestorName: string
  requestorEmail: string          // Used for filtering
  requestType: string
  country: string
  createdAt: string
  createdBy: string
  updatedAt: string | null
  updatedBy: string | null
}

interface PaginatedResponse {
  items: MeetingRequest[]         // Array of meeting requests
  page: number                    // Current page number
  pageSize: number                // Items per page
  totalCount: number              // Total items matching filters
  totalPages: number              // Total pages available
  hasMore: boolean                // True if more pages exist
}
```

**Backend Model** (C# - anonymous type):
```csharp
return Ok(new
{
    items = result,
    page,
    pageSize,
    totalCount,
    totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
    hasMore = page * pageSize < totalCount
});
```

**Response Behavior**:
- `totalCount` reflects filtered dataset (e.g., if user has 15 requests, totalCount=15 when filtering by requestor)
- `items.length` ≤ `pageSize` (last page may have fewer items)
- `hasMore = false` when on last page
- When `requestorEmail` filter is applied, `items` contains only matching requests

**Example Response** (filtered):
```json
{
  "items": [
    {
      "id": 42,
      "title": "Board Meeting Q4 2024",
      "requestorEmail": "user@example.com",
      "status": "Pending",
      // ... other fields
    },
    // ... more items
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 15,       // User has 15 total requests
  "totalPages": 1,
  "hasMore": false
}
```

---

## 4. Database Entity Model

### MeetingRequest Entity

**Description**: Existing database entity with fields used for filtering (no schema changes required).

**Relevant Fields** (C# - Entity Framework Core):
```csharp
public class MeetingRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    // ... other fields ...
    
    // Fields used for requestor filtering
    public string? RequestorName { get; set; }     // Display name or username
    public string? RequestorEmail { get; set; }    // Email address (primary match field)
    
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    // ... other fields ...
}
```

**Database Table**: `MeetingRequests` (SQLite)

**Relevant Columns**:
```sql
CREATE TABLE MeetingRequests (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    -- ... other columns ...
    RequestorName TEXT,
    RequestorEmail TEXT,     -- PRIMARY FIELD FOR FILTERING
    CreatedAt TEXT NOT NULL,
    CreatedBy TEXT,
    -- ... other columns ...
);
```

**Index Recommendation** (for performance):
```sql
-- Create non-clustered index on RequestorEmail for fast filtering
CREATE INDEX IX_MeetingRequests_RequestorEmail ON MeetingRequests (RequestorEmail);
```

**Query Pattern**:
```csharp
// Filter by requestor email
var query = _db.MeetingRequests
    .Where(x => x.RequestorEmail == requestorEmail)
    .OrderByDescending(x => x.CreatedAt);
```

**Data Population**:
- `RequestorEmail` is set when request is created
- Frontend sends user's email from MSAL authentication
- Backend extracts email from JWT token claims as fallback
- Field may be null for legacy requests (created before email tracking added)

---

## 5. Component Props Model

### MeetingRequestsList Component

**Description**: React component displaying list of meeting requests with filter toggle.

**Props** (unchanged - no new props required):
```typescript
interface MeetingRequestsListProps {
  searchTerm?: string         // Search query (existing)
  isSearching?: boolean       // Search loading state (existing)
  refreshTrigger?: number     // Force refresh counter (existing)
  onEdit?: (item) => void     // Edit handler (existing)
}
```

**Internal State** (extended with filter):
```typescript
interface MeetingRequestsListState {
  // Existing state
  items: MeetingRequest[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  count: number | null
  page: number
  hasMore: boolean
  selectedItem: number | null
  // ... other existing state ...
  
  // NEW: Filter state
  filterMode: "my-requests" | "all-requests"
}
```

**Component Signature**:
```javascript
export default function MeetingRequestsList({
  searchTerm = '',
  isSearching = false,
  refreshTrigger = 0,
  onEdit = null
}) {
  // State
  const [filterMode, setFilterMode] = useState("my-requests")  // NEW
  // ... existing state ...
  
  // Render
  return (
    <div>
      {/* NEW: Filter Toggle */}
      <Pivot
        selectedKey={filterMode}
        onLinkClick={(event, item) => setFilterMode(item.props.itemKey)}
      >
        <PivotItem headerText="My Requests" itemKey="my-requests" />
        <PivotItem headerText="All Requests" itemKey="all-requests" />
      </Pivot>
      
      {/* Existing: Meeting requests list */}
      {/* ... */}
    </div>
  )
}
```

---

## 6. User Identity Model

### MSAL Account

**Description**: User account object from Microsoft Authentication Library.

**Type** (from @azure/msal-browser):
```typescript
interface AccountInfo {
  homeAccountId: string        // Tenant-specific ID
  environment: string          // e.g., "login.microsoftonline.com"
  tenantId: string             // Azure AD tenant ID
  username: string             // Email address (PRIMARY FIELD FOR FILTER)
  localAccountId: string       // Object ID (GUID)
  name?: string                // Display name
  idTokenClaims?: object       // Additional claims from ID token
}
```

**Usage in Feature**:
```javascript
const { accounts } = useMsal()
const userEmail = accounts?.[0]?.username  // Extract email
```

**Field Selection Rationale**:
- `username`: Most reliable email field ✅
- `name`: Display name, not unique ❌
- `localAccountId`: GUID, not human-readable ❌
- `idTokenClaims.email`: Alternative, but `username` is more direct ✅

---

## 7. Filter Logic Model

### Filtering Algorithm

**Pseudocode**:
```text
FUNCTION getFilteredRequests(filterMode, userEmail, items):
  IF filterMode == "my-requests" AND userEmail IS NOT EMPTY:
    // Backend filtering (preferred)
    RETURN items WHERE item.requestorEmail == userEmail
    
    // OR frontend filtering (fallback if backend unavailable)
    RETURN items.filter(item => 
      item.requestorEmail == userEmail OR 
      item.requestorName == userEmail
    )
  ELSE:
    RETURN items  // No filter, show all
  END IF
END FUNCTION
```

**Backend Implementation** (LINQ):
```csharp
if (!string.IsNullOrWhiteSpace(requestorEmail))
{
    query = query.Where(x => 
        (!string.IsNullOrEmpty(x.RequestorEmail) && x.RequestorEmail == requestorEmail) ||
        (!string.IsNullOrEmpty(x.RequestorName) && x.RequestorName == requestorEmail)
    );
}
```

**Frontend Implementation** (API call):
```javascript
const requestorParam = filterMode === 'my-requests' && userEmail
  ? `&requestorEmail=${encodeURIComponent(userEmail)}`
  : ''

const url = `/api/meetingrequests?page=${page}&pageSize=20${requestorParam}`
```

**Edge Cases**:
| Case | Behavior |
|------|----------|
| `userEmail` is empty | "My Requests" mode shows all requests (no filter applied) |
| `requestorEmail` field is null in database | Request does not match filter (won't appear in "My Requests") |
| Multiple users with same email | All matching requests appear (unlikely but supported) |
| User clicks "My Requests" when already active | No API call, no state change (idempotent) |

---

## 8. Count Display Model

### Filtered Count Logic

**Components**:
- **Filtered count**: Number of items in current view after filtering
- **Total count**: Total items matching filter (may be > filtered count due to pagination)

**Display Format**:
```text
"Showing X of Y meeting request(s)"

Where:
  X = items.length (items currently displayed)
  Y = totalCount (total items matching filter)
```

**Examples**:
```text
// "My Requests" mode, user has 15 requests, showing first 10
"Showing 10 of 15 meeting request(s)"

// "All Requests" mode, 142 total requests, page 1
"Showing 20 of 142 meeting request(s)"

// "My Requests" mode, user

 has 3 requests
"Showing 3 of 3 meeting request(s)"
```

**Implementation**:
```javascript
const count = totalCount ?? items.length

<div>
  Showing {items.length} of {count} meeting request(s)
</div>
```

---

## Summary

**Key Data Models**:
1. ✅ **FilterState**: `{ filterMode, userEmail }` in React component state
2. ✅ **API Query**: Extended with optional `requestorEmail` parameter
3. ✅ **API Response**: Existing paginated format, `totalCount` reflects filtered data
4. ✅ **Database Entity**: No changes, uses existing `RequestorEmail` field
5. ✅ **Component Props**: No new props, filter state is internal
6. ✅ **User Identity**: MSAL `accounts[0].username` provides email
7. ✅ **Filter Logic**: Backend LINQ query, frontend API call construction
8. ✅ **Count Display**: Shows filtered count and total

**No Schema Changes Required**: Feature uses existing database fields.

**Next**: Create API and component contracts in `contracts/README.md`.
