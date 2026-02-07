# Implementation Plan: Board Meeting Request & Voting System

**Branch**: `001-meeting-requests` | **Date**: 2026-02-07 | **Spec**: [specs/001-meeting-requests/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-meeting-requests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a comprehensive board meeting workflow system with four core capabilities: (1) **P1 - Meeting Requests**: Users request meetings with dates/times, SEC admins approve/reject with notifications. (2) **P2 - Document Management**: Upload, organize, and manage meeting documents with SEC-admin-controlled visibility. (3) **P2 - Vote Creation**: SEC admins create binary Yes/No votes on meeting topics with deadline-based closure. (4) **P3 - Voting**: Internal and external members cast votes via email magic links.

**Technical Approach**: REST API backend built with C# ASP.NET Core 8 and SQL Server; React frontend; binary vote model; email-based authentication for external members; automatic vote closure at deadline.

## Technical Context

**Language/Version**: C# 11 with .NET 8.0  
**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, Minimal APIs pattern  
**Storage**: SQL Server (managed via Azure SQL Database on Azure)  
**Testing**: xUnit for unit tests, integration tests via TestServer, contract tests via OpenAPI schema validation  
**Target Platform**: Azure cloud (App Service for API, SQL Database, potential use of Azure Functions for vote deadline jobs)  
**Project Type**: Web application (backend REST API + frontend React SPA)  
**Performance Goals**: Minimum 1000 req/s throughput, <500ms p95 for vote submission/retrieval  
**Constraints**: <2GB memory per API instance, must support zero-downtime deployments on Azure  
**Scale/Scope**: Support 1000 concurrent users, handle 100+ simultaneous meetings, 10,000+ documents across active meetings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Unified Board Solutions Constitution Alignment

**Principle I - Transparency and Governance Integrity** ✅  
- Meeting request approval/rejection workflow maintains full audit trail of governance decisions
- All vote submissions tracked with timestamp and voter identity per FR-017
- Document upload metadata (uploader, timestamp) provides traceability per FR-009

**Principle II - Seamless Integration and Single Source of Truth** ✅  
- Single unified meeting platform per spec requirement eliminates fragmentation
- All meeting data (requests, approvals, documents, votes) stored in single SQL Server instance
- Cross-functional data consistency enforced via Entity Framework Core relationships

**Principle III - Efficiency Through Workflow Automation** ✅  
- Automatic vote deadline closure per FR-012 reduces manual intervention
- Email notifications sent on meeting approval/rejection (FR-005) and vote publishing (FR-015) reduce manual communication
- P2 scope includes document organization automating file management workflows

**Principle IV - Modern, Consistent, and Accessible User Experience** ⚠️ *To Be Verified in Phase 1*  
- React frontend design must ensure responsive UI across devices
- Role-based interface visibility per FR-023 requires WCAG accessibility audit during Phase 1
- Deferred: Specific accessibility testing requirements (screen readers, keyboard navigation)

**Principle V - Security, Compliance, and Risk Reduction** ✅  
- Email magic link authentication (FR-017) for external members provides secure, passwordless access
- Role-based access control (SEC admin vs user vs external member) enforces data segmentation
- SQL Server encryption at-rest + Azure SSL in-transit protects sensitive board data

**Gate Status**: ✅ **PASS** - The feature aligns with all 5 core principles. Phase 1 must validate accessibility requirements (Principle IV).

## Project Structure

### Documentation (this feature)

```text
specs/001-meeting-requests/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification with user stories and requirements
├── research.md          # Phase 0 output (best practices, technology decisions)
├── data-model.md        # Phase 1 output (entity definitions with relationships)
├── quickstart.md        # Phase 1 output (developer setup and first feature walkthrough)
├── contracts/           # Phase 1 output (API endpoint specifications)
│   ├── meetings.openapi.yaml
│   ├── documents.openapi.yaml
│   └── votes.openapi.yaml
└── tasks.md             # Phase 2 output (task decomposition by user story - pending)
```

### Source Code (Repository Root)

**Selected Structure**: Web application (backend API + frontend React SPA)

```text
/
├── backend/
│   ├── src/
│   │   ├── Api/
│   │   │   ├── Endpoints/
│   │   │   │   ├── MeetingRequestsEndpoints.cs
│   │   │   │   ├── DocumentsEndpoints.cs
│   │   │   │   └── VotesEndpoints.cs
│   │   │   └── Middleware/
│   │   ├── Domain/
│   │   │   ├── Models/
│   │   │   │   ├── Meeting.cs
│   │   │   │   ├── MeetingRequest.cs
│   │   │   │   ├── Document.cs
│   │   │   │   ├── Vote.cs
│   │   │   │   └── VoteSubmission.cs
│   │   │   └── Events/
│   │   ├── Services/
│   │   │   ├── MeetingService.cs
│   │   │   ├── DocumentService.cs
│   │   │   ├── VoteService.cs
│   │   │   └── NotificationService.cs
│   │   ├── Data/
│   │   │   ├── MeetingDbContext.cs
│   │   │   └── Migrations/
│   │   └── Program.cs
│   │
│   ├── tests/
│   │   ├── Unit/
│   │   │   ├── MeetingServiceTests.cs
│   │   │   ├── DocumentServiceTests.cs
│   │   │   └── VoteServiceTests.cs
│   │   ├── Integration/
│   │   │   ├── MeetingEndpointTests.cs
│   │   │   ├── DocumentEndpointTests.cs
│   │   │   └── VoteEndpointTests.cs
│   │   └── Contract/
│   │       └── ApiContractTests.cs
│   │
│   ├── paket.dependencies
│   ├── *.csproj
│   └── Dockerfile (for Azure Deployment)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MeetingRequest/
│   │   │   ├── DocumentUpload/
│   │   │   ├── VoteCreation/
│   │   │   └── VoteCasting/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MeetingDetails.tsx
│   │   │   └── VotingPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   └── meetingService.ts
│   │   ├── hooks/
│   │   ├── App.tsx
│   │   └── index.tsx
│   │
│   ├── public/
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/
│   │
│   ├── package.json
│   └── Dockerfile (for Azure Deployment)
│
└── README.md
```

**Structure Decision**: Web application with separate backend (`/backend`) and frontend (`/frontend`) directories. Backend serves REST API endpoints, frontend is React SPA consuming the API. Both independently deployable to Azure App Service and Azure Static Web Apps (or unified CORS-enabled App Service for backend + frontend serving).

## Complexity Tracking

> **No Constitutional Violations** - This feature aligns with all principles of the Unified Board Solutions Constitution. No complexity justifications required.

**Architecture Notes** (for awareness, not exceptions):

| Design Decision | Rationale | Alternatives Rejected |
|-----------------|-----------|----------------------|
| Binary Yes/No votes only | Simplifies voting logic, meets all user stories (US3-4). Future multi-choice voting can extend. | Multi-choice requires UI complexity, admin configuration overhead; not justified for P2 scope |
| Email magic link auth for external voters | Eliminates password management friction for external members; aligns with modern UX. | Dedicated credentials (support burden), SSO (integration complexity for external parties) |
| Automatic vote deadline closure via scheduled job or EF query | Ensures vote state consistency without manual admin intervention; supports Principle III (automation). | Manual closure (introduces human error), user-triggered (unreliable for precision) |
| Document visibility control by SEC admin | Enables compliance with governance (Principle I) and security (Principle V). | No control (violates governance), all visible (information overshare) |
| REST API with SQL Server backend | Proven stack with Azure native integration; Entity Framework provides data consistency. | GraphQL (overkill for this scope), microservices (premature complexity) |
