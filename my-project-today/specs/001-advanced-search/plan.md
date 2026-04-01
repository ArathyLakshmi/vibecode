# Implementation Plan: Advanced Search & Filtering

**Branch**: `001-advanced-search` | **Date**: March 3, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-advanced-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

An advanced search and filtering system that enables users to find meeting requests using multi-criteria search, saved filters, quick presets, Boolean text search operators, date range filtering with presets, search history tracking, and export capabilities to CSV/PDF. The feature enhances the existing basic search by adding a comprehensive query builder interface accessible via slide-out drawer (desktop) or full-screen modal (mobile), with backend API support for complex filtering, saved search storage in SQLite, and optimization for sub-500ms query performance on datasets up to 10,000 meetings.

## Technical Context

**Language/Version**: React 18.2 (frontend), ASP.NET Core .NET 8.0 (backend)  
**Primary Dependencies**: 
- Frontend: Fluent UI React Components 9.72.11, React Router DOM 6.11.2, MSAL React 3.0.25, Tailwind CSS 3.4.8, jsPDF 4.2.0
- Backend: Entity Framework Core, Microsoft.AspNetCore.Authentication.JwtBearer, SQLite

**Storage**: SQLite database (meetingrequests.db) with existing schema (MeetingRequests, MeetingRequestAudits tables); new tables required for SavedSearches and SearchHistory  
**Testing**: 
- Frontend: Playwright 1.40.0 (E2E tests), Vite 5.0.0 (dev server)
- Backend: xUnit (integration tests), Microsoft.AspNetCore.Mvc.Testing (in-memory test server)

**Target Platform**: Web application (Chrome, Firefox, Safari, Edge), responsive design for mobile (viewport >= 320px) and desktop (viewport >= 1024px)  
**Project Type**: Web application (frontend + backend architecture)  
**Performance Goals**: 
- Search query execution: < 500ms for datasets up to 10,000 meetings
- Frontend filter updates: < 300ms (debounced)
- Export generation: < 5 seconds for 1,000 records
- Initial page load: < 2 seconds

**Constraints**: 
- Must work with existing SQLite schema without breaking changes
- Uses existing MSAL Azure AD authentication (no new auth mechanisms)
- Maintains Fluent UI design consistency
- Saved searches per-user only (max 20 per user)
- Search history stored in browser localStorage (last 10 searches)
- Text search limited to 500 characters
- Date range limited to 5 years past/future
- Export limited to 1,000 records per operation

**Scale/Scope**: 
- Expected dataset: 10,000-50,000 meeting requests
- User base: 100-500 concurrent users
- 7 user stories (P1-P3 prioritization)
- 62 functional requirements
- Frontend: ~8 new components, ~2,000 LOC
- Backend: 2 new controllers/services, ~1,500 LOC
- Database: 2 new tables, 4-6 new indexes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Library-First
**Status**: COMPLIANT  
**Rationale**: Advanced search will be implemented as reusable React components (`AdvancedSearchPanel`, `SavedSearchManager`, `SearchHistoryDropdown`, `QuickFilters`, `DateRangeSelector`) with defined prop interfaces, and backend search services (`SearchFilterService`, `SavedSearchService`) with clear contract boundaries. Components can be independently imported and tested.

### ⚠️ CLI Interface
**Status**: NOT APPLICABLE (with justification)  
**Rationale**: This is a web UI feature for end-users. No CLI wrapper is needed. Backend API endpoints serve as the programmatic interface (RESTful HTTP contracts documented in OpenAPI format in contracts/).

### ✅ Test-First (NON-NEGOTIABLE)
**Status**: COMPLIANT  
**Rationale**: Test-first approach will be followed:
- Unit tests for filter logic, search parser, date range calculations written before implementation
- Contract tests for API endpoints (`GET /api/meetingrequests` with filter parameters, `POST /api/saved-searches`, etc.) written before controllers
- Integration tests for saved search CRUD operations before database layer
- E2E tests for user flows (Playwright scenarios matching acceptance criteria in spec) written before UI implementation

### ✅ Integration Testing
**Status**: COMPLIANT  
**Rationale**: Critical integration points to be tested:
- Backend search API with multiple filter combinations and edge cases (empty results, large datasets)
- Frontend-backend contract for filter parameter serialization (JSON structure validation)
- Saved search persistence and retrieval across sessions
- Search history storage in localStorage with browser compatibility
- Export functionality integration with search filters
- Existing infinite scroll pagination with new filtering
- Calendar view integration with filtered results

### ✅ Observability & Versioning
**Status**: COMPLIANT  
**Rationale**: 
- Backend will emit structured logs for search queries (filters applied, result counts, query time)
- Frontend will log search patterns to console (dev mode) and track search analytics (filters used, search history access)
- API versioning: New endpoints use existing `/api/meetingrequests` with backwards-compatible query parameters; new `/api/saved-searches` endpoint follows same pattern
- Database migrations use EF Core with version tracking (existing pattern)
- CHANGELOG.md will document user-visible changes for this feature
- No breaking changes to existing search behavior (basic search still works)

## Project Structure

### Documentation (this feature)

```text
specs/001-advanced-search/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── README.md        # Contract overview and testing approach
│   ├── search-api.md    # GET /api/meetingrequests with advanced filters
│   ├── saved-searches-api.md  # CRUD operations for saved searches
│   └── export-api.md    # Export filtered results to CSV/PDF
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── search/             # NEW: Advanced search components
│   │   │   │   ├── AdvancedSearchPanel.jsx       # Main search drawer/modal
│   │   │   │   ├── SearchFilterGroup.jsx         # Filter category groups
│   │   │   │   ├── SavedSearchManager.jsx        # Manage saved searches
│   │   │   │   ├── SearchHistoryDropdown.jsx     # Recent searches
│   │   │   │   ├── QuickFiltersBar.jsx           # Quick filter presets
│   │   │   │   ├── DateRangeSelector.jsx         # Date range picker
│   │   │   │   ├── FilterChip.jsx                # Active filter chips
│   │   │   │   ├── ExportMenu.jsx                # Export dropdown
│   │   │   │   └── SearchQueryBuilder.jsx        # Boolean search parser
│   │   │   ├── MeetingRequestsList.jsx    # MODIFIED: Integration points
│   │   │   └── MeetingRequestsCalendar.jsx  # MODIFIED: Integration points
│   │   ├── services/
│   │   │   └── searchService.js            # NEW: Search API client
│   │   ├── hooks/
│   │   │   ├── useAdvancedSearch.js        # NEW: Search state management
│   │   │   ├── useSavedSearches.js         # NEW: Saved searches hook
│   │   │   └── useSearchHistory.js         # NEW: LocalStorage hook
│   │   └── utils/
│   │       ├── searchParser.js             # NEW: Boolean query parser
│   │       └── exportUtils.js              # NEW: CSV/PDF export helpers
│   └── e2e/
│       └── tests/
│           └── advanced-search.spec.ts     # NEW: E2E test suite
│
├── server/                          # ASP.NET Core backend
│   ├── Controllers/
│   │   ├── MeetingRequestsController.cs    # MODIFIED: Add filter parameters
│   │   ├── SavedSearchesController.cs      # NEW: Saved search CRUD
│   │   └── ExportController.cs             # NEW: Export operations
│   ├── Models/
│   │   ├── SavedSearch.cs                  # NEW: Saved search entity
│   │   ├── SearchHistory.cs                # NEW: Search history entity
│   │   └── SearchFilterDto.cs              # NEW: Filter DTO
│   ├── Services/
│   │   ├── SearchFilterService.cs          # NEW: Complex query building
│   │   ├── SavedSearchService.cs           # NEW: Saved search logic
│   │   ├── SearchQueryParser.cs            # NEW: Boolean operator parsing
│   │   └── ExportService.cs                # NEW: CSV/PDF generation
│   ├── Data/
│   │   └── MeetingRequestsDbContext.cs     # MODIFIED: Add new entities
│   ├── Migrations/
│   │   └── [timestamp]_AddAdvancedSearch.cs  # NEW: Database migration
│   └── Tests/
│       ├── SearchFilterServiceTests.cs     # NEW: Unit tests
│       ├── SavedSearchIntegrationTests.cs  # NEW: Integration tests
│       └── SearchApiContractTests.cs       # NEW: Contract tests
│
└── tests/                           # Shared test utilities
    └── test-data/
        └── search-scenarios.json            # NEW: Test filter combinations
```

**Structure Decision**: Web application structure selected (frontend + backend). The repository already follows this pattern with `src/client/` containing the React application and `src/server/` containing the ASP.NET Core API. Advanced search components will be organized under a new `src/client/src/components/search/` directory to maintain clear separation from existing components. Backend search logic will be extracted into dedicated service classes following the existing pattern of `Services/` directory organization. No restructuring of existing code is required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. All constitution principles are either compliant or explicitly not applicable (CLI Interface waived for web UI feature with documented rationale).
