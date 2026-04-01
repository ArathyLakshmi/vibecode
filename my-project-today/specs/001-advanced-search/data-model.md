# Data Model: Advanced Search & Filtering

**Feature**: 001-advanced-search  
**Date**: March 3, 2026  
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the data entities, DTOs, and database schema for the advanced search feature. The design focuses on storing user-created saved searches and tracking search history while maintaining backwards compatibility with the existing MeetingRequests table.

---

## Entities

### SavedSearch

**Purpose**: Stores user-created filter combinations for quick reuse

**Properties**:
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| Id | int | No | Primary key, auto-increment |
| UserId | string | No | User identifier from MSAL claims (email or Object ID) |
| Name | string(50) | No | User-defined name for the saved search |
| FilterCriteria | JSON (TEXT) | No | Serialized FilterCriteriaDto object |
| CreatedAt | DateTime | No | UTC timestamp when search was created |
| UpdatedAt | DateTime | No | UTC timestamp of last modification |

**Constraints**:
- `UNIQUE(UserId, Name)`: Prevents duplicate search names for same user
- Max 20 saved searches per user (enforced by application logic)
- Name max length: 50 characters
- FilterCriteria max size: ~4KB JSON (reasonable for filter combinations)

**Indexes**:
```sql
CREATE INDEX IX_SavedSearches_UserId ON SavedSearches(UserId);
```

**EF Core Entity**:
```csharp
public class SavedSearch
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    
    [Column(TypeName = "TEXT")]
    public string FilterCriteria { get; set; } = "{}";  // JSON serialized
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**FilterCriteria JSON Structure**:
```json
{
  "categories": ["Technical", "Operations"],
  "statuses": ["Pending", "Approved"],
  "classifications": ["Confidential"],
  "requestorEmails": ["user@example.com"],
  "textQuery": "annual review",
  "dateRangeStart": "2026-03-01T00:00:00Z",
  "dateRangeEnd": "2026-03-31T23:59:59Z",
  "fieldFilters": {
    "title": "budget",
    "ref": "01234"
  }
}
```

---

### SearchHistory (Optional - Client-Side Only)

**Purpose**: Track recent search queries for quick reapplication

**Storage**: Browser localStorage (not database table)

**Structure**:
```typescript
interface SearchHistoryEntry {
  id: string;                    // UUID v4
  filters: FilterCriteriaDto;    // Same structure as SavedSearch
  timestamp: string;              // ISO 8601 date string
  resultCount: number | null;     // Number of results returned (optional)
}

interface SearchHistory {
  userId: string;
  searches: SearchHistoryEntry[]; // Max 10 entries, most recent first
}
```

**LocalStorage Key**: `searchHistory_{userId}`

**Rationale for Client-Side**:
- No backend storage needed (reduces complexity)
- Instant access without API call
- Privacy-friendly (not synced across devices)
- Easy to clear on logout

---

## Data Transfer Objects (DTOs)

### FilterCriteriaDto

**Purpose**: Transfer filter parameters between frontend and backend

**C# Definition**:
```csharp
public class FilterCriteriaDto
{
    public List<string>? Categories { get; set; }
    public List<string>? Statuses { get; set; }
    public List<string>? Classifications { get; set; }
    public List<string>? RequestorEmails { get; set; }
    public string? TextQuery { get; set; }
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Dictionary<string, string>? FieldFilters { get; set; }
}
```

**TypeScript Definition** (Frontend):
```typescript
export interface FilterCriteriaDto {
  categories?: string[];
  statuses?: string[];
  classifications?: string[];
  requestorEmails?: string[];
  textQuery?: string;
  dateRangeStart?: string;  // ISO 8601 date string
  dateRangeEnd?: string;    // ISO 8601 date string
  fieldFilters?: Record<string, string>;
}
```

**Validation Rules**:
| Field | Min | Max | Pattern | Notes |
|-------|-----|-----|---------|-------|
| categories | 0 | 20 | N/A | Valid category names from enum |
| statuses | 0 | 10 | N/A | Valid status names from enum |
| classifications | 0 | 10 | N/A | Valid classification names |
| requestorEmails | 0 | 20 | Email format | Valid email addresses |
| textQuery | 0 | 500 | UTF-8 text | Sanitized for SQL injection |
| dateRangeStart | N/A | N/A | ISO 8601 | Not after dateRangeEnd |
| dateRangeEnd | N/A | N/A | ISO 8601 | Not before dateRangeStart |
| fieldFilters | 0 | 10 | Key-value pairs | Whitelisted field names only |

---

### SavedSearchDto

**Purpose**: API response format for saved searches

**C# Definition**:
```csharp
public class SavedSearchDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public FilterCriteriaDto Filters { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**TypeScript Definition** (Frontend):
```typescript
export interface SavedSearchDto {
  id: number;
  name: string;
  filters: FilterCriteriaDto;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

---

### CreateSavedSearchRequest

**Purpose**: Request body for creating new saved search

**C# Definition**:
```csharp
public class CreateSavedSearchRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public FilterCriteriaDto Filters { get; set; } = new();
}
```

**Validation**:
- Name: Required, 1-50 characters, non-empty after trim
- Filters: Required, must be valid FilterCriteriaDto

---

### UpdateSavedSearchRequest

**Purpose**: Request body for updating existing saved search

**C# Definition**:
```csharp
public class UpdateSavedSearchRequest
{
    [StringLength(50, MinimumLength = 1)]
    public string? Name { get; set; }
    
    public FilterCriteriaDto? Filters { get; set; }
}
```

**Validation**:
- At least one field must be provided (Name or Filters)
- If Name provided: 1-50 characters, non-empty after trim
- If Filters provided: must be valid FilterCriteriaDto

---

### SearchResultsDto

**Purpose**: Paginated search results with metadata

**C# Definition**:
```csharp
public class SearchResultsDto
{
    public List<MeetingRequestSummaryDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasMore { get; set; }
    public FilterCriteriaDto? AppliedFilters { get; set; }
}
```

**TypeScript Definition** (Frontend):
```typescript
export interface SearchResultsDto {
  items: MeetingRequestSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  appliedFilters?: FilterCriteriaDto;
}
```

---

## Database Schema Changes

### Migration: AddAdvancedSearch

**Up Migration**:
```sql
-- Create SavedSearches table
CREATE TABLE SavedSearches (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId TEXT NOT NULL,
    Name TEXT NOT NULL,
    FilterCriteria TEXT NOT NULL,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NOT NULL,
    CONSTRAINT UQ_SavedSearches_UserId_Name UNIQUE (UserId, Name)
);

-- Create index for user lookups
CREATE INDEX IX_SavedSearches_UserId ON SavedSearches(UserId);

-- Add new indexes to MeetingRequests for optimized filtering
CREATE INDEX IX_MeetingRequests_Category_Status_Date 
    ON MeetingRequests(Category, Status, MeetingDate);

CREATE INDEX IX_MeetingRequests_Status_Date 
    ON MeetingRequests(Status, MeetingDate);

CREATE INDEX IX_MeetingRequests_RequestorEmail_Date_Status 
    ON MeetingRequests(RequestorEmail, MeetingDate, Status);

CREATE INDEX IX_MeetingRequests_Classification 
    ON MeetingRequests(Classification);
```

**Down Migration**:
```sql
DROP INDEX IF EXISTS IX_SavedSearches_UserId;
DROP TABLE IF EXISTS SavedSearches;

DROP INDEX IF EXISTS IX_MeetingRequests_Category_Status_Date;
DROP INDEX IF EXISTS IX_MeetingRequests_Status_Date;
DROP INDEX IF EXISTS IX_MeetingRequests_RequestorEmail_Date_Status;
DROP INDEX IF EXISTS IX_MeetingRequests_Classification;
```

**EF Core Migration Class**:
```csharp
public partial class AddAdvancedSearch : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SavedSearches",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                UserId = table.Column<string>(nullable: false),
                Name = table.Column<string>(maxLength: 50, nullable: false),
                FilterCriteria = table.Column<string>(type: "TEXT", nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false),
                UpdatedAt = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SavedSearches", x => x.Id);
                table.UniqueConstraint("UQ_SavedSearches_UserId_Name", x => new { x.UserId, x.Name });
            });

        migrationBuilder.CreateIndex(
            name: "IX_SavedSearches_UserId",
            table: "SavedSearches",
            column: "UserId");

        // Additional indexes on MeetingRequests
        migrationBuilder.CreateIndex(
            name: "IX_MeetingRequests_Category_Status_Date",
            table: "MeetingRequests",
            columns: new[] { "Category", "Status", "MeetingDate" });

        // ... other indexes
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SavedSearches");
        migrationBuilder.DropIndex(name: "IX_MeetingRequests_Category_Status_Date", table: "MeetingRequests");
        // ... drop other indexes
    }
}
```

---

## Relationships

### SavedSearch → User (External)
- **Type**: Many-to-One (conceptual, not enforced by FK)
- **Relationship**: Each SavedSearch belongs to one User (identified by UserId from MSAL)
- **Cascade**: No database cascade (UserId is string, not FK to Users table)
- **Application Logic**: When user deleted, saved searches can remain (or cleaned up by admin script)

### SavedSearch → FilterCriteria
- **Type**: Composition (embedded JSON)
- **Relationship**: Each SavedSearch has one FilterCriteria object
- **Storage**: JSON serialized in TEXT column
- **Deserialization**: On read, JSON parsed to FilterCriteriaDto

### MeetingRequest (No Changes)
- **Existing relationships preserved**
- **New indexes added for query performance**
- **No schema modifications to MeetingRequests table**

---

## Data Flow

### Create Saved Search
1. **Frontend**: User configures filters, clicks "Save Search", enters name
2. **API Call**: `POST /api/saved-searches` with CreateSavedSearchRequest
3. **Backend**: 
   - Extract UserId from auth claims
   - Validate name uniqueness for user
   - Check user has <20 saved searches
   - Serialize FilterCriteriaDto to JSON
   - Insert SavedSearch entity
4. **Response**: Return SavedSearchDto with generated Id

### Apply Saved Search
1. **Frontend**: User selects saved search from dropdown
2. **API Call**: `GET /api/saved-searches/{id}`
3. **Backend**:
   - Retrieve SavedSearch entity
   - Verify ownership (SavedSearch.UserId == current user)
   - Deserialize FilterCriteria JSON to FilterCriteriaDto
4. **Response**: Return SavedSearchDto
5. **Frontend**: Apply filters to search form, trigger search API call

### Execute Complex Search
1. **Frontend**: User configures filters in advanced search panel
2. **API Call**: `GET /api/meetingrequests?[filter params]`
3. **Backend**:
   - Parse query string to FilterCriteriaDto
   - Validate filter values
   - Build dynamic LINQ query with IQueryable composition
   - Execute query with pagination (COUNT + SELECT with OFFSET/LIMIT)
4. **Response**: Return SearchResultsDto
5. **Frontend**: 
   - Display results
   - Add to search history (localStorage)

---

## Performance Considerations

### Database Indexes
- Composite indexes cover common multi-filter queries
- SQLite uses at most one index per query (composites important)
- Index selectivity: Category > Status > Date (order matters)

### Query Optimization
- Filters applied in order of selectivity (most to least restrictive)
- Pagination limits result set materialization
- `COUNT(*)` executed separately with same filters (cached by SQLite)
- Text search uses `LIKE` with leading wildcard only when necessary

### Caching Strategy
- Filter option lists (categories, statuses) cached in-memory (30 min TTL)
- Saved searches cached per-user session (invalidated on save/delete)
- No result caching initially (implement if performance issues)

### Scalability Limits
- Max 50,000 meetings (current scope)
- Max 20 saved searches per user
- Max 10 search history entries per user (client-side)
- Max 1,000 records per export

---

## Security Considerations

### Authorization
- SavedSearches filtered by UserId (row-level security via application code)
- Users can only CRUD their own saved searches
- Admins cannot view other users' saved searches (privacy by design)

### Input Validation
- All text fields sanitized for SQL injection (EF Core parameterization)
- Field names whitelisted for field-specific searches
- Date ranges validated (start <= end, within 5-year window)
- Array lengths limited (max 20 categories, 10 statuses, etc.)

### Data Privacy
- Search history stored client-side only (not transmitted to server)
- Saved search names not logged (may contain sensitive terms)
- Filter criteria logged only in debug mode (dev environment)

---

## Future Enhancements (Out of Scope)

- **Shared Saved Searches**: Organization-wide or team-shared searches
- **Search Analytics**: Track popular filters, optimize indexes
- **Full-Text Search**: SQLite FTS5 extension for better text search
- **Smart Suggestions**: Autocomplete based on past searches
- **Export Scheduling**: Automated recurring exports

---

## Summary

The data model introduces a single new table (SavedSearches) with minimal schema changes to the existing database. The design prioritizes simplicity, performance, and backwards compatibility while enabling rich filtering capabilities. All entities and DTOs are defined with clear validation rules and constraints to ensure data integrity.

**Key Design Decisions**:
- JSON storage for flexible filter criteria
- Client-side search history (no backend storage)
- Composite database indexes for query performance
- Strong typing with DTOs for frontend-backend contract
- No breaking changes to existing MeetingRequests schema
