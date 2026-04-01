# Data Model: Pre-registration Feature

**Feature**: Add Pre-register Button for Announced Requests  
**Branch**: `007-preregister`  
**Date**: 2026-02-14  
**Phase**: Phase 1 Design

## Entity Model

### MeetingRequestPreRegistration

**Purpose**: Stores user pre-registration records for announced meeting requests, supporting soft-delete for audit trail.

**Properties**:

| Property | Type | Nullable | Description |
|----------|------|----------|-------------|
| `Id` | `int` | No | Primary key, auto-increment |
| `MeetingRequestId` | `int` | No | Foreign key to MeetingRequests table |
| `UserId` | `string` | No | Azure AD object ID (oid claim) - unique user identifier |
| `UserName` | `string` | No | User's display name from Azure AD (name claim) |
| `UserEmail` | `string` | Yes | User's email from Azure AD (preferred_username/email claim) |
| `RegisteredAt` | `DateTime` | No | UTC timestamp when user registered |
| `CancelledAt` | `DateTime?` | Yes | UTC timestamp when user cancelled (NULL = active) |
| `Status` | `string` | No | "Registered" or "Cancelled" (derived from CancelledAt) |

**Navigation Properties**:
- `MeetingRequest` (many-to-one): Reference to parent MeetingRequest entity

**Indexes**:
- Primary key on `Id`
- Index on `MeetingRequestId` (for efficient queries by meeting)
- Composite index on `(MeetingRequestId, UserId)` (for duplicate detection queries)

**C# Entity Class**:
```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VibeCode.Server.Models
{
    public class MeetingRequestPreRegistration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MeetingRequestId { get; set; }

        [Required]
        [MaxLength(450)] // Standard GUID string length
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string UserName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? UserEmail { get; set; }

        [Required]
        public DateTime RegisteredAt { get; set; }

        public DateTime? CancelledAt { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Registered";

        // Navigation property
        [ForeignKey(nameof(MeetingRequestId))]
        public MeetingRequest? MeetingRequest { get; set; }
    }
}
```

---

## Entity Relationships

### MeetingRequest ↔ MeetingRequestPreRegistration

**Relationship Type**: One-to-Many  
**Cardinality**: 
- One MeetingRequest can have many PreRegistrations (0..*)
- Each PreRegistration belongs to exactly one MeetingRequest (1)

**Foreign Key**: `MeetingRequestPreRegistration.MeetingRequestId` → `MeetingRequest.Id`

**Delete Behavior**: Restrict (prevent deletion of meeting with active registrations) or Cascade (delete registrations when meeting deleted)
- **Recommendation**: Use Restrict for data integrity, require manual cleanup before meeting deletion

**Update MeetingRequest Entity**:
```csharp
// Add to existing MeetingRequest.cs
public class MeetingRequest
{
    // ... existing properties

    // Add navigation property
    public ICollection<MeetingRequestPreRegistration> PreRegistrations { get; set; } 
        = new List<MeetingRequestPreRegistration>();
}
```

---

## Database Configuration (Entity Framework Core)

**DbContext Configuration** (in `MeetingRequestsDbContext.OnModelCreating`):

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Configure MeetingRequestPreRegistration entity
    modelBuilder.Entity<MeetingRequestPreRegistration>(entity =>
    {
        // Table name
        entity.ToTable("MeetingRequestPreRegistrations");

        // Primary key
        entity.HasKey(e => e.Id);

        // Relationship with MeetingRequest
        entity.HasOne(p => p.MeetingRequest)
              .WithMany(m => m.PreRegistrations)
              .HasForeignKey(p => p.MeetingRequestId)
              .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        entity.HasIndex(e => e.MeetingRequestId)
              .HasDatabaseName("IX_MeetingRequestPreRegistrations_MeetingRequestId");

        entity.HasIndex(e => new { e.MeetingRequestId, e.UserId })
              .HasDatabaseName("IX_MeetingRequestPreRegistrations_MeetingRequestId_UserId");

        // Global query filter to exclude cancelled registrations by default
        entity.HasQueryFilter(p => p.CancelledAt == null);

        // Default values
        entity.Property(e => e.RegisteredAt)
              .HasDefaultValueSql("CURRENT_TIMESTAMP");

        entity.Property(e => e.Status)
              .HasDefaultValue("Registered");
    });
}
```

**Add DbSet to MeetingRequestsDbContext**:
```csharp
public class MeetingRequestsDbContext : DbContext
{
    // ... existing DbSets

    public DbSet<MeetingRequestPreRegistration> MeetingRequestPreRegistrations { get; set; }
}
```

---

## Database Migration Plan

### Migration Steps

**Step 1: Generate Migration**
```powershell
cd C:\Users\arath\my-project-today\src\server
dotnet ef migrations add AddPreRegistration --context MeetingRequestsDbContext
```

**Step 2: Review Generated Migration**
Verify migration file creates:
- Table `MeetingRequestPreRegistrations` with all columns
- Indexes on `MeetingRequestId` and composite `(MeetingRequestId, UserId)`
- Foreign key constraint to `MeetingRequests`

**Step 3: Apply Migration to Development Database**
```powershell
dotnet ef database update --context MeetingRequestsDbContext
```

**Step 4: Verify Migration Success**
```powershell
# Check table exists
sqlite3 meetingrequests.db ".schema MeetingRequestPreRegistrations"

# Check indexes
sqlite3 meetingrequests.db ".indexes MeetingRequestPreRegistrations"
```

### Expected Migration SQL (SQLite)

```sql
-- Create table
CREATE TABLE "MeetingRequestPreRegistrations" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_MeetingRequestPreRegistrations" PRIMARY KEY AUTOINCREMENT,
    "MeetingRequestId" INTEGER NOT NULL,
    "UserId" TEXT NOT NULL,
    "UserName" TEXT NOT NULL,
    "UserEmail" TEXT NULL,
    "RegisteredAt" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    "CancelledAt" TEXT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Registered',
    CONSTRAINT "FK_MeetingRequestPreRegistrations_MeetingRequests_MeetingRequestId" 
        FOREIGN KEY ("MeetingRequestId") 
        REFERENCES "MeetingRequests" ("Id") 
        ON DELETE RESTRICT
);

-- Create indexes
CREATE INDEX "IX_MeetingRequestPreRegistrations_MeetingRequestId" 
    ON "MeetingRequestPreRegistrations" ("MeetingRequestId");

CREATE INDEX "IX_MeetingRequestPreRegistrations_MeetingRequestId_UserId" 
    ON "MeetingRequestPreRegistrations" ("MeetingRequestId", "UserId");
```

### Migration Rollback Plan

**Rollback Command**:
```powershell
dotnet ef database update <PreviousMigrationName> --context MeetingRequestsDbContext
```

**Or remove migration entirely**:
```powershell
dotnet ef migrations remove --context MeetingRequestsDbContext
```

**Impact**: 
- Drops `MeetingRequestPreRegistrations` table
- Removes all pre-registration data (if any)
- No impact on existing `MeetingRequests` table

---

## Data Transfer Objects (DTOs)

### PreRegistrationDto

**Purpose**: API response format for pre-registration records

```csharp
namespace VibeCode.Server.Models.DTOs
{
    public class PreRegistrationDto
    {
        public int Id { get; set; }
        public int MeetingRequestId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime RegisteredAt { get; set; }
        public string Status { get; set; } = "Registered";
    }
}
```

**Usage**: 
- POST /api/meetingrequests/{id}/preregister response (201 Created)
- Includes userId for client-side duplicate detection

### PreRegistrationListItemDto

**Purpose**: Simplified format for registrants list (public view)

```csharp
namespace VibeCode.Server.Models.DTOs
{
    public class PreRegistrationListItemDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime RegisteredAt { get; set; }
    }
}
```

**Usage**: 
- GET /api/meetingrequests/{id}/preregistrations response
- Excludes userId (privacy consideration)

### MeetingRequestDto Extension

**Add Property**:
```csharp
public class MeetingRequestDto
{
    // ... existing properties (Id, Title, Description, etc.)

    // Add pre-registration count
    public int PreRegistrationCount { get; set; }
}
```

**Update Projection in MeetingRequestsController**:
```csharp
// In List and GetById endpoints
.Select(m => new MeetingRequestDto {
    // ... existing mappings
    PreRegistrationCount = m.PreRegistrations.Count() // Global filter applies (active only)
})
```

---

## Query Patterns

### Query Active Registrations for Meeting

```csharp
// Automatic - global query filter applies
var activeRegistrations = await _context.MeetingRequestPreRegistrations
    .Where(p => p.MeetingRequestId == meetingId)
    .ToListAsync();
// SQL: WHERE MeetingRequestId = @p0 AND CancelledAt IS NULL
```

### Query All Registrations (including cancelled)

```csharp
// Explicit - bypass global query filter
var allRegistrations = await _context.MeetingRequestPreRegistrations
    .IgnoreQueryFilters()
    .Where(p => p.MeetingRequestId == meetingId)
    .ToListAsync();
// SQL: WHERE MeetingRequestId = @p0 (no CancelledAt filter)
```

### Check if User is Registered

```csharp
// Automatic - global query filter applies
var isRegistered = await _context.MeetingRequestPreRegistrations
    .AnyAsync(p => p.MeetingRequestId == meetingId && p.UserId == userId);
// SQL: WHERE MeetingRequestId = @p0 AND UserId = @p1 AND CancelledAt IS NULL
```

### Count Active Registrations

```csharp
// Automatic - global query filter applies
var count = await _context.MeetingRequestPreRegistrations
    .CountAsync(p => p.MeetingRequestId == meetingId);
// SQL: SELECT COUNT(*) WHERE MeetingRequestId = @p0 AND CancelledAt IS NULL
```

### Get Registrations with User Info (for display)

```csharp
var registrations = await _context.MeetingRequestPreRegistrations
    .Where(p => p.MeetingRequestId == meetingId)
    .OrderByDescending(p => p.RegisteredAt)
    .Select(p => new PreRegistrationListItemDto {
        Id = p.Id,
        UserName = p.UserName,
        UserEmail = p.UserEmail,
        RegisteredAt = p.RegisteredAt
    })
    .ToListAsync();
// Returns most recent registrations first
```

---

## Soft-Delete Implementation

### Create Registration (POST)

```csharp
var registration = new MeetingRequestPreRegistration {
    MeetingRequestId = meetingId,
    UserId = userId,
    UserName = userName,
    UserEmail = userEmail,
    RegisteredAt = DateTime.UtcNow,
    CancelledAt = null, // Active registration
    Status = "Registered"
};
_context.MeetingRequestPreRegistrations.Add(registration);
await _context.SaveChangesAsync();
```

### Cancel Registration (DELETE) - Soft Delete

```csharp
var registration = await _context.MeetingRequestPreRegistrations
    .FirstOrDefaultAsync(p => p.MeetingRequestId == meetingId && p.UserId == userId);
    // Global filter applies - finds active registration only

if (registration != null) {
    registration.CancelledAt = DateTime.UtcNow;
    registration.Status = "Cancelled";
    await _context.SaveChangesAsync();
}
// Record remains in database, excluded from future queries by global filter
```

### Re-registration After Cancellation

User can re-register after cancelling:
1. Cancel: Sets `CancelledAt = DateTime.UtcNow` on existing record
2. Re-register: Creates **new** record with new `RegisteredAt` timestamp
3. Result: Multiple records per (MeetingRequestId, UserId), only one active (CancelledAt = NULL)
4. Audit trail: Complete history of registrations and cancellations preserved

---

## Data Validation Rules

### Backend Validation (API)

**Pre-register Request**:
- ✅ Meeting must exist (return 404 if not found)
- ✅ Meeting status must be "Announced" (return 400 if different status)
- ✅ User must be authenticated (401 if not)
- ✅ User must not have active registration (409 if duplicate)
- ✅ UserId must not be empty (400 if missing)
- ✅ UserName must not be empty (400 if missing)

**Cancel Request**:
- ✅ User must be authenticated (401 if not)
- ✅ Active registration must exist (404 if not found)
- ✅ Registration must belong to current user (403 if different user)

**List Request**:
- ✅ Meeting must exist (404 if not found)
- ✅ No authentication required for viewing list (public information)

### Frontend Validation

**Button Visibility**:
- Show pre-register button only if `meeting.status === "Announced"`
- Hide button for other statuses (Draft, Pending, Approved, Confirmed, Cancelled)

**Button State**:
- Disable button if user not authenticated
- Show "Registered" state if user has active registration
- Show "Pre-register" state if user not registered

**Error Handling**:
- Display error message for failed API calls
- Rollback optimistic UI updates on error
- Provide "Try Again" action

---

## Sample Data

### Example Registration Record

```json
{
  "id": 1,
  "meetingRequestId": 42,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userName": "John Doe",
  "userEmail": "john.doe@company.com",
  "registeredAt": "2026-02-14T10:30:00Z",
  "cancelledAt": null,
  "status": "Registered"
}
```

### Example Cancelled Record

```json
{
  "id": 2,
  "meetingRequestId": 42,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userName": "John Doe",
  "userEmail": "john.doe@company.com",
  "registeredAt": "2026-02-10T14:15:00Z",
  "cancelledAt": "2026-02-12T09:20:00Z",
  "status": "Cancelled"
}
```

### Example Re-registration (new record after cancellation)

```json
{
  "id": 5,
  "meetingRequestId": 42,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userName": "John Doe",
  "userEmail": "john.doe@company.com",
  "registeredAt": "2026-02-13T16:45:00Z",
  "cancelledAt": null,
  "status": "Registered"
}
```

**Note**: Records with id=2 and id=5 are both for the same user/meeting. Record #2 is cancelled, record #5 is active. Both preserved for audit trail.

---

## Performance Considerations

### Indexing Strategy

**Primary Index**: `Id` (clustered, auto-generated)
- Used for: Direct record lookup by registration ID

**Foreign Key Index**: `MeetingRequestId`
- Used for: List all registrations for a meeting (most common query)
- Query pattern: `WHERE MeetingRequestId = @p0`
- Expected cardinality: 0-100 registrations per meeting

**Composite Index**: `(MeetingRequestId, UserId)`
- Used for: Duplicate detection, check if user registered
- Query pattern: `WHERE MeetingRequestId = @p0 AND UserId = @p1`
- Benefits: Single index lookup instead of scan

### Query Optimization

**Count Calculation in DTO Projection**:
- Generated SQL: `(SELECT COUNT(*) FROM MeetingRequestPreRegistrations WHERE MeetingRequestId = m.Id AND CancelledAt IS NULL)`
- Executes as correlated subquery, optimized by SQLite query planner
- Performance: <5ms for typical dataset (10-50 registrations per meeting)

**Eager Loading vs Lazy Loading**:
- Avoid: `.Include(m => m.PreRegistrations)` in list queries (N+1 problem)
- Prefer: DTO projection with Count() subquery
- Exception: Detail view can eager load if displaying full list

### Scalability Limits

**Current Design Supports**:
- Up to 10,000 meetings with registrations
- Up to 500 registrations per meeting
- Up to 50,000 total registration records (active + cancelled)

**Performance Characteristics**:
- List meetings with counts: <100ms for 1000 meetings
- Get registrations for one meeting: <20ms for 100 registrations
- Check duplicate registration: <5ms (indexed lookup)
- Create registration: <10ms (INSERT with index updates)

---

## Data Model Summary

✅ **Entity created**: `MeetingRequestPreRegistration` with soft-delete support  
✅ **Relationship defined**: Many-to-one with `MeetingRequest`  
✅ **Indexes planned**: Primary key, foreign key, composite for duplicate detection  
✅ **Migration strategy**: Additive, reversible, zero downtime  
✅ **DTOs defined**: Full registration DTO and list item DTO  
✅ **Query patterns**: Active registrations (default), all registrations (explicit), user check, count  
✅ **Validation rules**: Backend and frontend validation documented  
✅ **Performance optimized**: Proper indexing, efficient queries, scalable design

**Next Step**: Generate API contracts and component interface specifications in `contracts/README.md`
