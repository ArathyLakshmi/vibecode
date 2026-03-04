# Search API Contract

**Endpoint**: `GET /api/meetingrequests`  
**Purpose**: Enhanced search with advanced filtering capabilities  
**Authentication**: Required (Bearer Token)

---

## Overview

This contract extends the existing `/api/meetingrequests` endpoint with advanced filter parameters. The endpoint supports multi-criteria filtering, Boolean text search, date ranges, and pagination.

**Backwards Compatibility**: All new parameters are optional, existing clients continue to work unchanged.

---

## Request

### HTTP Method
```http
GET /api/meetingrequests
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `categories[]` | string[] | No | - | Filter by meeting categories (multiple allowed) |
| `statuses[]` | string[] | No | - | Filter by request statuses (multiple allowed) |
| `classifications[]` | string[] | No | - | Filter by classifications (multiple allowed) |
| `requestors[]` | string[] | No | - | Filter by requestor names (multiple allowed) |
| `startDate` | date | No | - | Meeting date >= this date (ISO 8601) |
| `endDate` | date | No | - | Meeting date <= this date (ISO 8601) |
| `createdAfter` | datetime | No | - | Created timestamp >= this (ISO 8601) |
| `createdBefore` | datetime | No | - | Created timestamp <= this (ISO 8601) |
| `referenceNumber` | string | No | - | Exact reference number match |
| `query` | string | No | - | Boolean text search (title, description, objectives) |
| `page` | int | No | 1 | Page number (1-indexed, min: 1) |
| `pageSize` | int | No | 20 | Items per page (min: 1, max: 100) |
| `sortBy` | string | No | `createdAt` | Sort field: `createdAt`, `meetingDate`, `title`, `referenceNumber` |
| `sortOrder` | string | No | `desc` | Sort order: `asc` or `desc` |

### Parameter Details

#### `categories[]`

Array of category names to filter by (OR logic).

**Valid Values**: `Technical`, `Budget`, `Policy`, `Training`, `HR`, `Operations`, `Other`

**Example**:
```http
GET /api/meetingrequests?categories[]=Technical&categories[]=Budget
```

**Validation**:
- Max 20 categories
- Invalid categories return 400 error

---

#### `statuses[]`

Array of request statuses (OR logic).

**Valid Values**: `Draft`, `Pending`, `Approved`, `Rejected`, `Completed`

**Example**:
```http
GET /api/meetingrequests?statuses[]=Pending&statuses[]=Approved
```

**Validation**:
- Max 10 statuses
- Invalid statuses return 400 error

---

#### `classifications[]`

Array of meeting classifications (OR logic).

**Valid Values**: `Confidential`, `Internal`, `Public`

**Example**:
```http
GET /api/meetingrequests?classifications[]=Confidential&classifications[]=Internal
```

**Validation**:
- Max 10 classifications
- Invalid classifications return 400 error

---

#### `requestors[]`

Array of requestor names (OR logic).

**Example**:
```http
GET /api/meetingrequests?requestors[]=John+Doe&requestors[]=Jane+Smith
```

**Validation**:
- Max 50 requestors
- Empty strings ignored

---

#### `startDate` / `endDate`

Date range filter for `meetingDate` field.

**Format**: ISO 8601 date-only (`YYYY-MM-DD`)

**Example**:
```http
GET /api/meetingrequests?startDate=2026-03-01&endDate=2026-03-31
```

**Validation**:
- `startDate` <= `endDate` (if both provided)
- `startDate` must be within 5 years past or future
- `endDate` must be within 5 years past or future
- Invalid dates return 400 error

---

#### `createdAfter` / `createdBefore`

Date range filter for `createdAt` timestamp.

**Format**: ISO 8601 datetime (`YYYY-MM-DDTHH:MM:SSZ`)

**Example**:
```http
GET /api/meetingrequests?createdAfter=2026-01-01T00:00:00Z&createdBefore=2026-03-31T23:59:59Z
```

**Validation**:
- `createdAfter` <= `createdBefore` (if both provided)
- Must be within 5 years past
- Invalid datetimes return 400 error

---

#### `referenceNumber`

Exact match filter for reference number.

**Example**:
```http
GET /api/meetingrequests?referenceNumber=12345
```

**Behavior**:
- Case-insensitive match
- Returns at most 1 result (reference numbers are unique)
- Overrides pagination (returns single item if found)

---

#### `query`

Boolean text search across `title`, `description`, `objectives` fields.

**Syntax**:
- `word1 AND word2`: Both words must appear
- `word1 OR word2`: At least one word must appear
- `"exact phrase"`: Exact phrase match
- `NOT word`: Exclude results containing word
- Parentheses for grouping: `(word1 OR word2) AND word3`
- Default (no operator): AND logic

**Example**:
```http
GET /api/meetingrequests?query=budget%20AND%20(quarterly%20OR%20annual)
```

**Validation**:
- Max 500 characters
- Invalid syntax returns 400 error with syntax hint
- Empty query ignored

**Performance**:
- Case-insensitive search
- Full-text index on `title`, `description`, `objectives`
- Target: <500ms for complex queries

---

#### `page` / `pageSize`

Pagination controls.

**Example**:
```http
GET /api/meetingrequests?page=2&pageSize=50
```

**Validation**:
- `page` >= 1
- `pageSize` between 1 and 100
- Out-of-range values return 400 error

---

#### `sortBy` / `sortOrder`

Sort controls.

**Valid `sortBy` Values**: `createdAt`, `meetingDate`, `title`, `referenceNumber`

**Valid `sortOrder` Values**: `asc`, `desc`

**Example**:
```http
GET /api/meetingrequests?sortBy=meetingDate&sortOrder=asc
```

**Validation**:
- Invalid sort fields return 400 error
- Invalid sort order returns 400 error

**Default**: `sortBy=createdAt&sortOrder=desc` (newest first)

---

## Response

### Success Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

**Schema**:
```json
{
  "items": [
    {
      "id": 123,
      "referenceNumber": "12345",
      "title": "Q1 Budget Review",
      "description": "Quarterly budget review meeting",
      "objectives": "Review Q1 spending and approve Q2 budget",
      "category": "Budget",
      "classification": "Internal",
      "meetingDate": "2026-03-15T00:00:00Z",
      "duration": 60,
      "location": "Conference Room A",
      "requestorName": "John Doe",
      "requestorEmail": "john.doe@example.com",
      "requestorDepartment": "Finance",
      "status": "Pending",
      "isDraft": false,
      "createdAt": "2026-03-01T10:30:00Z",
      "updatedAt": "2026-03-01T10:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 150,
  "totalPages": 8,
  "hasMore": true,
  "appliedFilters": {
    "categories": ["Budget", "Technical"],
    "statuses": ["Pending"],
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "query": "budget AND quarterly"
  }
}
```

### Response Fields

#### `items[]`

Array of meeting request objects matching filters.

**Type**: `MeetingRequestDto[]`

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Unique identifier |
| `referenceNumber` | string | 5-digit reference (null for drafts) |
| `title` | string | Meeting title |
| `description` | string | Detailed description |
| `objectives` | string | Meeting objectives |
| `category` | string | Category (Technical, Budget, etc.) |
| `classification` | string | Classification (Confidential, Internal, Public) |
| `meetingDate` | datetime | Scheduled date/time (ISO 8601) |
| `duration` | int | Duration in minutes |
| `location` | string | Meeting location |
| `requestorName` | string | Name of requestor |
| `requestorEmail` | string | Email of requestor |
| `requestorDepartment` | string | Department of requestor |
| `status` | string | Status (Draft, Pending, Approved, etc.) |
| `isDraft` | bool | Draft status |
| `createdAt` | datetime | Creation timestamp (ISO 8601) |
| `updatedAt` | datetime | Last update timestamp (ISO 8601) |

---

#### `page`, `pageSize`, `totalCount`, `totalPages`, `hasMore`

Standard pagination metadata.

| Field | Type | Description |
|-------|------|-------------|
| `page` | int | Current page number |
| `pageSize` | int | Items per page |
| `totalCount` | int | Total matching items (all pages) |
| `totalPages` | int | Total number of pages |
| `hasMore` | bool | Whether more pages exist |

---

#### `appliedFilters`

Echo of applied filters for client-side display.

**Type**: `object`

**Purpose**: Allows UI to display "Filtered by: Budget, Technical (Pending status)" messages.

---

## Error Responses

### 400 Bad Request

**Scenario**: Invalid query parameters

**Response**:
```json
{
  "error": "ValidationError",
  "message": "Invalid request parameters",
  "details": {
    "categories": "Invalid category: XYZ",
    "startDate": "Start date must be before end date",
    "query": "Invalid query syntax: Unclosed parenthesis at position 15"
  }
}
```

**Common Validation Errors**:
| Field | Error Message |
|-------|---------------|
| `categories[]` | "Invalid category: {value}" |
| `statuses[]` | "Invalid status: {value}" |
| `startDate` | "Invalid date format. Use YYYY-MM-DD" |
| `endDate` | "End date must be after start date" |
| `page` | "Page must be >= 1" |
| `pageSize` | "Page size must be between 1 and 100" |
| `query` | "Invalid Boolean syntax: {details}" |

---

### 401 Unauthorized

**Scenario**: Missing or invalid authentication token

**Response**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 429 Too Many Requests

**Scenario**: Rate limit exceeded (100 requests/minute)

**Response**:
```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Try again in 30 seconds."
}
```

**Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709481690
Retry-After: 30
```

---

### 500 Internal Server Error

**Scenario**: Unexpected server error

**Response**:
```json
{
  "error": "InternalServerError",
  "message": "An error occurred processing your request. Please try again."
}
```

---

## Examples

### Example 1: Basic Category Filter

**Request**:
```http
GET /api/meetingrequests?categories[]=Technical&categories[]=Budget
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```json
{
  "items": [
    {
      "id": 101,
      "referenceNumber": "10001",
      "title": "Q1 IT Budget Review",
      "category": "Technical",
      "status": "Pending",
      "meetingDate": "2026-03-15T14:00:00Z",
      ...
    },
    {
      "id": 102,
      "referenceNumber": "10002",
      "title": "Annual Budget Planning",
      "category": "Budget",
      "status": "Approved",
      "meetingDate": "2026-03-20T10:00:00Z",
      ...
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 2,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "categories": ["Technical", "Budget"]
  }
}
```

---

### Example 2: Date Range + Status Filter

**Request**:
```http
GET /api/meetingrequests?startDate=2026-03-01&endDate=2026-03-31&statuses[]=Pending&statuses[]=Approved
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```json
{
  "items": [
    {
      "id": 103,
      "referenceNumber": "10003",
      "title": "March Security Review",
      "category": "Technical",
      "status": "Pending",
      "meetingDate": "2026-03-10T09:00:00Z",
      ...
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "statuses": ["Pending", "Approved"],
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}
```

---

### Example 3: Boolean Text Search

**Request**:
```http
GET /api/meetingrequests?query=budget%20AND%20(quarterly%20OR%20annual)
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```json
{
  "items": [
    {
      "id": 104,
      "referenceNumber": "10004",
      "title": "Quarterly Budget Review",
      "description": "Review of Q1 budget allocations and spending",
      "category": "Budget",
      "status": "Pending",
      ...
    },
    {
      "id": 105,
      "referenceNumber": "10005",
      "title": "Annual Budget Planning",
      "description": "Year-end budget planning session",
      "category": "Budget",
      "status": "Approved",
      ...
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 2,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "query": "budget AND (quarterly OR annual)"
  }
}
```

---

### Example 4: Complex Multi-Criteria Search

**Request**:
```http
GET /api/meetingrequests?categories[]=Technical&classifications[]=Confidential&startDate=2026-03-01&endDate=2026-03-31&query=security%20AND%20compliance&page=1&pageSize=10&sortBy=meetingDate&sortOrder=asc
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```json
{
  "items": [
    {
      "id": 106,
      "referenceNumber": "10006",
      "title": "Security Compliance Review",
      "description": "Quarterly security and compliance assessment",
      "category": "Technical",
      "classification": "Confidential",
      "meetingDate": "2026-03-05T11:00:00Z",
      "status": "Approved",
      ...
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 1,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "categories": ["Technical"],
    "classifications": ["Confidential"],
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "query": "security AND compliance"
  }
}
```

---

### Example 5: Reference Number Lookup

**Request**:
```http
GET /api/meetingrequests?referenceNumber=10001
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
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
  "pageSize": 1,
  "totalCount": 1,
  "totalPages": 1,
  "hasMore": false,
  "appliedFilters": {
    "referenceNumber": "10001"
  }
}
```

---

### Example 6: Empty Results

**Request**:
```http
GET /api/meetingrequests?categories[]=Training&statuses[]=Completed
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0,
  "totalPages": 0,
  "hasMore": false,
  "appliedFilters": {
    "categories": ["Training"],
    "statuses": ["Completed"]
  }
}
```

---

## Performance Considerations

### Database Indexes

Required composite indexes on `MeetingRequests` table:
```sql
CREATE INDEX idx_meetingrequests_category_status_meetingdate 
ON MeetingRequests(Category, Status, MeetingDate);

CREATE INDEX idx_meetingrequests_meetingdate_status 
ON MeetingRequests(MeetingDate, Status);

CREATE INDEX idx_meetingrequests_createdat_status 
ON MeetingRequests(CreatedAt, Status);
```

Full-text search index:
```sql
-- SQLite FTS5 virtual table (separate table linked to main table)
CREATE VIRTUAL TABLE MeetingRequests_fts USING fts5(
    title, description, objectives,
    content='MeetingRequests',
    content_rowid='Id'
);
```

### Query Optimization

1. **Filter Pushdown**: Apply most selective filters first (referenceNumber > status > date > category)
2. **Limit Early**: Apply `pageSize` limit before materialization
3. **Lazy Loading**: Don't load fields not needed for list view
4. **Count Caching**: Cache `totalCount` for 30 seconds for repeated pagination

### Expected Performance

| Scenario | Target Latency (P95) |
|----------|----------------------|
| No filters | < 100ms |
| Single filter | < 200ms |
| Multiple filters | < 300ms |
| Boolean text search | < 500ms |
| Complex multi-criteria | < 500ms |

---

## Testing Strategy

### Unit Tests

Test filter logic in isolation:
- `FilterBuilder` tests for each filter type
- `BooleanQueryParser` tests for query syntax
- Validation tests for each parameter

### Integration Tests

Test database queries end-to-end:
```csharp
[Fact]
public async Task GetMeetingRequests_WithCategoryAndStatusFilters_ReturnsMatchingResults()
{
    // Arrange: Seed database with known data
    await SeedMeetingRequests();
    
    // Act: Call API with filters
    var response = await Client.GetAsync(
        "/api/meetingrequests?categories[]=Technical&statuses[]=Pending");
    
    // Assert: Verify results
    var result = await response.Content.ReadAsAsync<SearchResultsDto>();
    Assert.All(result.Items, item => 
    {
        Assert.Equal("Technical", item.Category);
        Assert.Equal("Pending", item.Status);
    });
}
```

### E2E Tests (Playwright)

Test full user flows:
```javascript
test('advanced search with multiple filters', async ({ page }) => {
  await page.goto('/meeting-requests');
  await page.click('[aria-label="Advanced search"]');
  
  await page.selectOption('[name="category"]', ['Technical', 'Budget']);
  await page.selectOption('[name="status"]', 'Pending');
  await page.fill('[name="startDate"]', '2026-03-01');
  await page.fill('[name="endDate"]', '2026-03-31');
  
  await page.click('button:has-text("Apply Filters")');
  
  await expect(page.locator('.results-count')).toContainText('2 results');
  await expect(page.locator('.result-item')).toHaveCount(2);
});
```

---

## Migration Notes

### Existing Endpoint

Current endpoint returns all meeting requests with basic pagination:
```http
GET /api/meetingrequests?page=1&pageSize=20
```

### Changes

1. **New Parameters**: All filter parameters added (backwards compatible)
2. **Response Format**: Added `appliedFilters` field to response
3. **Performance**: New indexes required (see above)

### Rollout Plan

1. **Phase 1**: Add indexes (no downtime, run in background)
2. **Phase 2**: Deploy backend with new filter logic (backwards compatible)
3. **Phase 3**: Deploy frontend with advanced search UI

**Rollback**: New parameters optional, can rollback to previous version without data loss.
