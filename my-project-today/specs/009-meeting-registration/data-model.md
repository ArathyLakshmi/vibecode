# Data Model: Meeting Registration & Attendance

**Feature**: 009-meeting-registration  
**Date**: February 28, 2026

## Overview

This document defines the database schema, entities, and relationships for the meeting registration system.

## Entity Relationship Diagram

```
MeetingRequests (existing)
├── Id (PK)
├── ReferenceNumber
├── Title
├── MeetingDate
├── Status (Confirmed/Announced = registration enabled)
├── MaxAttendees (NEW - nullable)
└── RegistrationDeadlineMinutes (NEW - nullable, default 30)
    │
    └─── (1:N) ───┐
                  │
MeetingRegistrations (NEW)        │
├── Id (PK)                       │
├── MeetingRequestId (FK) ────────┘
├── UserEmail
├── UserName
├── RegistrationDate
├── Status (Confirmed/Waitlisted/Cancelled/Attended)
├── WaitlistPosition (nullable)
├── CancellationDate (nullable)
└── CancellationReason (nullable)
```

## Database Schema

### New Table: MeetingRegistrations

```sql
CREATE TABLE MeetingRegistrations (
    Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    MeetingRequestId INTEGER NOT NULL,
    UserEmail TEXT NOT NULL,
    UserName TEXT NOT NULL,
    RegistrationDate TEXT NOT NULL,  -- ISO 8601 format
    Status TEXT NOT NULL,             -- 'Confirmed', 'Waitlisted', 'Cancelled', 'Attended'
    WaitlistPosition INTEGER NULL,
    CancellationDate TEXT NULL,       -- ISO 8601 format
    CancellationReason TEXT NULL,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL,
    
    CONSTRAINT FK_MeetingRegistrations_MeetingRequests 
        FOREIGN KEY (MeetingRequestId) 
        REFERENCES MeetingRequests (Id) 
        ON DELETE CASCADE,
    
    CONSTRAINT UQ_MeetingRegistrations_MeetingUser 
        UNIQUE (MeetingRequestId, UserEmail),
    
    CONSTRAINT CK_MeetingRegistrations_Status 
        CHECK (Status IN ('Confirmed', 'Waitlisted', 'Cancelled', 'Attended')),
    
    CONSTRAINT CK_MeetingRegistrations_WaitlistPosition 
        CHECK (WaitlistPosition IS NULL OR WaitlistPosition > 0)
);

-- Indexes for query performance
CREATE INDEX IX_MeetingRegistrations_MeetingRequestId 
    ON MeetingRegistrations(MeetingRequestId);

CREATE INDEX IX_MeetingRegistrations_UserEmail 
    ON MeetingRegistrations(UserEmail);

CREATE INDEX IX_MeetingRegistrations_Status 
    ON MeetingRegistrations(Status);

CREATE INDEX IX_MeetingRegistrations_WaitlistPosition 
    ON MeetingRegistrations(WaitlistPosition) 
    WHERE WaitlistPosition IS NOT NULL;
```

### Modified Table: MeetingRequests

```sql
-- Add columns to existing MeetingRequests table
ALTER TABLE MeetingRequests 
    ADD COLUMN MaxAttendees INTEGER NULL;

ALTER TABLE MeetingRequests 
    ADD COLUMN RegistrationDeadlineMinutes INTEGER NULL DEFAULT 30;

-- No index needed - capacity check is infrequent
```

## Entity Models (C# - Entity Framework Core)

### MeetingRegistration.cs

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VibeCode.Server.Models
{
    public class MeetingRegistration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MeetingRequestId { get; set; }

        [Required]
        [MaxLength(255)]
        [EmailAddress]
        public string UserEmail { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        public DateTime RegistrationDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Confirmed";

        public int? WaitlistPosition { get; set; }

        public DateTime? CancellationDate { get; set; }

        [MaxLength(1000)]
        public string? CancellationReason { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(MeetingRequestId))]
        public virtual MeetingRequest? MeetingRequest { get; set; }
    }

    // Enum for type safety
    public static class RegistrationStatus
    {
        public const string Confirmed = "Confirmed";
        public const string Waitlisted = "Waitlisted";
        public const string Cancelled = "Cancelled";
        public const string Attended = "Attended";
    }
}
```

### MeetingRequest.cs (additions)

```csharp
// Add to existing MeetingRequest class

public int? MaxAttendees { get; set; }

public int? RegistrationDeadlineMinutes { get; set; } = 30;

// Navigation property
public virtual ICollection<MeetingRegistration> Registrations { get; set; } 
    = new List<MeetingRegistration>();

// Computed properties (not mapped to DB)
[NotMapped]
public int RegisteredCount => Registrations?
    .Count(r => r.Status == RegistrationStatus.Confirmed) ?? 0;

[NotMapped]
public int WaitlistedCount => Registrations?
    .Count(r => r.Status == RegistrationStatus.Waitlisted) ?? 0;

[NotMapped]
public bool IsCapacityReached => MaxAttendees.HasValue 
    && RegisteredCount >= MaxAttendees.Value;

[NotMapped]
public bool IsRegistrationOpen => 
    (Status == "Confirmed" || Status == "Announced") &&
    DateTime.UtcNow < MeetingDate.AddMinutes(-(RegistrationDeadlineMinutes ?? 30));
```

### AppDbContext.cs (additions)

```csharp
public DbSet<MeetingRegistration> MeetingRegistrations { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Configure MeetingRegistration entity
    modelBuilder.Entity<MeetingRegistration>(entity =>
    {
        entity.ToTable("MeetingRegistrations");
        
        // Unique constraint
        entity.HasIndex(e => new { e.MeetingRequestId, e.UserEmail })
              .IsUnique()
              .HasDatabaseName("UQ_MeetingRegistrations_MeetingUser");
        
        // Foreign key
        entity.HasOne(e => e.MeetingRequest)
              .WithMany(m => m.Registrations)
              .HasForeignKey(e => e.MeetingRequestId)
              .OnDelete(DeleteBehavior.Cascade);
        
        // Indexes
        entity.HasIndex(e => e.MeetingRequestId);
        entity.HasIndex(e => e.UserEmail);
        entity.HasIndex(e => e.Status);
        
        // Check constraints (SQLite syntax)
        entity.ToTable(t => t.HasCheckConstraint(
            "CK_MeetingRegistrations_Status",
            "[Status] IN ('Confirmed', 'Waitlisted', 'Cancelled', 'Attended')"
        ));
    });
}
```

## Data Transfer Objects (DTOs)

### RegistrationRequestDto.cs

```csharp
public class RegistrationRequestDto
{
    [Required]
    public int MeetingRequestId { get; set; }
    
    // User info populated from authentication context on server
    // No need to send from client
}
```

### RegistrationResponseDto.cs

```csharp
public class RegistrationResponseDto
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? WaitlistPosition { get; set; }
    public DateTime? CancellationDate { get; set; }
    public string? CancellationReason { get; set; }
}
```

### AttendeeDto.cs

```csharp
public class AttendeeDto
{
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? WaitlistPosition { get; set; }
}
```

### CapacityInfoDto.cs

```csharp
public class CapacityInfoDto
{
    public int? MaxAttendees { get; set; }
    public int RegisteredCount { get; set; }
    public int WaitlistedCount { get; set; }
    public int AvailableSpots => MaxAttendees.HasValue 
        ? Math.Max(0, MaxAttendees.Value - RegisteredCount) 
        : int.MaxValue;
    public bool IsCapacityReached => MaxAttendees.HasValue 
        && RegisteredCount >= MaxAttendees.Value;
    public bool IsRegistrationOpen { get; set; }
    public DateTime? RegistrationDeadline { get; set; }
}
```

### MyRegistrationDto.cs

```csharp
public class MyRegistrationDto
{
    public int RegistrationId { get; set; }
    public int MeetingRequestId { get; set; }
    public string MeetingTitle { get; set; } = string.Empty;
    public string MeetingReferenceNumber { get; set; } = string.Empty;
    public DateTime MeetingDate { get; set; }
    public string MeetingStatus { get; set; } = string.Empty;
    public string RegistrationStatus { get; set; } = string.Empty;
    public int? WaitlistPosition { get; set; }
    public DateTime RegistrationDate { get; set; }
    public bool CanCancel { get; set; }
}
```

## Validation Rules

### Registration Creation
- ✅ User must be authenticated (validated via MSAL)
- ✅ Meeting status must be "Confirmed" or "Announced"
- ✅ Registration deadline not passed (MeetingDate - RegistrationDeadlineMinutes > Now)
- ✅ User not already registered (UNIQUE constraint enforces)
- ✅ UserEmail format valid (EmailAddress attribute)

### Capacity Enforcement
- ✅ If MaxAttendees is NULL, registration always sets Status="Confirmed"
- ✅ If RegisteredCount < MaxAttendees, Status="Confirmed"
- ✅ If RegisteredCount >= MaxAttendees, Status="Waitlisted", WaitlistPosition=next available

### Cancellation
- ✅ Registration must exist and belong to authenticated user
- ✅ Status must be "Confirmed" or "Waitlisted" (can't cancel "Cancelled" or "Attended")
- ✅ Meeting date not passed (cancellation only before meeting)
- ✅ Set Status="Cancelled", CancellationDate=Now

### Waitlist Promotion
- ✅ Triggered on cancellation when Status="Confirmed"
- ✅ Select top 1 registration WHERE Status="Waitlisted" ORDER BY WaitlistPosition ASC
- ✅ Update promoted: Status="Confirmed", WaitlistPosition=NULL
- ✅ Recalculate remaining waitlist positions (decrement by 1)

## Data Lifecycle

### State Transitions

```
Registration Flow:
┌─────────────┐
│  Register   │
└──────┬──────┘
       │
       ├──── Capacity available ───► Status: Confirmed
       │
       └──── Capacity full ────────► Status: Waitlisted
                                     WaitlistPosition: N

Confirmed State:
┌───────────┐
│ Confirmed │
└─────┬─────┘
      │
      ├──── User cancels ─────────► Status: Cancelled
      │
      └──── Meeting date passes ──► Status: Attended

Waitlisted State:
┌────────────┐
│ Waitlisted │
└──────┬─────┘
       │
       ├──── Spot available ───────► Status: Confirmed (auto-promoted)
       │
       ├──── User cancels ─────────► Status: Cancelled
       │
       └──── Meeting date passes ──► Status: Attended (if not promoted)
```

### Data Retention
- Registrations with Status="Attended" retained for 90 days post-meeting (reporting)
- Registrations with Status="Cancelled" retained for 30 days (audit trail)
- Meeting deletion cascades to registrations (ON DELETE CASCADE)

## Query Patterns

### Common Queries

**Get registration for specific user and meeting:**
```sql
SELECT * FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId 
  AND UserEmail = @userEmail
  AND Status IN ('Confirmed', 'Waitlisted');
```

**Get attendee list for meeting:**
```sql
SELECT UserName, UserEmail, RegistrationDate, Status, WaitlistPosition
FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId
  AND Status IN ('Confirmed', 'Waitlisted')
ORDER BY 
  CASE WHEN Status = 'Confirmed' THEN 0 ELSE 1 END,
  WaitlistPosition NULLS LAST,
  RegistrationDate;
```

**Get user's registrations:**
```sql
SELECT mr.*, m.Title, m.ReferenceNumber, m.MeetingDate, m.Status as MeetingStatus
FROM MeetingRegistrations mr
INNER JOIN MeetingRequests m ON mr.MeetingRequestId = m.Id
WHERE mr.UserEmail = @userEmail
  AND mr.Status IN ('Confirmed', 'Waitlisted')
  AND m.MeetingDate >= @now
ORDER BY m.MeetingDate;
```

**Get next waitlisted user for promotion:**
```sql
SELECT * FROM MeetingRegistrations
WHERE MeetingRequestId = @meetingId
  AND Status = 'Waitlisted'
ORDER BY WaitlistPosition ASC
LIMIT 1;
```

**Get capacity info:**
```sql
SELECT 
  m.MaxAttendees,
  COUNT(CASE WHEN r.Status = 'Confirmed' THEN 1 END) as RegisteredCount,
  COUNT(CASE WHEN r.Status = 'Waitlisted' THEN 1 END) as WaitlistedCount
FROM MeetingRequests m
LEFT JOIN MeetingRegistrations r ON m.Id = r.MeetingRequestId
WHERE m.Id = @meetingId
GROUP BY m.Id, m.MaxAttendees;
```

## Migration Script

### EF Core Migration

```csharp
using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddMeetingRegistrations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add columns to MeetingRequests
        migrationBuilder.AddColumn<int>(
            name: "MaxAttendees",
            table: "MeetingRequests",
            type: "INTEGER",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "RegistrationDeadlineMinutes",
            table: "MeetingRequests",
            type: "INTEGER",
            nullable: true,
            defaultValue: 30);

        // Create MeetingRegistrations table
        migrationBuilder.CreateTable(
            name: "MeetingRegistrations",
            columns: table => new
            {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                MeetingRequestId = table.Column<int>(type: "INTEGER", nullable: false),
                UserEmail = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                UserName = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                RegistrationDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                WaitlistPosition = table.Column<int>(type: "INTEGER", nullable: true),
                CancellationDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                CancellationReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_MeetingRegistrations", x => x.Id);
                table.ForeignKey(
                    name: "FK_MeetingRegistrations_MeetingRequests",
                    column: x => x.MeetingRequestId,
                    principalTable: "MeetingRequests",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.CheckConstraint(
                    "CK_MeetingRegistrations_Status",
                    "[Status] IN ('Confirmed', 'Waitlisted', 'Cancelled', 'Attended')");
            });

        // Create indexes
        migrationBuilder.CreateIndex(
            name: "IX_MeetingRegistrations_MeetingRequestId",
            table: "MeetingRegistrations",
            column: "MeetingRequestId");

        migrationBuilder.CreateIndex(
            name: "IX_MeetingRegistrations_UserEmail",
            table: "MeetingRegistrations",
            column: "UserEmail");

        migrationBuilder.CreateIndex(
            name: "IX_MeetingRegistrations_Status",
            table: "MeetingRegistrations",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "UQ_MeetingRegistrations_MeetingUser",
            table: "MeetingRegistrations",
            columns: new[] { "MeetingRequestId", "UserEmail" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "MeetingRegistrations");

        migrationBuilder.DropColumn(
            name: "MaxAttendees",
            table: "MeetingRequests");

        migrationBuilder.DropColumn(
            name: "RegistrationDeadlineMinutes",
            table: "MeetingRequests");
    }
}
```

## Summary

- **New Table**: MeetingRegistrations with 10 columns, 4 indexes, 2 constraints
- **Modified Table**: MeetingRequests adds 2 capacity-related columns
- **Relationships**: 1:N (Meeting -> Registrations), enforced by FK with CASCADE delete
- **Constraints**: Unique user-meeting pair, Status enum validation, Positive waitlist position
- **Performance**: Indexed on MeetingRequestId, UserEmail, Status for optimal query speed

**Next**: [contracts/](contracts/) for API endpoint specifications
