# Research: Survey Component

**Phase**: 0 (Outline & Research)  
**Date**: February 18, 2026  
**Status**: Complete

## Purpose

This document resolves all "NEEDS CLARIFICATION" items from the technical context and provides best practices research for implementing the survey component feature within the Unified Board Solutions application.

## Research Tasks

All unknowns from Technical Context were already resolved during planning. No clarifications marked as "NEEDS CLARIFICATION". This research document focuses on best practices and integration patterns.

## Findings

### 1. Database Schema Design for Survey Questions with Multiple Types

**Decision**: Polymorphic question storage with JSON options column

**Rationale**:
- SQLite supports JSON1 extension for flexible schema
- EF Core 8.0 supports JSON columns natively via `.ToJson()` configuration
- Existing project uses SQLite, maintaining consistency

**Alternatives Considered**:
- **Table-per-type (QuestionText, QuestionMultipleChoice, QuestionRating)**: Rejected due to complexity (3 tables + joins), over-engineering for 3 simple types
- **Entity-Attribute-Value pattern**: Rejected due to poor query performance and lack of type safety
- **Single table with nullable columns**: Considered but JSON is cleaner for options array

**Implementation Pattern**:
```csharp
public class Question
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType Type { get; set; } // Enum: Text, MultipleChoice, Rating
    public bool IsRequired { get; set; }
    public int Order { get; set; }
    public string? OptionsJson { get; set; } // JSON array for multiple choice: ["Option 1", "Option 2"]
}

public enum QuestionType
{
    Text = 0,
    MultipleChoice = 1,
    Rating = 2
}
```

**References**:
- EF Core JSON Columns: https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-7.0/whatsnew#json-columns
- Existing pattern: MeetingRequestsDbContext uses standard EF Core column strings

---

### 2. Fluent UI Component Selection for Survey Forms

**Decision**: Use Fluent UI v9 components (existing dependency)

**Rationale**:
- Project already uses `@fluentui/react-components@9.72.11`
- Consistent with MeetingRequestForm pattern
- Components needed: TextField, Dropdown, Rating, RadioGroup, Button, MessageBar

**Component Mapping**:

| Survey Element | Fluent UI Component | Props |
|----------------|---------------------|-------|
| Text question response | `<Textarea />` | `rows={3}`, `maxLength={2000}`, `resize="vertical"` |
| Multiple choice response | `<RadioGroup />` | `layout="vertical"` with `<Radio />` children |
| Rating question response | `<Rating />` | `max={5}`, `iconSize={32}` |
| Create question form | `<Field />` + `<Input />` | `required={true}` for validation |
| Question type selector | `<Dropdown />` | Options: Text, Multiple Choice, Rating |
| Submit button | `<Button />` | `appearance="primary"`, `disabled={submitting}` |
| Success/error messages | `<MessageBar />` | `intent="success"` or `intent="error"` |

**Alternatives Considered**:
- **Custom components**: Rejected to maintain design consistency
- **HTML inputs**: Rejected for inconsistent styling

**References**:
- Existing: src/client/src/components/MeetingRequestForm.jsx (lines 5-17)
- Fluent UI Docs: https://react.fluentui.dev/

---

### 3. Duplicate Response Prevention Strategy

**Decision**: Database unique constraint + application-level check

**Rationale**:
- Prevent database-level duplicates via constraint
- Application check provides user-friendly error message
- Follows existing pattern (meeting request duplicate detection)

**Implementation**:
```csharp
// Database migration
migrationBuilder.CreateIndex(
    name: "IX_SurveyResponses_SurveyId_UserId",
    table: "SurveyResponses",
    columns: new[] { "SurveyId", "UserId" },
    unique: true,
    filter: "UserId IS NOT NULL"); // Allow multiple anonymous responses

// Controller check
var existingResponse = await _db.SurveyResponses
    .FirstOrDefaultAsync(r => r.SurveyId == surveyId 
        && r.UserId == currentUserId 
        && r.UserId != null);
if (existingResponse != null)
{
    return BadRequest(new { error = "You have already responded to this survey" });
}
```

**Anonymous Responses**:
- No duplicate prevention (UserId is null)
- Accept multiple anonymous responses per survey
- Rationale: Cannot identify anonymous users, feature requirement allows this

**Alternatives Considered**:
- **IP-based tracking**: Rejected due to privacy concerns and unreliability (shared IPs, VPNs)
- **Session-based tracking**: Rejected as sessions expire, user could respond again
- **Application-level only**: Rejected as race conditions could allow duplicates

**References**:
- Existing pattern: MeetingRequestsController.cs duplicate detection (line 42-46)

---

### 4. Aggregation Strategy for Survey Results

**Decision**: Calculate aggregates on-demand in API layer

**Rationale**:
- v1 limit: 500 responses per survey (acceptable performance for on-demand calculation)
- Simpler implementation (no background jobs or materialized views)
- Results always current (no stale pre-computed values)

**Performance Analysis**:
- 500 responses × 20 questions = 10,000 QuestionResponse records max
- SQLite can aggregate 10K records in <100ms on modern hardware
- Meets SC-003: Display results for 100 responses in <2 seconds

**Implementation**:
```csharp
// Multiple choice aggregation
var questionResults = await _db.QuestionResponses
    .Where(qr => qr.Question.SurveyId == surveyId 
        && qr.Question.Type == QuestionType.MultipleChoice)
    .GroupBy(qr => new { qr.QuestionId, qr.AnswerText })
    .Select(g => new {
        QuestionId = g.Key.QuestionId,
        Option = g.Key.AnswerText,
        Count = g.Count()
    })
    .ToListAsync();

// Rating aggregation
var ratingAvg = await _db.QuestionResponses
    .Where(qr => qr.QuestionId == questionId)
    .AverageAsync(qr => qr.AnswerRating ?? 0);
```

**Alternatives Considered**:
- **Pre-computed aggregates**: Rejected as premature optimization, adds complexity (triggers/background jobs)
- **Cached results**: Rejected as results should always be current for administrators
- **Server-side pagination**: Not needed for v1 (20 questions max per survey)

**References**:
- EF Core aggregation: https://learn.microsoft.com/en-us/ef/core/querying/complex-query-operators#groupby
- Existing pattern: MeetingRequestsController.cs uses EF Core LINQ extensively

---

### 5. Survey Publishing Workflow

**Decision**: Three-state model (Draft → Active → Inactive)

**Rationale**:
- Follows existing meeting request workflow (Draft → Pending → Approved)
- Allows administrators to prepare surveys before user visibility
- Supports unpublishing without deletion (preserves responses)

**State Transitions**:
```
Draft → Active (Publish action)
Active → Inactive (Unpublish action)
Draft → Deleted (Delete action, only if no responses)
Active/Inactive → Cannot delete (preserve responses)
```

**Implementation**:
```csharp
public enum SurveyStatus
{
    Draft = 0,
    Active = 1,
    Inactive = 2
}

// Publish validation
if (survey.Questions.Count == 0)
    return BadRequest(new { error = "Survey must have at least 1 question" });
if (survey.Questions.Any(q => string.IsNullOrWhiteSpace(q.QuestionText)))
    return BadRequest(new { error = "All questions must have text" });

survey.Status = SurveyStatus.Active;
survey.PublishedAt = DateTime.UtcNow;
await _db.SaveChangesAsync();
```

**Alternatives Considered**:
- **Two-state (Draft/Published)**: Rejected as cannot hide published surveys without deletion
- **Four-state (+ Archived)**: Rejected as over-engineering for v1
- **Time-based publishing**: Rejected as out of scope (manual publish for v1)

**References**:
- Existing pattern: MeetingRequest.Status (Draft, Pending, Approved, Confirmed, Cancelled, Announced)
- State machine pattern: https://refactoring.guru/design-patterns/state

---

### 6. Anonymous Response Storage

**Decision**: Nullable UserId column with audit trail

**Rationale**:
- Simple nullable string column (UserId = null for anonymous)
- Preserves audit trail (SubmittedAt timestamp always recorded)
- No user identification (email, name) stored for anonymous responses

**Implementation**:
```csharp
public class SurveyResponse
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public string? UserId { get; set; } // Null = anonymous
    public DateTime SubmittedAt { get; set; }
    
    // Navigation properties
    public Survey Survey { get; set; } = null!;
    public List<QuestionResponse> QuestionResponses { get; set; } = new();
}
```

**Privacy Considerations**:
- FR-007: Anonymous responses must contain NO user identification
- Validation: Reject any request with UserId if "Submit Anonymously" flag set
- Results display: Do not show user information for anonymous responses
- Compliance: Meets GDPR-style anonymization requirements

**Alternatives Considered**:
- **Separate AnonymousResponse table**: Rejected as unnecessary duplication
- **Encrypted UserId**: Rejected as violates anonymity principle (could be decrypted)
- **IP address logging**: Rejected as violates privacy requirements

**References**:
- Existing pattern: MeetingRequest.RequestorEmail (nullable string for auth user identification)

---

### 7. Testing Strategy

**Decision**: Integration tests (backend) + E2E tests (frontend)

**Rationale**:
- Follows existing test pattern (xUnit integration tests, Playwright E2E)
- Constitution: Test-First is NON-NEGOTIABLE
- Integration tests cover API contracts, database constraints
- E2E tests cover user flows, UI interactions

**Test Coverage**:

**Backend (xUnit Integration Tests)**:
- SurveysControllerTests.cs (following MeetingRequestsControllerFilterTests pattern)
  - `Create_ValidSurvey_ReturnsCreated()`
  - `Publish_DraftSurvey_ReturnsOk()`
  - `Publish_EmptySurvey_ReturnsBadRequest()`
  - `SubmitResponse_ValidData_ReturnsOk()`
  - `SubmitResponse_Duplicate_ReturnsBadRequest()`
  - `GetResults_MultipleChoice_ReturnsAggregates()`
  - `GetResults_Rating_ReturnsAverage()`
  - `Delete_SurveyWithResponses_ReturnsBadRequest()`

**Frontend (Playwright E2E Tests)**:
- src/client/e2e/tests/survey.spec.ts
  - `test('admin creates and publishes survey with 3 questions')`
  - `test('user submits survey response successfully')`
  - `test('user cannot submit duplicate response')`
  - `test('admin views aggregated results')`
  - `test('anonymous response does not show user info')`
  - `test('required question validation works')`

**Test Data Setup**:
- Use in-memory EF Core database for isolation (existing pattern)
- Seed test data in test constructor
- Clean up after each test (Dispose pattern)

**References**:
- Existing: src/tests/MeetingRequests.IntegrationTests/Tests/MeetingRequestsControllerFilterTests.cs
- Existing: src/client/e2e/tests/requestor-filter.spec.ts
- xUnit Docs: https://xunit.net/
- Playwright Docs: https://playwright.dev/

---

## Summary

All technical unknowns resolved:

1. ✅ **Database schema**: Polymorphic questions with JSON options column
2. ✅ **UI components**: Fluent UI v9 (TextField, RadioGroup, Rating, etc.)
3. ✅ **Duplicate prevention**: Database constraint + application check
4. ✅ **Aggregation**: On-demand calculation (acceptable performance for v1)
5. ✅ **Publishing workflow**: Three-state model (Draft/Active/Inactive)
6. ✅ **Anonymous responses**: Nullable UserId with audit trail
7. ✅ **Testing**: xUnit integration + Playwright E2E (TDD approach)

**No blockers identified.** Feature is ready for Phase 1 (Data Model & Contracts).

## Next Steps

- Phase 1: Generate data-model.md with entity relationships and validation rules
- Phase 1: Generate contracts/ with API schemas and component interfaces
- Phase 1: Generate quickstart.md with implementation steps
