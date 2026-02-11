# Implementation Plan: Modern Form UI with Fluent UI

**Branch**: `006-modern-form-ui` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-modern-form-ui/spec.md`

## Summary

Modernize the meeting request form (MeetingRequestForm.jsx) with Microsoft Fluent UI React v9 components to achieve a SharePoint-like, professional appearance while maintaining all existing functionality. Replace basic HTML form elements with Fluent UI's TextField, Dropdown, DatePicker, Button, and MessageBar components. Combine Fluent UI's component styling with Tailwind CSS layout utilities for responsive design (mobile, tablet, desktop). Preserve existing features: validation logic, MSAL authentication integration, form submission, and draft saving. Implement enhanced visual feedback with Fluent UI's built-in validation states, error messaging, and character counters.

**Technical Approach** (from research):
- Install `@fluentui/react-components` v9 and `@fluentui/react-icons`
- Wrap form in `FluentProvider` with `webLightTheme`
- Direct component mapping: HTML inputs → Fluent UI equivalents
- Use Fluent UI `Stack` for layout + Tailwind grid utilities for responsive breakpoints
- Preserve React state management (useState) with controlled components
- Convert dates between JavaScript Date objects (Fluent UI DatePicker) and ISO strings (backend API)
- Maintain category → subcategory dependency logic with Dropdown components
- Rely on Vite tree-shaking for bundle optimization (target <150KB gzipped increase)
- Validate accessibility with axe-core, ensure WCAG 2.1 AA compliance

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18.2.0  
**Primary Dependencies**: 
- Existing: React 18.2.0, React Router 6.11.2, MSAL Browser 4.28.1, MSAL React 3.0.25, Tailwind CSS 3.4.8, Vite 5.0.0
- New: `@fluentui/react-components` v9.x (Fluent UI React), `@fluentui/react-icons` v9.x (optional icons)

**Storage**: N/A (UI-only feature; backend API unchanged)  
**Testing**: Playwright 1.40.0 (E2E tests), axe-core (accessibility validation), manual keyboard/screen reader testing  
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), responsive web (mobile 320-640px, tablet 641-1023px, desktop 1024px+)  
**Project Type**: Web application (frontend SPA with backend API)  
**Performance Goals**: 
- Form loads and becomes interactive within 2 seconds on typical hardware
- Bundle size increase <150KB gzipped (Fluent UI addition)
- Smooth rendering with no janky scrolling or input lag

**Constraints**: 
- WCAG 2.1 AA accessibility compliance (keyboard navigation, screen reader support, color contrast, touch targets 44x44px minimum)
- Preserve all existing functionality (no breaking changes to validation, submission, authentication)
- Maintain responsive design across mobile/tablet/desktop
- No backend changes (API endpoints, data models, validation rules unchanged)

**Scale/Scope**: 
- Single component refactor (MeetingRequestForm.jsx)
- 11 form fields to modernize
- 2 API endpoints (submit, draft) integration unchanged
- ~200-300 lines of JSX code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Library-First Principle
**Status**: ✅ NOT APPLICABLE  
**Rationale**: This feature modernizes an existing UI component, not creating a new library or module. The component remains part of the frontend application.

### CLI Interface Principle
**Status**: ✅ NOT APPLICABLE  
**Rationale**: UI component modernization does not involve CLI tools or scripts.

### Test-First Principle (NON-NEGOTIABLE)
**Status**: ⚠️ REQUIRES ATTENTION  
**Assessment**: 
- Existing E2E tests validate form functionality (submission, validation)
- **Action Required**: Update E2E test selectors for Fluent UI components before implementation
- **Action Required**: Add accessibility tests (axe-core integration) before implementation
- **Plan**: Write failing E2E tests for new component selectors, then implement Fluent UI components to pass tests

**Compliance Plan**:
1. Update E2E test selectors to use `data-testid` or ARIA attributes (Fluent UI provides accessible selectors)
2. Add accessibility test with axe-core expecting zero critical violations
3. Run tests in failing state (old HTML selectors won't match new Fluent UI components)
4. Implement Fluent UI components
5. Verify tests pass (new selectors match, accessibility validates, functionality preserved)

### Integration Testing Principle
**Status**: ✅ COMPLIANT  
**Assessment**: 
- Existing E2E tests cover form → backend API integration
- Tests verify POST /api/meetingrequests (submit) and POST /api/meetingrequests/draft (draft save)
- Modernization preserves API contract; no new integration tests required
- Will verify existing integration tests still pass after component modernization

### Observability & Versioning Principle
**Status**: ✅ COMPLIANT  
**Assessment**: 
- Frontend application versioning managed in package.json (currently 0.1.0)
- No breaking changes to public APIs (internal component refactor)
- Fluent UI dependency version pinned in package.json
- Logging/metrics not applicable to UI component (backend handles observability)

**Summary**: Feature compliant with constitution. Primary action: Update tests before implementation per Test-First principle.

## Project Structure

### Documentation (this feature)

```text
specs/006-modern-form-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: Fluent UI v9 setup, integration strategy, component mapping
├── data-model.md        # Phase 1 output: Existing MeetingRequest entity, form state structure
├── quickstart.md        # Phase 1 output: Step-by-step implementation guide
├── contracts/           # Phase 1 output: Component interface contracts
│   └── README.md        # Fluent UI component props, API endpoints, E2E selectors
└── checklists/
    └── requirements.md  # Specification quality checklist (completed)
```

### Source Code (repository root)

**Relevant Structure for this Feature**:

```text
my-project-today/
├── src/
│   ├── client/                        # Frontend SPA (React + Vite)
│   │   ├── package.json               # ✏️ UPDATE: Add Fluent UI dependencies
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── MeetingRequestForm.jsx  # ✏️ PRIMARY FILE: Refactor with Fluent UI
│   │   │   │   ├── MeetingRequestsList.jsx # Unaffected (Feature 005)
│   │   │   │   └── Drawer.jsx              # Unaffected (Feature 005)
│   │   │   ├── auth/
│   │   │   │   └── msalConfig.js      # Unaffected (MSAL integration preserved)
│   │   │   ├── App.jsx                # Unaffected (routing unchanged)
│   │   │   └── main.jsx               # Unaffected (app entry point)
│   │   └── e2e/
│   │       ├── tests/
│   │       │   └── form.spec.ts       # ✏️ UPDATE: E2E test selectors for Fluent UI
│   │       └── playwright.config.ts   # May need axe-core integration
│   └── server/                        # Backend API (.NET 8)
│       └── Controllers/
│           └── MeetingRequestsController.cs  # Unaffected (API endpoints unchanged)
└── specs/
    └── 006-modern-form-ui/            # This feature's documentation
```

**File Change Summary**:
- **Create**: None (no new files)
- **Modify**: 
  - `src/client/package.json` (add Fluent UI dependencies)
  - `src/client/src/components/MeetingRequestForm.jsx` (refactor with Fluent UI components)
  - `src/client/e2e/tests/*.spec.ts` (update test selectors if needed)
- **Delete**: None

**Structure Decision**: 
- Standard web application structure with frontend (`src/client/`) and backend (`src/server/`) separation
- Frontend uses React SPA with component-based architecture
- This feature modifies a single component (`MeetingRequestForm.jsx`) without restructuring
- E2E tests colocated with frontend code in `src/client/e2e/`
- Backend unchanged (API remains stable)

## Implementation Phases

### Phase 0: Research ✅ COMPLETED
- Generated `research.md` with 10 research areas covering:
  1. Fluent UI React v9 setup (vs v8, Material-UI, Ant Design)
  2. Fluent UI + Tailwind CSS integration strategy
  3. Component mapping (HTML → Fluent UI)
  4. Responsive layout with Stack component
  5. Form validation with Fluent UI validation states
  6. Date handling with DatePicker (Date objects ↔ ISO strings)
  7. Category → subcategory dependency handling
  8. Authentication integration (MSAL preserved)
  9. Performance optimization (tree-shaking, bundle size)
  10. Accessibility considerations (WCAG 2.1 AA, axe-core)
- **Outcome**: All technical decisions resolved, zero open questions

### Phase 1: Design & Contracts ✅ COMPLETED
- Generated `data-model.md`:
  - Documented existing MeetingRequest entity (no changes)
  - Defined form state structure (unchanged)
  - Documented validation rules (preserved)
  - Mapped API contracts (unchanged)
  - Specified Fluent UI component prop mappings
- Generated `contracts/README.md`:
  - Defined MeetingRequestForm public interface
  - Documented 10+ method contracts (handleChange, validate, handleSubmit, etc.)
  - Specified Fluent UI component contracts (TextField, Dropdown, DatePicker, Button, MessageBar, Stack)
  - Listed API endpoint contracts (POST /api/meetingrequests, /draft)
  - Defined E2E test selectors (data-testid attributes)
  - Documented accessibility requirements
- Generated `quickstart.md`:
  - 15-step implementation guide with code examples
  - Installation, imports, component replacements
  - Testing procedures (manual, E2E, accessibility)
  - Common issues and solutions
  - Estimated time: 2-3 hours implementation + 30-60 minutes testing
- Updated agent context files (GitHub Copilot)

### Phase 2: Tasks & Implementation (NOT CREATED BY /speckit.plan)
This phase is handled by `/speckit.tasks` and `/speckit.implement` commands. The planning phase ends here.

**Expected tasks** (for reference, not created by this plan):
1. Update E2E test selectors (test-first preparation)
2. Add accessibility test with axe-core
3. Install Fluent UI dependencies (`@fluentui/react-components`, `@fluentui/react-icons`)
4. Wrap form in FluentProvider with webLightTheme
5. Replace TextField components (title, classification, requestType, country)
6. Replace Dropdown components (category, subcategory)
7. Replace DatePicker components (date, altDate)
8. Replace multiline TextField components (description, comments)
9. Replace Button components (submit, draft)
10. Replace status messages with MessageBar
11. Implement character counters with Text component
12. Update validation error rendering (validationState, validationMessage props)
13. Test form functionality (manual, E2E, accessibility)
14. Verify bundle size (<150KB gzipped increase)
15. Commit changes and create PR

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations identified. Constitution check passed with action items:
- Update E2E test selectors before implementation (Test-First compliance)
- Add accessibility tests before implementation (Test-First compliance)

No additional projects, architectural patterns, or complexity introduced beyond existing structure.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fluent UI bundle size exceeds target (150KB gzipped) | High: Performance degradation on slow connections | Medium | Monitor bundle size during implementation; lazy load form component if needed; verify tree-shaking working |
| Fluent UI component API differs from expectations | Medium: Implementation delays, rework | Low | Research phase covered API; quickstart has examples; Fluent UI v9 is stable |
| E2E tests break due to selector changes | Medium: Test maintenance overhead | High | Update selectors before implementation; use data-testid attributes; rely on Fluent UI's accessible selectors (ARIA) |
| Accessibility regression with Fluent UI components | High: Compliance failure, user experience issues | Low | Fluent UI is WCAG 2.1 AA compliant by design; validate with axe-core; manual keyboard/screen reader testing |
| Date conversion logic introduces bugs | Medium: Validation errors, incorrect data submission | Medium | Test date edge cases (past dates, future dates, invalid dates); verify ISO string ↔ Date object conversion |
| Category → subcategory dependency breaks | Medium: User cannot select subcategory | Low | Preserve existing logic; test category change clears subcategory; test subcategory options update |

## Dependencies

**External Dependencies** (new):
- `@fluentui/react-components` v9.x (required, ~100KB gzipped)
- `@fluentui/react-icons` v9.x (optional, only if icons needed, ~20KB gzipped)

**Internal Dependencies** (existing):
- React 18.2.0 (compatible with Fluent UI v9)
- Vite 5.0.0 (build tool, tree-shaking support)
- Tailwind CSS 3.4.8 (layout utilities, no conflict with Fluent UI)
- MSAL Browser 4.28.1 / MSAL React 3.0.25 (authentication, unchanged)

**Cross-Feature Dependencies**:
- None (Feature 005 listview-drawer is independent; Feature 006 form is isolated)

**Backend Dependencies**:
- None (backend API unchanged)

## Success Metrics

From specification success criteria (SC-001 through SC-008):

1. **Component Replacement**: 100% of 11 form fields use Fluent UI components
2. **Validation UX**: All required fields display Fluent UI error states (red border + message) when empty
3. **Character Counters**: Real-time counters display for title, description, comments (format "X/Y")
4. **Responsive Layout**: Form adapts across 3 viewport sizes (mobile single-column, tablet/desktop multi-column)
5. **Functionality Preservation**: All existing features work (submission, draft, validation, auth, category dependency)
6. **Accessibility**: Zero critical violations in axe-core scan
7. **Visual Quality**: Form resembles SharePoint/Microsoft 365 appearance (stakeholder validation)
8. **Performance**: Form interactive within 2 seconds on 95% of test runs

**Measurement Methods**:
- Manual inspection (component replacement, visual quality)
- Automated E2E tests (functionality preservation)
- Automated accessibility scan (axe-core)
- Playwright performance metrics (load time)
- Bundle size analysis (`npm run build` → check dist/ output)

## Next Steps

This planning phase is **COMPLETE**. Phase 2 (tasks & implementation) is handled by separate commands.

**To proceed**:
1. **Review this plan**: Ensure technical approach, component mapping, and contracts are clear
2. **Run `/speckit.tasks`**: Generate detailed implementation tasks from this plan
3. **Run `/speckit.implement`**: Execute tasks with test-first approach
4. **Validate**: Manual testing, E2E tests, accessibility scan, bundle size check

**Branch**: `006-modern-form-ui` (already created and active)  
**Plan Location**: `specs/006-modern-form-ui/plan.md` (this file)  
**Generated Artifacts**: research.md, data-model.md, contracts/README.md, quickstart.md  
**Status**: Ready for implementation phase
