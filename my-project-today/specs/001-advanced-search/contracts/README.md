# API Contracts: Advanced Search & Filtering

**Feature**: 001-advanced-search  
**Date**: March 3, 2026  
**Phase**: 1 (Design & Contracts)

## Overview

This directory contains API contract specifications for the advanced search feature. Contracts define the interface between frontend and backend, including request/response formats, validation rules, error codes, and example payloads.

---

## Contract Documents

| File | Endpoint | Description |
|------|----------|-------------|
| [search-api.md](search-api.md) | `GET /api/meetingrequests` | Enhanced with advanced filter parameters |
| [saved-searches-api.md](saved-searches-api.md) | `/api/saved-searches` | CRUD operations for user saved searches |
| [export-api.md](export-api.md) | `GET /api/meetingrequests/export` | Export filtered results to CSV/PDF |

---

## Common Patterns

### Authentication

All endpoints require authentication via MSAL Azure AD bearer token:

```http
Authorization: Bearer <JWT_TOKEN>
```

**Unauthenticated Response**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### Error Responses

**Standard Error Format**:
```json
{
  "error": "ErrorCode",
  "message": "Human-readable error description",
  "details": {
    "field": "Specific validation failure details"
  }
}
```

**Common Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ValidationError` | 400 | Request validation failed |
| `Unauthorized` | 401 | Authentication required |
| `Forbidden` | 403 | Insufficient permissions |
| `NotFound` | 404 | Resource not found |
| `Conflict` | 409 | Duplicate resource (e.g., saved search name) |
| `TooManyRequests` | 429 | Rate limit exceeded |
| `InternalServerError` | 500 | Unexpected server error |

---

### Pagination

Paginated endpoints use consistent query parameters:

**Request Parameters**:
- `page` (int, optional, default: 1): Page number (1-indexed)
- `pageSize` (int, optional, default: 20, max: 100): Items per page

**Response Metadata**:
```json
{
  "items": [...],
  "page": 1,
  "pageSize": 20,
  "totalCount": 150,
  "totalPages": 8,
  "hasMore": true
}
```

---

### Date Formats

All dates use ISO 8601 format:
- **DateTime**: `2026-03-03T14:30:00Z` (UTC with timezone)
- **Date Only**: `2026-03-03` (parsed as start of day in user timezone)

---

### Content Negotiation

**Request Headers**:
```http
Content-Type: application/json
Accept: application/json
```

**Response Headers**:
```http
Content-Type: application/json; charset=utf-8
```

---

## Testing Approach

### Contract Tests

Each endpoint will have contract tests validating:
1. **Request Schema**: Valid requests accepted, invalid rejected
2. **Response Schema**: Response matches documented structure
3. **Status Codes**: Correct HTTP status for each scenario
4. **Error Messages**: Errors return documented format

**Test Framework**: xUnit with `Microsoft.AspNetCore.Mvc.Testing`

**Example Contract Test**:
```csharp
[Fact]
public async Task GetMeetingRequests_WithMultipleFilters_ReturnsFilteredResults()
{
    // Arrange
    var client = _factory.CreateClient();
    var filters = "?categories[]=Technical&statuses[]=Pending&startDate=2026-03-01";
    
    // Act
    var response = await client.GetAsync($"/api/meetingrequests{filters}");
    var content = await response.Content.ReadAsStringAsync();
    var result = JsonSerializer.Deserialize<SearchResultsDto>(content);
    
    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(result);
    Assert.All(result.Items, item => 
    {
        Assert.Equal("Technical", item.Category);
        Assert.Equal("Pending", item.Status);
        Assert.True(item.MeetingDate >= new DateTime(2026, 3, 1));
    });
}
```

---

### Integration Tests

Verify end-to-end flows across multiple API calls:
1. Create saved search → Retrieve → Apply filters → Get results
2. Apply filters → Export → Verify CSV content
3. Rapid filter changes → Verify correct results (concurrency)

---

### E2E Tests (Playwright)

Validate user flows from UI to API:
1. User opens advanced search panel
2. Configures multiple filters
3. Applies filters
4. Verifies filtered results display
5. Saves search
6. Reloads and applies saved search
7. Verifies same results returned

---

## Versioning

**Current Version**: v1 (no version in URL path)

**Backwards Compatibility**:
- New query parameters optional (don't break existing clients)
- New endpoints under new paths (`/api/saved-searches`)
- Response format extensions additive (new fields only)
- Breaking changes require API version bump (future: `/api/v2/...`)

---

## Rate Limiting

**Limits** (per user):
- Search API: 100 requests/minute
- Saved Searches CRUD: 20 requests/minute
- Export: 5 requests/minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709481660
```

**Rate Limit Exceeded Response**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## Performance SLAs

| Endpoint | Target Latency (P95) | Max Response Size |
|----------|----------------------|-------------------|
| Search API | < 500ms | 2 MB |
| Saved Searches | < 100ms | 50 KB |
| Export | < 5s | 10 MB |

---

## Security

### Input Validation
- All query parameters sanitized and validated
- Array parameters limited (max 20 categories, 10 statuses, etc.)
- Text parameters limited (max 500 characters for search query)
- Date ranges validated (start <= end, within 5 years)

### SQL Injection Prevention
- EF Core parameterized queries (no string concatenation)
- Field names whitelisted (prevent dynamic column access)

### Authorization
- Row-level security for saved searches (UserId filtering)
- Users can only access their own saved searches
- No cross-user data exposure in responses

---

## Next Steps

Refer to individual contract documents for detailed endpoint specifications:
1. **[search-api.md](search-api.md)**: Enhanced meeting requests search
2. **[saved-searches-api.md](saved-searches-api.md)**: Saved search management
3. **[export-api.md](export-api.md)**: Export functionality
