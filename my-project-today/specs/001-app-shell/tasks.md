# Implementation Tasks: App Shell

**Feature**: App Shell  
**Tech Stack**: React 18, Vite, Tailwind CSS, React Router, Playwright (E2E), axe-core (accessibility)  
**Total Tasks**: 38  
**Test Approach**: Component tests with DOM assertions, E2E tests with Playwright, accessibility scans with axe-core

---

## Implementation Strategy

**MVP Scope**: User Story 1 only (Desktop Navigation)  
Complete Phase 1 (Setup), Phase 2 (Foundational), and Phase 3 (US1) for a working desktop navigation shell.

**Incremental Delivery**:  
- **Iteration 1**: Desktop navigation (US1)
- **Iteration 2**: Add mobile responsiveness (US2)  
- **Iteration 3**: Add page header/content regions (US3)
- **Iteration 4**: Add footer (US4)
- **Iteration 5**: Accessibility hardening (US5)
- **Iteration 6**: Polish & optimization

Each user story phase is independently testable and deliverable.

---

## Phase 1: Setup (Project Initialization)

**Goal**: Initialize development environment and verify prerequisites

**Tasks**:
- [ ] T001 Verify Tailwind CSS configuration in src/client/tailwind.config.js
- [ ] T002 Verify PostCSS configuration in src/client/postcss.config.js
- [ ] T003 Verify React Router is installed and available in src/client/package.json
- [ ] T004 Verify Playwright is configured in src/client/e2e/playwright.config.ts
- [ ] T005 [P] Create design tokens in src/client/tailwind.config.js (colors, spacing, breakpoints)
- [ ] T006 [P] Create global styles in src/client/src/index.css (focus styles, base resets)
- [ ] T007 Run dev server to verify build pipeline works: `npm run dev` from src/client

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Set up shared infrastructure needed by all user stories

**Tasks**:
- [ ] T008 Create component directory structure: src/client/src/components/shell/
- [ ] T009 [P] Create navigation data model in src/client/src/components/shell/navigationData.js
- [ ] T010 [P] Create PageHeader data model in src/client/src/components/shell/pageHeaderData.js
- [ ] T011 Create AppShell layout wrapper component in src/client/src/components/shell/AppShell.jsx
- [ ] T012 Integrate AppShell into src/client/src/App.jsx
- [ ] T013 Create E2E test directory src/client/e2e/tests/shell/ if not exists
- [ ] T014 [P] Create baseline E2E test skeleton in src/client/e2e/tests/shell/app-shell.spec.ts

---

## Phase 3: User Story 1 - Desktop Navigation (P1)

**Story Goal**: Desktop users see a global header with logo and horizontal navigation links

**Independent Test Criteria**:
- ✅ At viewport >= 1024px, header is visible with logo on left
- ✅ Navigation links (Home, Dashboard, Meetings, Settings) are visible horizontally
- ✅ Account control placeholder visible on right
- ✅ All elements use semantic HTML (`<header>`, `<nav>`)

**Tasks**:
- [ ] T015 [US1] Create Header component in src/client/src/components/shell/Header.jsx
- [ ] T016 [P] [US1] Create Logo component in src/client/src/components/shell/Logo.jsx
- [ ] T017 [P] [US1] Create TopNav component in src/client/src/components/shell/TopNav.jsx
- [ ] T018 [P] [US1] Create AccountControl placeholder component in src/client/src/components/shell/AccountControl.jsx
- [ ] T019 [US1] Integrate Header, Logo, TopNav, and AccountControl in src/client/src/components/shell/AppShell.jsx
- [ ] T020 [US1] Add responsive classes to TopNav for desktop visibility (hidden on mobile) in src/client/src/components/shell/TopNav.jsx
- [ ] T021 [P] [US1] Add E2E test for desktop header structure in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T022 [P] [US1] Add E2E assertion for navigation links presence (Home, Dashboard, Meetings, Settings) in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T023 [US1] Run E2E test at desktop viewport (1024px) and verify all assertions pass

---

## Phase 4: User Story 2 - Mobile Navigation (P2)

**Story Goal**: Mobile users can access navigation via hamburger menu

**Independent Test Criteria**:
- ✅ At viewport <= 640px, hamburger button is visible
- ✅ Clicking hamburger opens navigation menu
- ✅ Navigation links are focusable and clickable in opened state
- ✅ Hamburger button has accessible label

**Tasks**:
- [ ] T024 [US2] Create HamburgerButton component in src/client/src/components/shell/HamburgerButton.jsx
- [ ] T025 [US2] Add mobile menu state management in src/client/src/components/shell/Header.jsx (useState for isOpen)
- [ ] T026 [US2] Create MobileNav component with overlay/slideover in src/client/src/components/shell/MobileNav.jsx
- [ ] T027 [US2] Add responsive visibility logic: hamburger visible at mobile, TopNav hidden at mobile in src/client/src/components/shell/Header.jsx
- [ ] T028 [US2] Add ARIA attributes to HamburgerButton (aria-label, aria-expanded) in src/client/src/components/shell/HamburgerButton.jsx
- [ ] T029 [P] [US2] Add E2E test for hamburger button presence at mobile viewport (640px) in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T030 [P] [US2] Add E2E test for hamburger click behavior (menu opens, links visible) in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T031 [US2] Run E2E test at mobile viewport and verify hamburger interaction works

---

## Phase 5: User Story 3 - Page Header + Content (P3)

**Story Goal**: Each page displays a descriptive page header with title and main content region

**Independent Test Criteria**:
- ✅ PageHeader component renders h1 with title
- ✅ Main content region uses `<main>` landmark
- ✅ Optional subtitle and breadcrumb are supported
- ✅ DOM structure includes header[role="banner"] and main

**Tasks**:
- [ ] T032 [US3] Create PageHeader component in src/client/src/components/shell/PageHeader.jsx
- [ ] T033 [US3] Create MainContent wrapper component in src/client/src/components/shell/MainContent.jsx
- [ ] T034 [US3] Integrate PageHeader and MainContent in src/client/src/components/shell/AppShell.jsx
- [ ] T035 [US3] Add support for title, subtitle, breadcrumb props in PageHeader component in src/client/src/components/shell/PageHeader.jsx
- [ ] T036 [P] [US3] Add E2E test for PageHeader h1 presence and text content in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T037 [P] [US3] Add E2E test for main landmark and structure in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T038 [US3] Run E2E test and verify PageHeader renders correctly with test data

---

## Phase 6: User Story 4 - Global Footer (P4)

**Story Goal**: All pages display a global footer with legal links and version info

**Independent Test Criteria**:
- ✅ Footer is visible on all routes
- ✅ Footer contains legal links (Privacy, Terms)
- ✅ Footer contains copyright text and version placeholder
- ✅ Footer uses semantic `<footer>` element

**Tasks**:
- [ ] T039 [US4] Create Footer component in src/client/src/components/shell/Footer.jsx
- [ ] T040 [US4] Add footer content: copyright, legal links (Privacy, Terms), version placeholder in src/client/src/components/shell/Footer.jsx
- [ ] T041 [US4] Integrate Footer into AppShell component in src/client/src/components/shell/AppShell.jsx
- [ ] T042 [P] [US4] Add E2E test for footer presence in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T043 [P] [US4] Add E2E assertion for footer links (Privacy, Terms) in src/client/e2e/tests/shell/app-shell.spec.ts
- [ ] T044 [US4] Run E2E test and verify footer appears on all test routes

---

## Phase 7: User Story 5 - Accessibility (P5)

**Story Goal**: Shell is fully keyboard navigable and passes automated accessibility scans

**Independent Test Criteria**:
- ✅ All interactive elements are keyboard operable
- ✅ Primary navigation links reachable within 3 tab presses from page load
- ✅ Zero critical accessibility violations from axe-core scan
- ✅ Visible focus styles on all interactive elements
- ✅ Hamburger menu toggle is screen reader accessible

**Tasks**:
- [ ] T045 [US5] Add keyboard focus styles to navigation links in src/client/src/components/shell/TopNav.jsx
- [ ] T046 [US5] Add keyboard focus styles to hamburger button in src/client/src/components/shell/HamburgerButton.jsx
- [ ] T047 [US5] Verify focus order: logo -> nav links -> account control in src/client/src/components/shell/Header.jsx
- [ ] T048 [US5] Add focus trap for mobile menu when open in src/client/src/components/shell/MobileNav.jsx
- [ ] T049 [US5] Add ESC key handler to close mobile menu in src/client/src/components/shell/MobileNav.jsx
- [ ] T050 [P] [US5] Install axe-core or @axe-core/playwright in src/client: `npm install -D @axe-core/playwright`
- [ ] T051 [P] [US5] Create accessibility test file in src/client/e2e/tests/shell/accessibility.spec.ts
- [ ] T052 [US5] Add axe-core scan in accessibility test for app shell pages in src/client/e2e/tests/shell/accessibility.spec.ts
- [ ] T053 [US5] Add E2E test for keyboard navigation (tab order) in src/client/e2e/tests/shell/accessibility.spec.ts
- [ ] T054 [US5] Run accessibility tests and verify zero critical violations

---

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Performance optimization, visual regression, documentation

**Tasks**:
- [ ] T055 [P] Add Playwright visual snapshot tests for header at 3 breakpoints (mobile/tablet/desktop) in src/client/e2e/tests/shell/visual.spec.ts
- [ ] T056 [P] Add Playwright visual snapshot tests for footer in src/client/e2e/tests/shell/visual.spec.ts
- [ ] T057 Measure cold load time and verify shell loads within 1.5s in src/client/e2e/tests/shell/performance.spec.ts
- [ ] T058 Add code comments and JSDoc to AppShell component in src/client/src/components/shell/AppShell.jsx
- [ ] T059 Update README with shell usage examples in src/client/README.md
- [ ] T060 Run full E2E suite and verify all tests pass: `npm run e2e` from src/client

---

## Dependencies & Execution Order

### Story Dependencies
```
Phase 1 (Setup) → Phase 2 (Foundational) → [
  Phase 3 (US1) → Phase 4 (US2),
  Phase 5 (US3),
  Phase 6 (US4)
] → Phase 7 (US5) → Phase 8 (Polish)
```

**Blocking relationships**:
- US2 (Mobile Nav) requires US1 (Desktop Nav) - builds on same Header component
- US5 (Accessibility) requires all UI stories (US1-US4) complete
- Phase 8 (Polish) requires all functional stories complete

**Independent stories** (can be developed in parallel after Phase 2):
- US3 (Page Header) - independent component
- US4 (Footer) - independent component

### Parallel Execution Opportunities

**Within User Story 1 (Desktop Navigation)**:
- T016 (Logo), T017 (TopNav), T018 (AccountControl) can be built in parallel
- T021 (E2E header test), T022 (E2E nav links test) can be written in parallel

**Within User Story 2 (Mobile Navigation)**:
- T029 (E2E hamburger presence), T030 (E2E hamburger click) can be written in parallel

**Within User Story 3 (Page Header)**:
- T036 (E2E PageHeader test), T037 (E2E main landmark test) can be written in parallel

**Within User Story 4 (Footer)**:
- T042 (E2E footer presence), T043 (E2E footer links) can be written in parallel

**Within User Story 5 (Accessibility)**:
- T045-T049 (focus styles and keyboard handlers) can be implemented in parallel across components
- T050 (install axe-core), T051 (create accessibility test) can be done in parallel
- T052 (axe scan), T053 (keyboard nav test) can be written in parallel

**Within Phase 8 (Polish)**:
- T055 (visual snapshot header), T056 (visual snapshot footer), T057 (performance test) can be written in parallel

---

## Task Summary

| Phase | User Story | Task Count | Parallel Opportunities |
|-------|-----------|------------|------------------------|
| Phase 1 | Setup | 7 | T005-T006 (2 tasks) |
| Phase 2 | Foundational | 7 | T009-T010, T014 (3 tasks) |
| Phase 3 | US1 - Desktop Nav | 9 | T016-T018, T021-T022 (5 tasks) |
| Phase 4 | US2 - Mobile Nav | 8 | T029-T030 (2 tasks) |
| Phase 5 | US3 - Page Header | 7 | T036-T037 (2 tasks) |
| Phase 6 | US4 - Footer | 6 | T042-T043 (2 tasks) |
| Phase 7 | US5 - Accessibility | 10 | T050-T053 (4 tasks) |
| Phase 8 | Polish | 6 | T055-T057 (3 tasks) |
| **Total** | **5 stories** | **60** | **23 parallel tasks** |

---

## Notes

- **Test markers**: `[P]` indicates tasks that can be executed in parallel with other `[P]` tasks in the same phase
- **Story labels**: `[US1]` through `[US5]` map to user stories in spec.md
- **File paths**: All paths are relative to repository root `c:\Users\arath\my-project-today\`
- **Test approach**: Tests are included per specification requirement; E2E tests verify each user story's acceptance criteria
- **MVP recommendation**: Complete Phase 1-3 (Setup + Foundational + US1) for minimal viable desktop navigation shell
- **Incremental verification**: Run E2E tests after completing each user story phase to verify independence
- **Accessibility**: US5 tasks should be integrated throughout development; Phase 7 is for hardening and verification
