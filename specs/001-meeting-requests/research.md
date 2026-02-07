# Research: Board Meeting Request & Voting System

**Phase**: Phase 0 Research  
**Date**: 2026-02-07  
**Status**: Complete

## Technology Stack Decisions

### Decision 1: Backend Framework - C# ASP.NET Core 8 with Minimal APIs

**What Was Chosen**: C# 11 + ASP.NET Core 8 Minimal APIs pattern  
**Rationale**:
- Native Azure integration - seamless deployment to App Service, built-in identity providers (Azure AD)
- Strong type system prevents common bugs (null safety with nullable types, compile-time validation)
- Entity Framework Core 8 provides ORM with lazy loading, eager loading, explicit relationships - perfect for complex domain models like meetings with nested documents and votes
- Minimal APIs pattern offers lightweight HTTP API layer without excess ceremony, ideal for REST endpoints
- Built-in dependency injection, logging, configuration management
- Performance: Measured to handle 50,000+ req/s on modern hardware; easily matches 1000 req/s target
- Mature ecosystem for authentication (Azure AD, OAuth2), authorization (role-based), and email integration

**Alternatives Considered**:
- Node.js/Express: Weaker type system increases runtime errors; less native Azure integration
- Python/FastAPI: Good type hints but slower performance; not Azure-native; requires more DevOps configuration
- Java/Spring Boot: Heavier memory footprint; overkill for this scope; slower startup times

**Implementation Details**:
- Use Entity Framework Core for all database operations (no raw SQL except in rare performance scenarios)
- Minimal APIs endpoints for 23 functional requirements (FRs)
- Built-in validation via FluentValidation or Data Annotations
- Azure Service Bus or SendGrid for email notifications (FR-005, FR-015, FR-022)

---

### Decision 2: Frontend Framework - React with TypeScript

**What Was Chosen**: React 18+ with TypeScript, Vite build tool  
**Rationale**:
- Component-driven architecture enables independent testing of Meeting Request, Document Upload, Vote Creation, and Vote Casting UI modules
- Strong TypeScript support catches type errors before runtime
- Huge ecosystem for state management (Redux/Zustand), HTTP clients (Axios/fetch), and accessibility testing
- Responsive design libraries (Material-UI, Chakra) ensure Principle IV (modern, consistent, accessible UX) compliance
- Vite enables fast hot module replacement during development
- Proven patterns for email-based authentication (magic link handling via URL parameters)

**Alternatives Considered**:
- Vue: Smaller ecosystem; less tooling maturity for large SPAs
- Angular: Over-engineered for this scope; steep learning curve
- Svelte: Emerging, less community support for enterprise features

**Implementation Details**:
- Separate React components for each user story (MeetingRequestForm, DocumentUpload, VoteCreate, VoteCast)
- Context API or Zustand for state management (simpler than Redux for this scope)
- fetch or Axios for API calls to backend
- React Router for navigation (Dashboard → Meeting → Voting)
- Jest + React Testing Library for unit/integration tests
- Accessible form components with ARIA labels (WCAG 2.1 AA compliance)

---

### Decision 3: Database - SQL Server (Azure SQL Database)

**What Was Chosen**: SQL Server with Azure SQL Database managed service  
**Rationale**:
- ACID compliance guarantees data consistency for critical operations: vote submission (FR-019), meeting state changes (FR-003, FR-004)
- Native Entity Framework Core integration with EF Core migrations for schema versioning
- Row-level security (RLS) enables fine-grained access control (SEC admin visibility restrictions per FR-011)
- Built-in audit trails via temporal tables (SYSTEM_TIME) support Principle I (transparency, governance integrity) without application code overhead
- Managed service (Azure SQL Database) eliminates infrastructure overhead: automatic backups, point-in-time restore, patching
- Performance: Can easily handle 1000 concurrent connections with proper connection pooling
- Cost-effective at this scale (DTU or vCore pricing based on actual usage)

**Alternatives Considered**:
- PostgreSQL: Open-source benefits but requires manual management; less native Azure integration; RLS support is weaker
- MySQL: Performance comparable but weaker temporal table support
- MongoDB: Document store loses ACID guarantees; voting and audit trail requirements need strong transactions

**Implementation Details**:
- Connection pooling via .NET connection string pooling (min 10, max 100 connections)
- EF Core migrations for schema deployment (enable zero-downtime deployments)
- Temporal tables for audit trail (Meeting, Vote, VoteSubmission)
- Indexes on common queries: MeetingId (documents), VoteId (submissions), DeadlineDate (vote closure job)

---

### Decision 4: Authentication - Azure AD (Internal) + Email Magic Links (External)

**What Was Chosen**: Dual authentication model  
**Rationale**:
- **Internal users (SEC admin, regular users)**: Azure AD via Azure App Registration. One-click OAuth integration, supports MFA, single sign-on across organization. Reduces IT support burden.
- **External members (voters)**: Email magic links. No account creation required; passwordless; frictionless (clarification confirmed). Link expires in 15 minutes for security.

**Clarification Applied**: External auth → Email magic link confirmed in clarifications

**Alternatives Considered**:
- SSO for all: External vendors unlikely to have Azure AD tenants; adds friction
- Password-based: Support burden; security risk; violates "passwordless" trend
- OAuth (Google/Microsoft Consumer): Privacy concerns for board members; not board-specific

**Implementation Details**:
- Azure AD B2C for external voter accounts (optional; can use simple JWT + email verification)
- Temporary JWT tokens issued via email link: `https://app.ubs.local/vote?token=jwt123&expires_in=900`
- Verify JWT signature, expiration, and voter eligibility (FR-014, FR-016)
- For external voters: No persistent user record; one-time voting session per email

---

### Decision 5: Vote Model - Binary Yes/No Only

**What Was Chosen**: Binary votes (Yes/No only)  
**Rationale**:
- **Simplicity**: Reduces scope significantly. Vote creation UI is trivial (title, description, deadline). Results display is simple (yes count, no count, percentage).
- **Clarification Applied**: Binary (Yes/No only) confirmed in clarifications
- **Future-proof**: Can extend to custom options in future feature without breaking existing votes
- **User story coverage**: All 4 user stories (P1-P3) fully supported by binary model; no multi-choice required, no abstentions needed

**Alternatives Considered**:
- Multiple choice: Admin UI overhead, results visualization complexity, voter confusion
- Abstention option: Not required by any user story or success criteria

**Implementation Details**:
- Vote entity: `{ Id, Title, Description, Deadline, YesCount, NoCount, Status, ... }`
- VoteSubmission entity: `{ Id, VoterId, VoteId, Choice: "Yes" | "No", SubmittedAt, ... }`
- Vote closure: Query where `Deadline < NOW()` and `Status = "VotingOpen"`, update to `"Closed"`, calculate results
- Results: YesCount / (YesCount + NoCount) * 100 for percentage display

---

### Decision 6: Automatic Vote Deadline Closure

**What Was Chosen**: Server-side job (Azure Functions or scheduled task in API)  
**Rationale**:
- **Automation** (Principle III): Reduces manual SEC admin work; ensures consistency
- **Accuracy**: Server time is source of truth (prevents client-side clock skew)
- **Requirement**: FR-012 explicitly requires automatic closure
- **Implementation**: Lightweight job runs every minute, checks for expired votes, updates status
- **Performance**: <5 seconds to close, minimum load (queries indexed by deadline)

**Alternatives Considered**:
- Manual closure: Violates Principle III (automation), unreliable
- Client-side timeouts: Clock skew, browser persistence issues
- Database triggers: Harder to test, less visibility into closure process

**Implementation Details**:
- Azure Functions scheduled trigger (cron: `0 * * * * *` every minute) OR hosted background service in ASP.NET Core
- Query: `SELECT * FROM Votes WHERE Deadline < GETUTCDATE() AND Status = 'VotingOpen'`
- Update: `UPDATE Votes SET Status = 'Closed' WHERE ... `
- Calculate results in same transaction (YesCount = COUNT(*) WHERE Choice = 'Yes', etc.)
- Log closure event for Principle I (transparency)

---

### Decision 7: Document Upload Storage

**What Was Chosen**: Azure Blob Storage for files, SQL Server for metadata  
**Rationale**:
- **Separation of concerns**: Binary files in object storage (scalable, cheap); metadata in relational DB (queryable, transactional)
- **Performance**: Blob Storage optimized for large files; doesn't strain database connections
- **Cost**: Blob storage ~$0.02/GB/month; database reserved for transactions, not file serving
- **Compliance**: Easy to implement retention policies (auto-delete after meeting conclusion per edge case handling)

**Alternatives Considered**:
- Database BLOB column: Scales poorly; makes backups huge; slows queries
- File system: Not cloud-native; doesn't work in multi-instance deployment

**Implementation Details**:
- Document entity stores: `FileSize, FileType, BlobUri, UploadedAt, UploaderUserId, ...`
- API: POST `/meetings/{id}/documents` → upload to Blob Storage with SAS URL, store metadata in DB
- GET `/meetings/{id}/documents/{docId}` → return Blob Storage URL (signed) or stream directly from blob

---

### Decision 8: Email Notifications

**What Was Chosen**: Azure SendGrid or Azure Communication Services (ACS)  
**Rationale**:
- **Integration**: Native Azure services; no third-party account management
- **Reliability**: Built-in retry logic; guaranteed delivery
- **Templating**: HTML email templates for professional appearance, voting links embedded
- **Tracking**: Read receipts, click tracking (optional for security audit)

**Clarification Applied**: Email notifications for vote publish (FR-015), meeting approval/rejection (FR-005) per spec

**Implementation Details**:
- Email template for vote invitation: "You're invited to vote on [Title]. Click here: [magic-link]. Deadline: [date]"
- Email template for meeting approval: "Your meeting request for [date] has been approved!"
- Email template for meeting rejection: "Your meeting request was rejected: [reason]"
- Async delivery (background job) to not block API responses

---

### Decision 9: Vote Results Calculation

**What Was Chosen**: Synchronous calculation on deadline closure; cached results  
**Rationale**:
- **Consistency**: Results calculated once in a single transaction
- **Performance**: Percentage calculations (100 / total) are trivial; no need for async processing
- **Requirement**: FR-005, success criterion SC-005 requires results within 5 seconds of deadline

**Implementation Details**:
- In vote closure job:
  ```sql
  SELECT COUNT(*) as YesCount, COUNT(*) as NoCount FROM VoteSubmissions WHERE VoteId = @id GROUP BY Choice
  UPDATE Votes SET YesCount = @yes, NoCount = @no, Status = 'Closed' WHERE Id = @id
  ```
- Results immutable after closure (per FR-019)
- Cache in Vote entity; no recalculation needed

---

### Decision 10: Meeting Conflict Handling

**What Was Chosen**: Display warning but allow approval  
**Rationale**:
- **Clarification Applied**: Conflict handling → Allow with warning
- **Business flexibility**: Board may schedule parallel sessions or handle exceptions
- **Implementation**: Quick SQL check for existing meetings on same date/time
- **Transparency**: Warning logged in audit trail (Principle I) for governance transparency

**Implementation Details**:
- On meeting approval: Query `SELECT * FROM Meetings WHERE Date = @date AND Status = 'Approved' AND ConflictStatus != 'Acknowledged'`
- If conflict exists: Return warning to SEC admin UI; SEC admin acknowledges and re-submits
- Store `ConflictAcknowledged: bool` on Meeting entity
- Log both the conflict and the acknowledgment for audit trail

---

## Implementation Readiness

| Component | Status | Risk | Notes |
|-----------|--------|------|-------|
| **ASP.NET Core 8 + EF Core** | ✅ Proven | Low | Stable, widely used; migrations tested |
| **React 18 + TypeScript** | ✅ Proven | Low | Mature ecosystem; tooling excellent |
| **SQL Server / Azure SQL DB** | ✅ Proven | Low | Managed service; no infrastructure risk |
| **Azure AD + Email Magic Links** | ✅ Proven | Low | Both patterns well-documented |
| **Binary vote model** | ✅ Proven | Low | Simplicity reduces complexity |
| **Azure Blob Storage** | ✅ Proven | Low | Mature service; well-integrated with .NET |
| **Email notifications (SendGrid/ACS)** | ✅ Proven | Low | Standard approach; reliable |
| **Vote deadline automation** | ✅ Proven | Low | Simple scheduled job pattern |
| **Conflict warning UX** | ⚠️ TBD | Low | Needs Phase 1 design validation |

---

## Summary

**All technology decisions align with Unified Board Solutions Constitution**:
- ✅ Principle I: Audit trails via temporal tables, comprehensive logging
- ✅ Principle II: Single SQL Server, unified API, no fragmentation
- ✅ Principle III: Automatic vote closure, email notifications, minimal manual work
- ✅ Principle IV: React ensures modern UI; accessibility testing deferred to Phase 1
- ✅ Principle V: Azure AD + magic links, encryption at-rest/in-transit, RLS for access control

**Phase 1 Ready**: Data models, API contracts, and developer quickstart can proceed with full confidence.

