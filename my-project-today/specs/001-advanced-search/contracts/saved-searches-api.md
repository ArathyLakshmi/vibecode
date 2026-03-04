# Saved Searches API Contract

**Endpoint**: `/api/saved-searches`  
**Purpose**: CRUD operations for user-defined saved searches  
**Authentication**: Required (Bearer Token)

---

## Overview

The Saved Searches API allows users to save frequently used filter combinations and retrieve them later. Each saved search belongs to a single user and includes a name, description, and filter criteria.

**Key Features**:
- Create, read, update, delete saved searches
- User-scoped (users only see their own searches)
- Apply saved search filters to meeting requests API
- Detect conflicts (duplicate names per user)

---

## Endpoints

### 1. Create Saved Search

Create a new saved search for the authenticated user.

#### Request

**HTTP Method**: `POST`

**Endpoint**: `/api/saved-searches`

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Body Schema**:
```json
{
  "name": "Q1 Technical Reviews",
  "description": "Pending technical meeting requests for Q1 2026",
  "filterCriteria": {
    "categories": ["Technical"],
    "statuses": ["Pending"],
    "classifications": [],
    "requestors": [],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "createdAfter": null,
    "createdBefore": null,
    "referenceNumber": null,
    "query": null
  }
}
```

**Field Validation**:
| Field | Type | Required | Max Length | Constraints |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 100 | Unique per user, not blank |
| `description` | string | No | 500 | Optional descriptive text |
| `filterCriteria` | object | Yes | - | Valid filter criteria object |

**FilterCriteria Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `categories` | string[] | No | Array of category names |
| `statuses` | string[] | No | Array of status values |
| `classifications` | string[] | No | Array of classification values |
| `requestors` | string[] | No | Array of requestor names |
| `startDate` | date | No | Meeting date range start (YYYY-MM-DD) |
| `endDate` | date | No | Meeting date range end (YYYY-MM-DD) |
| `createdAfter` | datetime | No | Created timestamp range start (ISO 8601) |
| `createdBefore` | datetime | No | Created timestamp range end (ISO 8601) |
| `referenceNumber` | string | No | Exact reference number |
| `query` | string | No | Boolean text search query |

**Validation Rules**:
- At least one filter criterion must be specified (empty filters not allowed)
- Date ranges validated: `startDate <= endDate`, `createdAfter <= createdBefore`
- Array fields validated against allowed values (same as search API)
- `query` syntax validated (same as search API Boolean syntax)

#### Response

**Success Status**: `201 Created`

**Headers**:
```http
Location: /api/saved-searches/42
```

**Body**:
```json
{
  "id": 42,
  "userId": "user123@example.com",
  "name": "Q1 Technical Reviews",
  "description": "Pending technical meeting requests for Q1 2026",
  "filterCriteria": {
    "categories": ["Technical"],
    "statuses": ["Pending"],
    "classifications": [],
    "requestors": [],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "createdAfter": null,
    "createdBefore": null,
    "referenceNumber": null,
    "query": null
  },
  "createdAt": "2026-03-03T14:30:00Z",
  "updatedAt": "2026-03-03T14:30:00Z"
}
```

#### Error Responses

**409 Conflict** (Duplicate Name):
```json
{
  "error": "Conflict",
  "message": "A saved search with the name 'Q1 Technical Reviews' already exists"
}
```

**400 Bad Request** (Validation Error):
```json
{
  "error": "ValidationError",
  "message": "Invalid saved search data",
  "details": {
    "name": "Name is required and cannot be blank",
    "filterCriteria.startDate": "Start date must be before end date",
    "filterCriteria.categories": "Invalid category: XYZ"
  }
}
```

**401 Unauthorized** (No Auth):
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 2. List Saved Searches

Retrieve all saved searches for the authenticated user.

#### Request

**HTTP Method**: `GET`

**Endpoint**: `/api/saved-searches`

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**: None

#### Response

**Success Status**: `200 OK`

**Body**:
```json
{
  "items": [
    {
      "id": 42,
      "userId": "user123@example.com",
      "name": "Q1 Technical Reviews",
      "description": "Pending technical meeting requests for Q1 2026",
      "filterCriteria": {
        "categories": ["Technical"],
        "statuses": ["Pending"],
        "startDate": "2026-01-01",
        "endDate": "2026-03-31"
      },
      "createdAt": "2026-03-03T14:30:00Z",
      "updatedAt": "2026-03-03T14:30:00Z"
    },
    {
      "id": 43,
      "userId": "user123@example.com",
      "name": "Confidential Meetings",
      "description": "All confidential meetings requiring approval",
      "filterCriteria": {
        "classifications": ["Confidential"],
        "statuses": ["Pending", "Approved"]
      },
      "createdAt": "2026-03-01T10:15:00Z",
      "updatedAt": "2026-03-01T10:15:00Z"
    }
  ],
  "totalCount": 2
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `items` | array | Array of saved search objects |
| `totalCount` | int | Total number of saved searches for user |

**Sorting**: Results sorted by `updatedAt` descending (most recently modified first)

#### Error Responses

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 3. Get Saved Search by ID

Retrieve a specific saved search by ID.

#### Request

**HTTP Method**: `GET`

**Endpoint**: `/api/saved-searches/{id}`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Saved search ID |

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Response

**Success Status**: `200 OK`

**Body**:
```json
{
  "id": 42,
  "userId": "user123@example.com",
  "name": "Q1 Technical Reviews",
  "description": "Pending technical meeting requests for Q1 2026",
  "filterCriteria": {
    "categories": ["Technical"],
    "statuses": ["Pending"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "createdAt": "2026-03-03T14:30:00Z",
  "updatedAt": "2026-03-03T14:30:00Z"
}
```

#### Error Responses

**404 Not Found**:
```json
{
  "error": "NotFound",
  "message": "Saved search with ID 42 not found"
}
```

**403 Forbidden** (Attempting to access another user's saved search):
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this saved search"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 4. Update Saved Search

Update an existing saved search.

#### Request

**HTTP Method**: `PUT`

**Endpoint**: `/api/saved-searches/{id}`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Saved search ID |

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Body Schema**:
```json
{
  "name": "Q1 Technical Reviews (Updated)",
  "description": "Updated description",
  "filterCriteria": {
    "categories": ["Technical", "Budget"],
    "statuses": ["Pending"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  }
}
```

**Validation**: Same as Create (name uniqueness checked excluding current record)

#### Response

**Success Status**: `200 OK`

**Body**:
```json
{
  "id": 42,
  "userId": "user123@example.com",
  "name": "Q1 Technical Reviews (Updated)",
  "description": "Updated description",
  "filterCriteria": {
    "categories": ["Technical", "Budget"],
    "statuses": ["Pending"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "createdAt": "2026-03-03T14:30:00Z",
  "updatedAt": "2026-03-03T15:45:00Z"
}
```

**Note**: `updatedAt` timestamp automatically updated to current time.

#### Error Responses

**404 Not Found**:
```json
{
  "error": "NotFound",
  "message": "Saved search with ID 42 not found"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to update this saved search"
}
```

**409 Conflict** (Duplicate Name):
```json
{
  "error": "Conflict",
  "message": "A saved search with the name 'Q1 Technical Reviews (Updated)' already exists"
}
```

**400 Bad Request** (Validation Error):
```json
{
  "error": "ValidationError",
  "message": "Invalid saved search data",
  "details": {
    "filterCriteria.endDate": "End date must be after start date"
  }
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 5. Delete Saved Search

Delete a saved search.

#### Request

**HTTP Method**: `DELETE`

**Endpoint**: `/api/saved-searches/{id}`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Saved search ID |

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Response

**Success Status**: `204 No Content`

**Body**: Empty

#### Error Responses

**404 Not Found**:
```json
{
  "error": "NotFound",
  "message": "Saved search with ID 42 not found"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to delete this saved search"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 6. Apply Saved Search

Apply a saved search's filters to retrieve meeting requests.

#### Request

**HTTP Method**: `GET`

**Endpoint**: `/api/saved-searches/{id}/apply`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Saved search ID |

**Query Parameters** (Optional - override saved filters):
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Items per page (default: 20, max: 100) |
| `sortBy` | string | Sort field (default: createdAt) |
| `sortOrder` | string | Sort order: asc/desc (default: desc) |

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
```

#### Response

**Success Status**: `200 OK`

**Body**: Same as `/api/meetingrequests` search response

```json
{
  "items": [
    {
      "id": 101,
      "referenceNumber": "10001",
      "title": "Q1 IT Budget Review",
      "category": "Technical",
      "status": "Pending",
      ...
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 15,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "categories": ["Technical"],
    "statuses": ["Pending"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "savedSearchName": "Q1 Technical Reviews"
}
```

**Additional Field**:
- `savedSearchName`: Name of the applied saved search (for UI display)

#### Error Responses

**404 Not Found**:
```json
{
  "error": "NotFound",
  "message": "Saved search with ID 42 not found"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this saved search"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

## Examples

### Example 1: Create Saved Search

**Request**:
```http
POST /api/saved-searches
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1...

{
  "name": "Budget Meetings This Quarter",
  "description": "All budget-related meetings scheduled for Q1 2026",
  "filterCriteria": {
    "categories": ["Budget"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  }
}
```

**Response**:
```http
HTTP/1.1 201 Created
Location: /api/saved-searches/44
Content-Type: application/json

{
  "id": 44,
  "userId": "user123@example.com",
  "name": "Budget Meetings This Quarter",
  "description": "All budget-related meetings scheduled for Q1 2026",
  "filterCriteria": {
    "categories": ["Budget"],
    "statuses": [],
    "classifications": [],
    "requestors": [],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "createdAfter": null,
    "createdBefore": null,
    "referenceNumber": null,
    "query": null
  },
  "createdAt": "2026-03-03T16:20:00Z",
  "updatedAt": "2026-03-03T16:20:00Z"
}
```

---

### Example 2: List All Saved Searches

**Request**:
```http
GET /api/saved-searches
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "items": [
    {
      "id": 44,
      "userId": "user123@example.com",
      "name": "Budget Meetings This Quarter",
      "description": "All budget-related meetings scheduled for Q1 2026",
      "filterCriteria": {
        "categories": ["Budget"],
        "startDate": "2026-01-01",
        "endDate": "2026-03-31"
      },
      "createdAt": "2026-03-03T16:20:00Z",
      "updatedAt": "2026-03-03T16:20:00Z"
    },
    {
      "id": 42,
      "userId": "user123@example.com",
      "name": "Q1 Technical Reviews",
      "description": "Pending technical meeting requests for Q1 2026",
      "filterCriteria": {
        "categories": ["Technical"],
        "statuses": ["Pending"],
        "startDate": "2026-01-01",
        "endDate": "2026-03-31"
      },
      "createdAt": "2026-03-03T14:30:00Z",
      "updatedAt": "2026-03-03T14:30:00Z"
    }
  ],
  "totalCount": 2
}
```

---

### Example 3: Apply Saved Search

**Request**:
```http
GET /api/saved-searches/44/apply?page=1&pageSize=10
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "items": [
    {
      "id": 201,
      "referenceNumber": "20001",
      "title": "Q1 Budget Allocation Meeting",
      "category": "Budget",
      "meetingDate": "2026-02-15T14:00:00Z",
      "status": "Approved",
      ...
    },
    {
      "id": 202,
      "referenceNumber": "20002",
      "title": "Budget Review Session",
      "category": "Budget",
      "meetingDate": "2026-03-10T10:00:00Z",
      "status": "Pending",
      ...
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 2,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "categories": ["Budget"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  },
  "savedSearchName": "Budget Meetings This Quarter"
}
```

---

### Example 4: Update Saved Search

**Request**:
```http
PUT /api/saved-searches/44
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1...

{
  "name": "Budget Meetings This Quarter",
  "description": "Updated: Now includes Training category",
  "filterCriteria": {
    "categories": ["Budget", "Training"],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31"
  }
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 44,
  "userId": "user123@example.com",
  "name": "Budget Meetings This Quarter",
  "description": "Updated: Now includes Training category",
  "filterCriteria": {
    "categories": ["Budget", "Training"],
    "statuses": [],
    "classifications": [],
    "requestors": [],
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "createdAfter": null,
    "createdBefore": null,
    "referenceNumber": null,
    "query": null
  },
  "createdAt": "2026-03-03T16:20:00Z",
  "updatedAt": "2026-03-03T17:10:00Z"
}
```

---

### Example 5: Delete Saved Search

**Request**:
```http
DELETE /api/saved-searches/44
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 204 No Content
```

---

### Example 6: Duplicate Name Error

**Request**:
```http
POST /api/saved-searches
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1...

{
  "name": "Q1 Technical Reviews",
  "description": "Duplicate name test",
  "filterCriteria": {
    "categories": ["Technical"]
  }
}
```

**Response**:
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": "Conflict",
  "message": "A saved search with the name 'Q1 Technical Reviews' already exists"
}
```

---

## Database Schema

### SavedSearches Table

```sql
CREATE TABLE SavedSearches (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId TEXT NOT NULL,
    Name TEXT NOT NULL,
    Description TEXT,
    FilterCriteria TEXT NOT NULL, -- JSON serialized
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    UNIQUE(UserId, Name) -- Enforce unique names per user
);

CREATE INDEX idx_savedsearches_userid ON SavedSearches(UserId);
CREATE INDEX idx_savedsearches_updatedat ON SavedSearches(UpdatedAt DESC);
```

**FilterCriteria JSON Example**:
```json
{
  "categories": ["Technical", "Budget"],
  "statuses": ["Pending"],
  "classifications": [],
  "requestors": [],
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "createdAfter": null,
  "createdBefore": null,
  "referenceNumber": null,
  "query": null
}
```

---

## Security Considerations

### Row-Level Security

- All queries must filter by `UserId = <authenticated_user_id>`
- Prevents cross-user access (user A cannot see user B's saved searches)
- Applied at controller level (not repository)

### Authorization Checks

1. **Creating**: User can only create saved searches for themselves
2. **Reading**: User can only read their own saved searches
3. **Updating**: User can only update their own saved searches
4. **Deleting**: User can only delete their own saved searches

**Implementation**:
```csharp
// Extract user ID from JWT claims
var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

// Fetch saved search with user check
var savedSearch = await _context.SavedSearches
    .Where(s => s.Id == id && s.UserId == userId)
    .FirstOrDefaultAsync();

if (savedSearch == null)
    return NotFound();
```

### Input Sanitization

- Same validation as search API for filter criteria
- JSON deserialization with strict schema validation
- Prevent injection attacks via query string builder

---

## Performance Considerations

### Caching

- Cache user's saved searches list for 5 minutes
- Invalidate cache on create/update/delete operations
- Use in-memory cache (no Redis needed for MVP)

### Query Optimization

- Index on `(UserId, UpdatedAt DESC)` for fast list retrieval
- Unique constraint on `(UserId, Name)` enforces business rule at DB level
- Lazy load filter criteria (JSON deserialization only when needed)

### Limits

- Max 50 saved searches per user (prevent abuse)
- Enforced at create time with counted query

```csharp
var userSearchCount = await _context.SavedSearches
    .Where(s => s.UserId == userId)
    .CountAsync();

if (userSearchCount >= 50)
    return BadRequest("Maximum saved searches limit reached (50)");
```

---

## Testing Strategy

### Unit Tests

Test validation and business logic:
- Name uniqueness validation (per user)
- Filter criteria validation
- User ID enforcement

### Integration Tests

Test database operations:
```csharp
[Fact]
public async Task CreateSavedSearch_WithValidData_Returns201()
{
    var dto = new CreateSavedSearchDto
    {
        Name = "Test Search",
        FilterCriteria = new FilterCriteriaDto
        {
            Categories = new[] { "Technical" }
        }
    };
    
    var response = await Client.PostAsJsonAsync("/api/saved-searches", dto);
    
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    var result = await response.Content.ReadAsAsync<SavedSearchDto>();
    Assert.Equal("Test Search", result.Name);
}

[Fact]
public async Task GetSavedSearches_ReturnsOnlyUserSearches()
{
    // Seed with searches for multiple users
    await SeedSavedSearches();
    
    var response = await Client.GetAsync("/api/saved-searches");
    var result = await response.Content.ReadAsAsync<SavedSearchListDto>();
    
    Assert.All(result.Items, item => 
        Assert.Equal(CurrentUserId, item.UserId));
}
```

### E2E Tests (Playwright)

Test full save/apply flow:
```javascript
test('save and apply search', async ({ page }) => {
  await page.goto('/meeting-requests');
  
  // Configure filters
  await page.selectOption('[name="category"]', 'Technical');
  await page.fill('[name="startDate"]', '2026-01-01');
  await page.fill('[name="endDate"]', '2026-03-31');
  
  // Save search
  await page.click('button:has-text("Save Search")');
  await page.fill('[name="searchName"]', 'My Test Search');
  await page.click('button:has-text("Save")');
  
  // Verify saved
  await expect(page.locator('.saved-search-item')).toContainText('My Test Search');
  
  // Clear filters
  await page.click('button:has-text("Clear All")');
  
  // Apply saved search
  await page.click('.saved-search-item:has-text("My Test Search")');
  
  // Verify filters reapplied
  await expect(page.locator('[name="category"]')).toHaveValue('Technical');
  await expect(page.locator('[name="startDate"]')).toHaveValue('2026-01-01');
});
```

---

## Rate Limiting

**Limits** (per user):
- Create: 10 requests/minute
- List: 30 requests/minute
- Get/Update/Delete: 20 requests/minute
- Apply: 50 requests/minute (same limit as search API)

---

## Migration Notes

### Database Migration

**Migration Name**: `AddSavedSearchesTable`

**Up Script**:
```sql
CREATE TABLE SavedSearches (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId TEXT NOT NULL,
    Name TEXT NOT NULL,
    Description TEXT,
    FilterCriteria TEXT NOT NULL,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_savedsearches_userid_name 
ON SavedSearches(UserId, Name);

CREATE INDEX idx_savedsearches_updatedat 
ON SavedSearches(UpdatedAt DESC);
```

**Down Script**:
```sql
DROP TABLE IF EXISTS SavedSearches;
```

### Deployment Plan

1. **Phase 1**: Run database migration (adds table, no data)
2. **Phase 2**: Deploy backend with new endpoints
3. **Phase 3**: Deploy frontend with saved search UI
4. **Rollback**: Drop table if needed (no impact on existing features)
