# Implementation Plan: Voting Platform Navigation Link

**Branch**: `001-voting-platform-nav` | **Date**: February 11, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-voting-platform-nav/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a "Voting Platform" navigation link to the main application navigation menu that is visible only to users with "voting" or "admin" permissions. The link will navigate users to a voting platform page, display active state when on that page, and be fully accessible across all devices following WCAG 2.1 Level AA standards.

## Technical Context

**Language/Version**: 
- Frontend: JavaScript (ES6+) with React 18.2.0
- Backend: C# with .NET 8.0

**Primary Dependencies**: 
- Frontend: React Router DOM 6.11.2, Fluent UI React Components 9.72.11, MSAL React 3.0.25, Vite 5.0.0
- Backend: ASP.NET Core 8.0, Entity Framework Core 8.0, Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0

**Storage**: SQLite database with Entity Framework Core (existing)

**Testing**: 
- Frontend: Playwright 1.40.0 for E2E tests
- Backend: xUnit/NUnit for integration tests (based on existing MeetingRequests.IntegrationTests)

**Target Platform**: Web application (desktop and mobile browsers)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Navigation link interaction response time <100ms (per success criteria)

**Constraints**: 
- WCAG 2.1 Level AA accessibility compliance required
- Must work across Chrome, Firefox, Safari, Edge browsers
- Keyboard navigation support required

**Scale/Scope**: Single navigation link addition with permission-based visibility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|-----------|----------|--------|-------|
| **Library-First** | ❌ No | N/A | This is a UI navigation feature, not a library component |
| **CLI Interface** | ❌ No | N/A | Web UI feature with no CLI component |
| **Test-First (NON-NEGOTIABLE)** | ✅ Yes | ✅ PASS | Will write E2E tests for navigation link visibility, click behavior, and active state. Integration tests for permission checking |
| **Integration Testing** | ✅ Yes | ✅ PASS | Will test: navigation link appears for authorized users, hidden for unauthorized, routing works correctly, active state updates |
| **Observability & Versioning** | ❌ No | N/A | Not a standalone service or library release |

**Gate Result**: ✅ PASS - All applicable principles satisfied. Test-first approach will be followed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── client/ (React frontend)
│   ├── src/
│   │   ├── components/
│   │   │   └── shell/
│   │   │       ├── TopNav.jsx           # MODIFY: Add voting platform link
│   │   │       └── ...
│   │   ├── pages/                       # CREATE: New voting platform page
│   │   │   └── VotingPlatform.jsx       # Placeholder/stub page
│   │   ├── App.jsx                      # MODIFY: Add route for voting platform
│   │   └── ...
│   └── e2e/
│       └── tests/
│           └── voting-nav.spec.ts       # CREATE: E2E tests for navigation
│
└── server/ (.NET backend)
    ├── Controllers/                      # No changes needed (no backend API for navigation)
    └── ...

tests/
└── MeetingRequests.IntegrationTests/
    └── Tests/
        └── NavigationTests.cs           # CREATE: Integration tests for permission-based visibility
```

**Structure Decision**: This is a web application with React frontend (src/client) and .NET backend (src/server). The navigation link addition is purely frontend work with no backend API changes needed. The existing MSAL authentication system provides user claims that can be used for permission checking on the client side.

## Complexity Tracking

No constitution violations - this section is not applicable.

---

## Post-Phase 1 Validation

**Constitution Re-Check**: ✅ PASS

After completing Phase 1 design artifacts, the constitution check remains valid:
- ✅ Test-First principle confirmed with detailed test scenarios in [quickstart.md](quickstart.md) and [contracts/README.md](contracts/README.md)
- ✅ Integration testing approach documented with E2E test specifications
- ✅ No new violations introduced during design phase

**Design Artifacts Complete**:
- ✅ [research.md](research.md) - All technical unknowns resolved
- ✅ [data-model.md](data-model.md) - Data dependencies documented (none for this feature)
- ✅ [contracts/README.md](contracts/README.md) - Component interfaces and test contracts defined
- ✅ [quickstart.md](quickstart.md) - Implementation guide ready for developers

**Ready for Phase 2**: `/speckit.tasks` command can now break down implementation into detailed tasks.

---

## Planning Summary

**Phase 0 Completed**: Research identified all technical decisions
- Permission system integration via existing `useRoles` hook
- Navigation pattern using filtered links array
- Active state styling with React Router's `useLocation`
- Accessibility compliance through existing patterns
- Route configuration approach
- No backend changes required

**Phase 1 Completed**: Design artifacts created
- Data model: No new data entities (uses existing auth roles)
- Contracts: Component interfaces, route contracts, accessibility requirements
- Quickstart: Step-by-step implementation guide (45-60 min estimated)

**Next Steps**:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Begin test-first implementation following quickstart guide
3. Implement E2E tests before UI changes
4. Add navigation link with permission checking
5. Verify accessibility and cross-browser compatibility
