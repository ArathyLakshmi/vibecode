# Data Model: Board Meeting Request & Voting System

**Phase**: Phase 1 Design  
**Date**: 2026-02-07  
**Status**: Complete

## Entity Relationship Diagram (ERD)

```
┌─────────────────────┐
│      User           │
├─────────────────────┤
│ Id (PK)             │
│ Email (unique)      │
│ Name                │
│ Role                │
│ CreatedAt           │
└─────────────────────┘
         │
         │ creates/approves
         ▼
┌──────────────────────────────┐
│   MeetingRequest             │
├──────────────────────────────┤
│ Id (PK)                      │
│ RequestedByUserId (FK)       │
│ ProposedDate                 │
│ ProposedTime                 │
│ Location                     │
│ Agenda (nullable)            │
│ Status: enum                 │
│ RejectionReason (nullable)   │
│ CreatedAt                    │
│ UpdatedAt                    │
└──────────────────────────────┘
         │
         │ approved to
         ▼
┌──────────────────────────────┐
│      Meeting                 │
├──────────────────────────────┤
│ Id (PK)                      │
│ MeetingRequestId (FK)        │
│ ApprovedByUserId (FK)        │
│ ScheduledDate                │
│ ScheduledTime                │
│ Location                     │
│ Agenda                       │
│ Status: enum                 │
│ ConflictAcknowledged: bool   │
│ Notes (nullable)             │
│ ApprovedAt                   │
│ CreatedAt                    │
└──────────────────────────────┘
         │
         ├──────────────────────┬──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
    ┌─────────┐          ┌──────────────┐       ┌──────────────┐
    │Documents│          │ Votes        │       │Participants  │
    └─────────┘          └──────────────┘       └──────────────┘
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          ┌──────────────┐   ┌────────────────┐
          │VoteSubmission│   │DocumentAccess  │
          └──────────────┘   └────────────────┘
```

---

## Entity Definitions

### 1. User

**Purpose**: Represents all participants (internal users, SEC admins, external voters)

```csharp
public class User
{
    public Guid Id { get; set; }
    
    [Required, StringLength(255)]
    public string Email { get; set; } // Unique
    
    [Required, StringLength(255)]
    public string Name { get; set; }
    
    [Required]
    public UserRole Role { get; set; } // enum: RegularUser, SecAdmin, ExternalMember
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public ICollection<MeetingRequest> CreatedMeetingRequests { get; set; } = new List<MeetingRequest>();
    public ICollection<Meeting> ApprovedMeetings { get; set; } = new List<Meeting>();
    public ICollection<Document> UploadedDocuments { get; set; } = new List<Document>();
    public ICollection<VoteSubmission> VoteSubmissions { get; set; } = new List<VoteSubmission>();
    public ICollection<MeetingParticipant> ParticipatedMeetings { get; set; } = new List<MeetingParticipant>();
}

public enum UserRole
{
    RegularUser = 1,
    SecAdmin = 2,
    ExternalMember = 3
}
```

**Validation Rules**:
- Email must be valid format and unique across all users
- Name: 1-255 characters
- Role: Must be one of the three defined roles
- IsActive: Soft-delete support (when false, user cannot login but data preserved)

**Key Fields for Requirements**:
- FR-003: ApprovedMeetings relationship
- FR-017: VoteSubmissions relationship for audit trail

---

### 2. MeetingRequest

**Purpose**: Captures initial user request before SEC admin approval

```csharp
public class MeetingRequest
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid RequestedByUserId { get; set; }
    
    [Required]
    public DateTime ProposedDate { get; set; } // Date only (no time), stored as UTC
    
    [Required]
    public TimeSpan ProposedTime { get; set; } // Time only (e.g., 14:30:00)
    
    [Required, StringLength(500)]
    public string Location { get; set; }
    
    [StringLength(2000)]
    public string? Agenda { get; set; } // Optional user-provided agenda
    
    [Required]
    public MeetingRequestStatus Status { get; set; } = MeetingRequestStatus.Pending;
    
    [StringLength(1000)]
    public string? RejectionReason { get; set; } // Populated if rejected
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? RejectedAt { get; set; }
    
    // Navigation
    public User RequestedByUser { get; set; } = null!;
    public Meeting? ApprovedMeeting { get; set; } // 0..1 relationship
}

public enum MeetingRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}
```

**Validation Rules**:
- ProposedDate: Must be in the future (>= tomorrow)
- ProposedTime: Valid 24-hour format (00:00 to 23:59)
- Location: Non-empty, 1-500 characters
- Status transitions: Pending → Approved OR Pending → Rejected (no reverse transitions)
- RejectionReason: Required if Status = Rejected, must be 1-1000 characters

**Key Fields for Requirements**:
- FR-001: ProposedDate, ProposedTime, Location, Agenda
- FR-004: RejectionReason
- FR-005: User identity (RequestedByUserId) for notification
- FR-007: Date collision detection (query ProposedDate)

---

### 3. Meeting

**Purpose**: Scheduled meeting after SEC admin approval

```csharp
public class Meeting
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid MeetingRequestId { get; set; }
    
    [Required]
    public Guid ApprovedByUserId { get; set; }
    
    [Required]
    public DateTime ScheduledDate { get; set; } // UTC datetime
    
    [Required]
    public TimeSpan ScheduledTime { get; set; }
    
    [Required, StringLength(500)]
    public string Location { get; set; }
    
    [Required, StringLength(2000)]
    public string Agenda { get; set; }
    
    [Required]
    public MeetingStatus Status { get; set; } = MeetingStatus.Scheduled;
    
    public bool ConflictAcknowledged { get; set; } = false; // Set to true if SEC admin acknowledged date conflict
    
    [StringLength(2000)]
    public string? Notes { get; set; }
    
    public DateTime ApprovedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? CancelledAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public MeetingRequest MeetingRequest { get; set; } = null!;
    public User ApprovedByUser { get; set; } = null!;
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
    public ICollection<MeetingParticipant> Participants { get; set; } = new List<MeetingParticipant>();
}

public enum MeetingStatus
{
    Scheduled = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}
```

**Validation Rules**:
- ScheduledDate/ScheduledTime: Must match or be close to MeetingRequest proposed values
- Location: Required, 1-500 characters; can differ from request if edited during approval
- Agenda: Required, 1-2000 characters
- ConflictAcknowledged: Must be true before approval if date conflicts with other meetings (FR-007)
- Status transitions: Scheduled → InProgress, InProgress → Completed; Scheduled → Cancelled (any time)

**Key Fields for Requirements**:
- FR-003: Represents approved meeting
- FR-006: ScheduledDate, ScheduledTime, Location, Agenda displayed on dashboard
- FR-007: ConflictAcknowledged flag
- FR-008, FR-012: Parent for Documents and Votes

---

### 4. Document

**Purpose**: Statements, agendas, financial documents uploaded by users

```csharp
public class Document
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid MeetingId { get; set; }
    
    [Required]
    public Guid UploadedByUserId { get; set; }
    
    [Required, StringLength(255)]
    public string FileName { get; set; } // Original filename
    
    [Required, StringLength(50)]
    public string FileType { get; set; } // MIME type: application/pdf, application/vnd.ms-excel, etc.
    
    [Required]
    public long FileSizeBytes { get; set; }
    
    [Required, StringLength(1024)]
    public string BlobUri { get; set; } // URL to Azure Blob Storage
    
    [StringLength(1000)]
    public string? Description { get; set; } // User-provided description
    
    [StringLength(500)]
    public string? Tags { get; set; } // Comma-separated tags for organization
    
    public bool IsComplianceFlagged { get; set; } = false;
    
    [StringLength(500)]
    public string? ComplianceFlagReason { get; set; }
    
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public Meeting Meeting { get; set; } = null!;
    public User UploadedByUser { get; set; } = null!;
    public ICollection<DocumentAccess> AccessControls { get; set; } = new List<DocumentAccess>();
}
```

**Validation Rules**:
- FileName: Required, 1-255 characters; sanitized to prevent directory traversal
- FileType: Must be whitelisted (application/pdf, image/*, application/vnd.openxmlformats-officedocument.*)
- FileSizeBytes: Maximum 100MB (104857600 bytes)
- BlobUri: Must be valid Azure Blob Storage URL
- Description: Optional, 0-1000 characters
- Tags: Optional, comma-separated list
- IsComplianceFlagged: Read-only flag set by SEC admin
- ComplianceFlagReason: Required if IsComplianceFlagged = true

**Key Fields for Requirements**:
- FR-008, FR-009: UploadedByUserId, UploadedAt for audit trail
- FR-010: Description and tags for organization
- FR-011: AccessControls relationship for visibility restrictions
- FR-005 in related notifications: Document upload triggers archive event

---

### 5. DocumentAccess

**Purpose**: Fine-grained document visibility control (SEC admin restricts who sees which docs)

```csharp
public class DocumentAccess
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid DocumentId { get; set; }
    
    [Required]
    public Guid AllowedToUserId { get; set; } // User who can view this document
    
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Document Document { get; set; } = null!;
    public User AllowedToUser { get; set; } = null!;
}
```

**Validation Rules**:
- DocumentId: Must reference existing document
- AllowedToUserId: Must reference existing user
- Unique constraint: (DocumentId, AllowedToUserId) - prevent duplicate grants
- If no DocumentAccess records exist for a document, only the SEC admin and uploader can see it

**Key Fields for Requirements**:
- FR-011: Enables SEC admin to restrict document visibility per participant

---

### 6. Vote

**Purpose**: Binary Yes/No voting item created by SEC admin

```csharp
public class Vote
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid MeetingId { get; set; }
    
    [Required]
    public Guid CreatedByUserId { get; set; }
    
    [Required, StringLength(500)]
    public string Title { get; set; }
    
    [StringLength(2000)]
    public string? Description { get; set; }
    
    [Required]
    public DateTime VoteDeadline { get; set; } // UTC datetime when voting closes
    
    [Required]
    public VoteStatus Status { get; set; } = VoteStatus.Draft;
    
    // Results (populated after voting closes)
    public int YesCount { get; set; } = 0;
    public int NoCount { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? PublishedAt { get; set; }
    
    public DateTime? ClosedAt { get; set; } // Set when automatic closure occurs (deadline passes)
    
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public Meeting Meeting { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<MeetingParticipant> EligibleVoters { get; set; } = new List<MeetingParticipant>();
    public ICollection<VoteSubmission> Submissions { get; set; } = new List<VoteSubmission>();
}

public enum VoteStatus
{
    Draft = 1,        // Created but not shared
    VotingOpen = 2,   // Published, accepting votes before deadline
    Closed = 3        // Deadline passed, voting closed, results final
}
```

**Validation Rules**:
- Title: Required, 1-500 characters
- Description: Optional, 0-2000 characters
- VoteDeadline: Must be in the future (> DateTime.UtcNow)
- Status transitions: Draft → VotingOpen (publish), VotingOpen → Closed (deadline or manual), Draft → Closed (cancel)
- YesCount/NoCount: Read-only, calculated from VoteSubmission records
- Can only be published if EligibleVoters > 0

**Key Fields for Requirements**:
- FR-012: Automatic deadline closure via VoteDeadline
- FR-013: EligibleVoters relationship for sharing to participants
- FR-018: YesCount, NoCount for results display
- FR-022: VoteDeadline enforcement

---

### 7. VoteSubmission

**Purpose**: Individual vote cast by a member

```csharp
public class VoteSubmission
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid VoteId { get; set; }
    
    [Required]
    public Guid VoterId { get; set; } // User who cast the vote
    
    [Required]
    public VoteChoice Choice { get; set; } // Yes or No
    
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Vote Vote { get; set; } = null!;
    public User Voter { get; set; } = null!;
}

public enum VoteChoice
{
    Yes = 1,
    No = 2
}
```

**Validation Rules**:
- VoteId: Must reference existing Vote with Status = VotingOpen (cannot vote on Draft or Closed votes)
- VoterId: Must reference existing User in EligibleVoters for this vote
- Choice: Yes or No only
- Unique constraint: (VoteId, VoterId) - prevent duplicate votes from same user
- Can only submit if Vote.VoteDeadline > DateTime.UtcNow
- Once submitted, cannot be changed (FR-019)

**Key Fields for Requirements**:
- FR-017: VoterId and SubmittedAt for audit trail (100% logging requirement)
- FR-019: Immutability after submission (no UPDATE allowed on existing record)
- FR-021: VoteChoice used to calculate YesCount, NoCount

---

### 8. MeetingParticipant

**Purpose**: Link between Meeting and Users (who participates/votes)

```csharp
public class MeetingParticipant
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid MeetingId { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    public ParticipantRole Role { get; set; } = ParticipantRole.Attendee;
    
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Meeting Meeting { get; set; } = null!;
    public User User { get; set; } = null!;
}

public enum ParticipantRole
{
    Attendee = 1,
    Voter = 2,
    Organizer = 3
}
```

**Validation Rules**:
- MeetingId & UserId: Must reference existing records
- Unique constraint: (MeetingId, UserId) - one entry per participant
- Role indicates participation type (Attendee sees documents, Voter can vote, Organizer has admin rights for this meeting)

**Key Fields for Requirements**:
- FR-014: Used to filter eligible voters for vote sharing
- FR-016: Voter eligibility check

---

## Database Indexes

**Performance Optimization** (based on access patterns):

```sql
-- Meetings
CREATE INDEX IX_Meeting_MeetingRequestId ON Meetings(MeetingRequestId);
CREATE INDEX IX_Meeting_ScheduledDate ON Meetings(ScheduledDate) 
  WHERE Status IN (1, 2); -- Non-cancelled meetings for conflict checking

-- Documents
CREATE INDEX IX_Document_MeetingId ON Documents(MeetingId);
CREATE INDEX IX_Document_UploadedByUserId ON Documents(UploadedByUserId);

-- DocumentAccess
CREATE INDEX IX_DocumentAccess_DocumentId ON DocumentAccess(DocumentId);
CREATE INDEX IX_DocumentAccess_AllowedToUserId ON DocumentAccess(AllowedToUserId);

-- Votes
CREATE INDEX IX_Vote_MeetingId ON Votes(MeetingId);
CREATE INDEX IX_Vote_VoteDeadline ON Votes(VoteDeadline) 
  WHERE Status = 2; -- Only open votes need deadline monitoring

-- VoteSubmissions
CREATE INDEX IX_VoteSubmission_VoteId ON VoteSubmissions(VoteId);
CREATE INDEX IX_VoteSubmission_VoterId ON VoteSubmissions(VoterId);

-- MeetingParticipants
CREATE INDEX IX_MeetingParticipant_MeetingId ON MeetingParticipants(MeetingId);
CREATE INDEX IX_MeetingParticipant_UserId ON MeetingParticipants(UserId);
```

---

## Entity Auditing (Temporal Tables)

**Requirement**: FR-005, FR-017, SC-008 require 100% audit trail. Use SQL Server Temporal Tables:

```csharp
// In EF Core DbContext.OnModelCreating
modelBuilder.Entity<MeetingRequest>()
    .ToTable(tb => tb.IsTemporal(ttb =>
    {
        ttb.HasPeriodStart("SysStartTime");
        ttb.HasPeriodEnd("SysEndTime");
    }));

modelBuilder.Entity<Vote>()
    .ToTable(tb => tb.IsTemporal(/* same */));

modelBuilder.Entity<VoteSubmission>()
    .ToTable(tb => tb.IsTemporal(/* same */));
```

**Audit Trail Queries** (automatically maintained by SQL Server):
```sql
-- View all versions of a vote submission
SELECT * FROM VoteSubmissions FOR SYSTEM_TIME ALL WHERE VoterId = @id;

-- Audit trail: When was this vote submitted, by whom, and any updates
SELECT SysStartTime, SysEndTime, * FROM VoteSubmissions FOR SYSTEM_TIME ALL WHERE VoteId = @id;
```

---

## Summary

**Entities**: 8 core entities + enums  
**Relationships**: 13 FK relationships establishing clear data flow  
**Constraints**: Unique, temporal, cascading enforced at DB level  
**Scalability**: Indexed for 1000 concurrent users, 100+ meetings, 10,000+ documents  
**Compliance**: Temporal tables provide automatic audit trail per Principle I (Transparency & Governance Integrity)  
**Transactions**: ACID guarantees on vote submissions and meeting state changes

