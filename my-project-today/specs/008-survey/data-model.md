# Data Model: Survey Component

**Phase**: 1 (Design & Contracts)  
**Date**: February 18, 2026  
**Status**: Complete

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for the survey component feature. The schema integrates with the existing MeetingRequestsDbContext and follows established EF Core patterns.

## Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│          USER (existing)            │
│─────────────────────────────────────│
│ Id: string (PK)                     │
│ Email: string                       │
│ Name: string                        │
└────────────────┬────────────────────┘
                 │ 1:N (CreatedBy)
                 │
┌────────────────▼────────────────────┐
│             SURVEY                  │
│─────────────────────────────────────│
│ Id: int (PK, auto)                  │
│ Title: string (required, max 200)   │
│ Description: string (max 2000)      │
│ Status: enum (Draft/Active/Inactive)│
│ CreatedBy: string (FK → User.Id)    │
│ CreatedAt: DateTime (UTC)           │
│ PublishedAt: DateTime? (UTC)        │
└────────────────┬────────────────────┘
                 │ 1:N
                 │
┌────────────────▼────────────────────┐
│            QUESTION                 │
│─────────────────────────────────────│
│ Id: int (PK, auto)                  │
│ SurveyId: int (FK → Survey.Id)      │
│ QuestionText: string (required, 500)│
│ Type: enum (Text/MultipleChoice/    │
│              Rating)                │
│ IsRequired: bool                    │
│ Order: int (1-20)                   │
│ OptionsJson: string? (JSON array)   │
└─────────────────────────────────────┘
                 │ 1:N
                 ▼
┌─────────────────────────────────────┐
│        SURVEY_RESPONSE              │
│─────────────────────────────────────│
│ Id: int (PK, auto)                  │
│ SurveyId: int (FK → Survey.Id)      │
│ UserId: string? (FK → User.Id)      │
│   (null = anonymous)                │
│ SubmittedAt: DateTime (UTC)         │
│ UNIQUE(SurveyId, UserId) where      │
│   UserId IS NOT NULL                │
└────────────────┬────────────────────┘
                 │ 1:N
                 │
┌────────────────▼────────────────────┐
│       QUESTION_RESPONSE             │
│─────────────────────────────────────│
│ Id: int (PK, auto)                  │
│ SurveyResponseId: int (FK)          │
│ QuestionId: int (FK → Question.Id)  │
│ AnswerText: string? (max 2000)      │
│   (for Text questions)              │
│ AnswerOption: string?               │
│   (for MultipleChoice)              │
│ AnswerRating: int?                  │
│   (for Rating, 1-5)                 │
└─────────────────────────────────────┘
```

## Entity Definitions

### Survey

Primary entity representing a survey with metadata and lifecycle status.

```csharp
public class Survey
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SurveyStatus Status { get; set; } = SurveyStatus.Draft;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    
    // Navigation properties
    public List<Question> Questions { get; set; } = new();
    public List<SurveyResponse> Responses { get; set; } = new();
}

public enum SurveyStatus
{
    Draft = 0,
    Active = 1,
    Inactive = 2
}
```

**Validation Rules**:

| Field | Rule | Error Message |
|-------|------|---------------|
| Title | Required, max 200 chars | "Title is required" / "Title max 200 characters" |
| Description | Max 2000 chars | "Description max 2000 characters" |
| Status | Valid enum value | "Invalid status" |
| CreatedBy | Required | "CreatedBy is required" |
| Questions | Min 1 question to publish | "Survey must have at least 1 question" |

**Business Rules**:
- Draft surveys can be edited freely
- Active surveys cannot be edited (only unpublished to Inactive)
- Inactive surveys cannot be deleted if responses exist
- Draft surveys with no responses can be deleted

---

### Question

Represents a single question within a survey, supporting three question types.

```csharp
public class Question
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType Type { get; set; }
    public bool IsRequired { get; set; }
    public int Order { get; set; }
    public string? OptionsJson { get; set; }
    
    // Navigation properties
    public Survey Survey { get; set; } = null!;
    public List<QuestionResponse> QuestionResponses { get; set; } = new();
}

public enum QuestionType
{
    Text = 0,           // Open-ended text
    MultipleChoice = 1, // Single-select from options
    Rating = 2          // 1-5 star rating
}
```

**Validation Rules**:

| Field | Rule | Error Message |
|-------|------|---------------|
| QuestionText | Required, max 500 chars | "Question text is required" / "Max 500 characters" |
| Type | Valid enum (0-2) | "Invalid question type" |
| Order | 1-20, unique within survey | "Order must be 1-20" / "Duplicate order" |
| OptionsJson | Required if Type=MultipleChoice, 2-10 options | "Multiple choice needs 2-10 options" |

**OptionsJson Format** (for MultipleChoice):
```json
["Option 1", "Option 2", "Option 3"]
```

**Business Rules**:
- Questions cannot be modified after survey is published
- Order determines display sequence (1 = first, 20 = last)
- Maximum 20 questions per survey (enforced in API)
- MultipleChoice must have 2-10 options
- Rating questions always use 1-5 scale (not configurable)

---

### SurveyResponse

Represents a user's submission to a survey (one response per user per survey, except anonymous).

```csharp
public class SurveyResponse
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string? UserId { get; set; }
    public DateTime SubmittedAt { get; set; }
    
    // Navigation properties
    public Survey Survey { get; set; } = null!;
    public List<QuestionResponse> QuestionResponses { get; set; } = new();
}
```

**Validation Rules**:

| Field | Rule | Error Message |
|-------|------|---------------|
| SurveyId | Valid survey ID, Active status | "Survey not found" / "Survey not active" |
| UserId | Valid user ID or null | "Invalid user" |
| QuestionResponses | Must answer all required questions | "Required question not answered" |

**Database Constraints**:
```sql
-- Unique constraint: prevent duplicate responses from same user
CREATE UNIQUE INDEX IX_SurveyResponses_SurveyId_UserId 
  ON SurveyResponses (SurveyId, UserId) 
  WHERE UserId IS NOT NULL;

-- Foreign key constraints
ALTER TABLE SurveyResponses 
  ADD CONSTRAINT FK_SurveyResponses_Surveys 
  FOREIGN KEY (SurveyId) REFERENCES Surveys(Id) ON DELETE CASCADE;
```

**Business Rules**:
- Authenticated users can only submit once per survey (enforced by unique index)
- Anonymous users (UserId = null) can submit multiple times
- Responses are immutable after submission (no editing)
- Deleting a survey cascades to delete all responses
- Maximum 500 responses per survey (enforced in API)

---

### QuestionResponse

Represents a single answer to a single question within a survey response.

```csharp
public class QuestionResponse
{
    public int Id { get; set; }
    public int SurveyResponseId { get; set; }
    public int QuestionId { get; set; }
    public string? AnswerText { get; set; }
    public string? AnswerOption { get; set; }
    public int? AnswerRating { get; set; }
    
    // Navigation properties
    public SurveyResponse SurveyResponse { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
```

**Validation Rules**:

| Field | Rule | Error Message |
|-------|------|---------------|
| AnswerText | Max 2000 chars, required if Type=Text | "Answer max 2000 characters" |
| AnswerOption | Required if Type=MultipleChoice, must match OptionsJson | "Invalid option selected" |
| AnswerRating | 1-5, required if Type=Rating | "Rating must be 1-5" |

**Field Usage by Question Type**:

| Question Type | AnswerText | AnswerOption | AnswerRating |
|---------------|-----------|--------------|--------------|
| Text          | ✅ Used   | ❌ Null      | ❌ Null      |
| MultipleChoice| ❌ Null   | ✅ Used      | ❌ Null      |
| Rating        | ❌ Null   | ❌ Null      | ✅ Used      |

**Business Rules**:
- Exactly one answer field must be non-null per response (based on question type)
- Required questions must have a QuestionResponse record
- Optional questions can be skipped (no QuestionResponse record)

---

## State Transitions

### Survey Lifecycle

```
┌───────────────────────────────────────────────────────────┐
│                     Survey States                          │
└───────────────────────────────────────────────────────────┘

    Draft                Active               Inactive
      │                    │                     │
      │ [Publish]          │                     │
      ├───────────────────►│                     │
      │                    │                     │
      │                    │ [Unpublish]         │
      │                    ├────────────────────►│
      │                    │                     │
      └──[Delete]          │                     │
        (if 0 responses)   │                     │
                           │                     │
                      Cannot Delete         Cannot Delete
                    (has responses)       (has responses)
```

**Transition Rules**:

| From    | To       | Action     | Validation |
|---------|----------|------------|------------|
| Draft   | Active   | Publish    | ≥1 question, all questions valid |
| Active  | Inactive | Unpublish  | None |
| Draft   | (deleted)| Delete     | 0 responses |
| Active  | (deleted)| Delete     | ❌ Forbidden |
| Inactive| (deleted)| Delete     | ❌ Forbidden |

---

## Database Migration

**Migration Name**: `20260218_AddSurveyTables`

```csharp
public partial class AddSurveyTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Surveys",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Title = table.Column<string>(maxLength: 200, nullable: false),
                Description = table.Column<string>(maxLength: 2000, nullable: false),
                Status = table.Column<int>(nullable: false),
                CreatedBy = table.Column<string>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false),
                PublishedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Surveys", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Questions",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                SurveyId = table.Column<int>(nullable: false),
                QuestionText = table.Column<string>(maxLength: 500, nullable: false),
                Type = table.Column<int>(nullable: false),
                IsRequired = table.Column<bool>(nullable: false),
                Order = table.Column<int>(nullable: false),
                OptionsJson = table.Column<string>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Questions", x => x.Id);
                table.ForeignKey(
                    name: "FK_Questions_Surveys_SurveyId",
                    column: x => x.SurveyId,
                    principalTable: "Surveys",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "SurveyResponses",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                SurveyId = table.Column<int>(nullable: false),
                UserId = table.Column<string>(nullable: true),
                SubmittedAt = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SurveyResponses", x => x.Id);
                table.ForeignKey(
                    name: "FK_SurveyResponses_Surveys_SurveyId",
                    column: x => x.SurveyId,
                    principalTable: "Surveys",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "QuestionResponses",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                SurveyResponseId = table.Column<int>(nullable: false),
                QuestionId = table.Column<int>(nullable: false),
                AnswerText = table.Column<string>(maxLength: 2000, nullable: true),
                AnswerOption = table.Column<string>(nullable: true),
                AnswerRating = table.Column<int>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionResponses", x => x.Id);
                table.ForeignKey(
                    name: "FK_QuestionResponses_SurveyResponses_SurveyResponseId",
                    column: x => x.SurveyResponseId,
                    principalTable: "SurveyResponses",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_QuestionResponses_Questions_QuestionId",
                    column: x => x.QuestionId,
                    principalTable: "Questions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        // Unique index: prevent duplicate responses from same user
        migrationBuilder.CreateIndex(
            name: "IX_SurveyResponses_SurveyId_UserId",
            table: "SurveyResponses",
            columns: new[] { "SurveyId", "UserId" },
            unique: true,
            filter: "UserId IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_Questions_SurveyId",
            table: "Questions",
            column: "SurveyId");

        migrationBuilder.CreateIndex(
            name: "IX_SurveyResponses_SurveyId",
            table: "SurveyResponses",
            column: "SurveyId");

        migrationBuilder.CreateIndex(
            name: "IX_QuestionResponses_SurveyResponseId",
            table: "QuestionResponses",
            column: "SurveyResponseId");

        migrationBuilder.CreateIndex(
            name: "IX_QuestionResponses_QuestionId",
            table: "QuestionResponses",
            column: "QuestionId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "QuestionResponses");
        migrationBuilder.DropTable(name: "SurveyResponses");
        migrationBuilder.DropTable(name: "Questions");
        migrationBuilder.DropTable(name: "Surveys");
    }
}
```

---

## DbContext Configuration

Update `MeetingRequestsDbContext.cs`:

```csharp
public class MeetingRequestsDbContext : DbContext
{
    // Existing DbSets
    public DbSet<MeetingRequest> MeetingRequests { get; set; } = null!;
    public DbSet<MeetingRequestAudit> MeetingRequestAudits { get; set; } = null!;
    public DbSet<MeetingRequestAttachment> MeetingRequestAttachments { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    
    // New DbSets for surveys
    public DbSet<Survey> Surveys { get; set; } = null!;
    public DbSet<Question> Questions { get; set; } = null!;
    public DbSet<SurveyResponse> SurveyResponses { get; set; } = null!;
    public DbSet<QuestionResponse> QuestionResponses { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // ... existing configuration ...
        
        // Survey configuration
        modelBuilder.Entity<Survey>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.HasMany(e => e.Questions)
                .WithOne(q => q.Survey)
                .HasForeignKey(q => q.SurveyId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Responses)
                .WithOne(r => r.Survey)
                .HasForeignKey(r => r.SurveyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Question configuration
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QuestionText).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.SurveyId);
        });

        // SurveyResponse configuration
        modelBuilder.Entity<SurveyResponse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SurveyId, e.UserId })
                .IsUnique()
                .HasFilter("UserId IS NOT NULL");
            entity.HasMany(e => e.QuestionResponses)
                .WithOne(qr => qr.SurveyResponse)
                .HasForeignKey(qr => qr.SurveyResponseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // QuestionResponse configuration
        modelBuilder.Entity<QuestionResponse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AnswerText).HasMaxLength(2000);
            entity.HasIndex(e => e.SurveyResponseId);
            entity.HasIndex(e => e.QuestionId);
        });
    }
}
```

---

## Summary

**Entities**: 4 new entities (Survey, Question, SurveyResponse, QuestionResponse)  
**Relationships**: 1:N Survey→Questions, 1:N Survey→Responses, 1:N Response→QuestionResponses  
**Enums**: 2 enums (SurveyStatus, QuestionType)  
**Constraints**: Unique index on (SurveyId, UserId) for duplicate prevention  
**Cascade Deletes**: Survey deletion cascades to Questions and Responses  
**Validation**: Field-level (max lengths, required) + business rules (min 1 question, response limits)

**Ready for Contracts**: Data model is complete and ready for API contract generation.
