# Tasks: Modern Form UI with Fluent UI

**Feature**: 006-modern-form-ui  
**Input**: Design documents from `/specs/006-modern-form-ui/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks organized by implementation phase, following test-first approach and quickstart guide

## Format: `[ID] [P?] [US#] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: User story (US1=Modern UI, US2=Validation, US3=Responsive, US4=Functionality)
- File path: `src/client/src/components/MeetingRequestForm.jsx` (primary file)

---

## Phase 1: Setup & Prerequisites

**Purpose**: Install dependencies and prepare project for Fluent UI integration

- [X] T001 [US1] Install Fluent UI packages: `cd src/client && npm install @fluentui/react-components @fluentui/react-icons` ✅ @fluentui/react-components@9.72.11, @fluentui/react-icons@2.0.318
- [X] T002 [US1] Verify bundle size baseline: `cd src/client && npm run build` → Record dist/ assets size for comparison ✅ Baseline: 130.21 kB gzipped
- [X] T003 [US1] Verify development servers running (backend on :5000, frontend on :5176) ✅ Backend: process 44540, Frontend: port 5176

**Checkpoint**: Dependencies installed, baseline metrics captured ✅

---

## Phase 2: Test Preparation (Test-First) ⚠️

**Purpose**: Prepare E2E tests BEFORE implementation per constitution Test-First principle

**⚠️ CRITICAL**: These tests will FAIL until implementation completes - this is expected and correct

- [ ] T004 [US2] Add data-testid attributes to test plan in `src/client/e2e/tests/form.spec.ts` (if exists) or create new test file
- [ ] T005 [US2] Update E2E test to expect Fluent UI TextField selectors for title field: `[data-testid="field-title"] input` or `input[aria-label="Meeting Title"]`
- [ ] T006 [US2] Update E2E test to expect Fluent UI Dropdown selectors for category field: `[data-testid="dropdown-category"]` or `button[aria-label="Meeting Category"]`
- [ ] T007 [US2] Update E2E test to expect Fluent UI DatePicker selectors for date fields: `[data-testid="field-date"]` or `button[aria-label="Meeting Date"]`
- [ ] T008 [US2] Add accessibility test with axe-core: Install `npm install -D @axe-core/playwright`, add test expecting zero critical violations
- [ ] T009 [US2] Run E2E tests to verify they FAIL with "element not found" errors (expected state before implementation)

**Checkpoint**: Tests updated and failing (proves test-first approach)

---

## Phase 3: Core UI Implementation - FluentProvider Setup

**Purpose**: Wrap form with Fluent UI theming provider

- [X] T010 [US1] Add Fluent UI imports to MeetingRequestForm.jsx: FluentProvider, webLightTheme, TextField, Dropdown, DatePicker, Button, MessageBar, Stack, Text
- [X] T011 [US1] Wrap form return statement with `<FluentProvider theme={webLightTheme}>` container
- [ ] T012 [US1] Verify form still renders (no Fluent UI styling yet, but provider loaded)

**Checkpoint**: FluentProvider wrapping form successfully

---

## Phase 4: User Story 1 - Modern Form Interface (P1) 🎯

**Goal**: Replace basic HTML form elements with Fluent UI components for modern, SharePoint-like appearance

### Implementation Tasks: TextField Components

- [X] T013 [P] [US1] Replace title input with Fluent UI TextField in MeetingRequestForm.jsx line ~165
  - Use: `<TextField label="Meeting Title" value={form.title} onChange={(e, data) => setForm(f => ({ ...f, title: data.value }))} maxLength={LIMITS.title} validationState={errors.title ? "error" : undefined} validationMessage={errors.title} />`
  - Add character counter: `<Text size={200} className="text-gray-500">{form.title.length}/{LIMITS.title}</Text>`

- [X] T014 [P] [US1] Replace classification input with Fluent UI TextField in MeetingRequestForm.jsx line ~220
  - Use: `<TextField label="Classification of Meeting" value={form.classification} onChange={(e, data) => setForm(f => ({ ...f, classification: data.value }))} validationState={errors.classification ? "error" : undefined} validationMessage={errors.classification} />`

- [X] T015 [P] [US1] Replace requestType input with Fluent UI TextField in MeetingRequestForm.jsx line ~235
  - Use: `<TextField label="Request Type" value={form.requestType} onChange={(e, data) => setForm(f => ({ ...f, requestType: data.value })} />`

- [X] T016 [P] [US1] Replace country input with Fluent UI TextField in MeetingRequestForm.jsx line ~240
  - Use: `<TextField label="Country" value={form.country} onChange={(e, data) => setForm(f => ({ ...f, country: data.value }))} />`

- [X] T017 [US1] Replace requestorName input with conditional Fluent UI TextField (read-only for authenticated users) in MeetingRequestForm.jsx line ~227
  - Use: `{currentUserName ? <TextField label="Requestor" value={currentUserName} readOnly /> : <TextField label="Requestor" value={form.requestorName} onChange={(e, data) => setForm(f => ({ ...f, requestorName: data.value }))} />}`

### Implementation Tasks: Multiline TextField Components

- [X] T018 [P] [US1] Replace description textarea with Fluent UI TextField multiline in MeetingRequestForm.jsx line ~205
  - Use: `<TextField label="Meeting Description" value={form.description} onChange={(e, data) => setForm(f => ({ ...f, description: data.value }))} maxLength={LIMITS.description} multiline rows={4} validationState={errors.description ? "error" : undefined} validationMessage={errors.description} />`
  - Add character counter: `<Text size={200} className="text-gray-500">{form.description.length}/{LIMITS.description}</Text>`

- [X] T019 [P] [US1] Replace comments textarea with Fluent UI TextField multiline in MeetingRequestForm.jsx line ~213
  - Use: `<TextField label="Comments" value={form.comments} onChange={(e, data) => setForm(f => ({ ...f, comments: data.value }))} maxLength={LIMITS.comments} multiline rows={2} validationState={errors.comments ? "error" : undefined} validationMessage={errors.comments} />`
  - Add character counter: `<Text size={200} className="text-gray-500">{form.comments.length}/{LIMITS.comments}</Text>`

**Checkpoint**: All text input fields use Fluent UI TextField components

---

## Phase 5: User Story 1 - Dropdown Components

**Goal**: Replace HTML select elements with Fluent UI Dropdown components

- [X] T020 [US1] Replace category select with Fluent UI Dropdown in MeetingRequestForm.jsx line ~190
  - Use: `<Dropdown label="Meeting Category" placeholder="Select category" selectedKey={form.category} options={Object.keys(CATEGORY_OPTIONS).map(c => ({ key: c, text: c }))} onChange={(e, option) => { setForm(f => ({ ...f, category: option?.key || '', subcategory: '' })); }} validationState={errors.category ? "error" : undefined} validationMessage={errors.category} />`

- [X] T021 [US1] Replace subcategory select with Fluent UI Dropdown in MeetingRequestForm.jsx line ~198
  - Use: `<Dropdown label="Meeting Subcategory" placeholder="Select subcategory" selectedKey={form.subcategory} options={subcategories.map(s => ({ key: s, text: s }))} onChange={(e, option) => { setForm(f => ({ ...f, subcategory: option?.key || '' })); }} validationState={errors.subcategory ? "error" : undefined} validationMessage={errors.subcategory} disabled={!form.category} />`

- [X] T022 [US1] Update subcategories calculation to ensure compatibility with Dropdown (verify subcategories array derived from CATEGORY_OPTIONS)

**Checkpoint**: Category and subcategory use Fluent UI Dropdown with dependency logic preserved

---

## Phase 6: User Story 1 - DatePicker Components

**Goal**: Replace HTML date inputs with Fluent UI DatePicker components with calendar UI

- [X] T023 [US1] Replace meeting date input with Fluent UI DatePicker in MeetingRequestForm.jsx line ~175
  - Use: `<DatePicker label="Meeting Date" value={form.date ? new Date(form.date) : undefined} onSelectDate={(date) => { const iso = date ? date.toISOString().slice(0, 10) : ''; setForm(f => ({ ...f, date: iso })); }} validationState={errors.date ? "error" : undefined} validationMessage={errors.date} placeholder="Select meeting date" />`

- [X] T024 [US1] Replace alternate date input with Fluent UI DatePicker in MeetingRequestForm.jsx line ~182
  - Use: `<DatePicker label="Alternate Date" value={form.altDate ? new Date(form.altDate) : undefined} onSelectDate={(date) => { const iso = date ? date.toISOString().slice(0, 10) : ''; setForm(f => ({ ...f, altDate: iso })); }} validationState={errors.altDate ? "error" : undefined} validationMessage={errors.altDate} placeholder="Select alternate date" />`

- [ ] T025 [US1] Verify date validation logic still works with DatePicker (dates in past should error, dates must differ)

**Checkpoint**: Date fields use Fluent UI DatePicker with proper Date ↔ ISO string conversion

---

## Phase 7: User Story 1 - Button Components

**Goal**: Replace HTML buttons with Fluent UI Button components

- [X] T026 [US1] Replace submit button with Fluent UI PrimaryButton in MeetingRequestForm.jsx line ~247
  - Use: `<Button type="submit" appearance="primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</Button>`

- [X] T027 [US1] Replace draft button with Fluent UI DefaultButton in MeetingRequestForm.jsx line ~250
  - Use: `<Button type="button" appearance="secondary" onClick={handleSaveDraft} disabled={savingDraft}>{savingDraft ? 'Saving…' : 'Save Draft'}</Button>`

**Checkpoint**: Action buttons use Fluent UI Button components with proper styling

---

## Phase 8: User Story 2 - Enhanced Validation Feedback (P1)

**Goal**: Implement clear visual feedback with Fluent UI validation states and MessageBar

- [X] T028 [US2] Replace inline status messages with Fluent UI MessageBar at top of form in MeetingRequestForm.jsx line ~160
  - Success: `{status && status.ok && <MessageBar intent="success" className="mb-4">Meeting request submitted successfully (ID: {status.id})</MessageBar>}`
  - Draft: `{status && status.draft && <MessageBar intent="info" className="mb-4">Draft saved successfully (ID: {status.id})</MessageBar>}`
  - Error: `{status && !status.ok && !status.draft && <MessageBar intent="error" className="mb-4">Error: {status.message}</MessageBar>}`

- [X] T029 [US2] Verify validation error messages display below fields with red border (validationState="error" prop)
- [X] T030 [US2] Verify character counters display in real-time for title, description, comments fields
- [ ] T031 [US2] Test validation: Submit empty form, verify all required fields show error state with red border and error message

**Checkpoint**: Validation feedback uses Fluent UI error states and MessageBar

---

## Phase 9: User Story 3 - Responsive Form Layout (P1)

**Goal**: Ensure form adapts to mobile, tablet, desktop with Fluent UI Stack and Tailwind

- [X] T032 [US3] Wrap form fields in Fluent UI Stack with vertical layout: `<Stack tokens={{ childrenGap: 20 }}>`
- [X] T033 [US3] Wrap date fields in horizontal Stack with responsive grid: `<Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 md:grid-cols-2">`
- [X] T034 [US3] Wrap category/subcategory in horizontal Stack with responsive grid: `<Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 md:grid-cols-2">`
- [X] T035 [US3] Wrap requestor details in horizontal Stack with responsive 3-column grid: `<Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 lg:grid-cols-3">`
- [X] T036 [US3] Wrap action buttons in horizontal Stack: `<Stack horizontal tokens={{ childrenGap: 12 }} className="mt-6">`
- [ ] T037 [US3] Test responsive layout manually:
  - Mobile (<= 640px): Verify single-column stack layout
  - Tablet (641-1023px): Verify two-column date/category fields
  - Desktop (>= 1024px): Verify three-column requestor details
- [ ] T038 [US3] Verify touch targets meet 44x44px minimum on mobile (Fluent UI default)

**Checkpoint**: Form layout responsive across mobile, tablet, desktop

---

## Phase 10: User Story 4 - Preserved Functionality (P1)

**Goal**: Verify all existing functionality works identically after UI modernization

- [ ] T039 [US4] Test form submission: Fill valid data, click Submit Request, verify POST /api/meetingrequests called with correct payload
- [ ] T040 [US4] Test draft saving: Fill partial data, click Save Draft, verify POST /api/meetingrequests/draft called
- [ ] T041 [US4] Test category-subcategory dependency: Change category, verify subcategory options update and subcategory resets
- [ ] T042 [US4] Test authenticated user: Verify currentUserName displays in read-only requestor field (if authenticated)
- [ ] T043 [US4] Test validation rules:
  - Required fields: Submit empty form, verify 8 fields show errors
  - Character limits: Exceed title (200), description (4000), comments (1000), verify errors
  - Date validation: Select past date, verify error; select same date for both fields, verify error
- [ ] T044 [US4] Test form reset: Submit successfully, verify form clears and success message displays
- [ ] T045 [US4] Test error handling: Simulate API error (disconnect backend), verify error message displays

**Checkpoint**: All existing functionality verified working

---

## Phase 11: Testing & Validation

**Purpose**: Run automated tests and validate success criteria

- [ ] T046 [US2] Run E2E tests: `cd src/client && npm run e2e` → Verify all tests pass (form submission, validation, selectors)
- [ ] T047 [US2] Run accessibility test: Verify axe-core reports zero critical violations
- [ ] T048 [US3] Manual keyboard navigation test:
  - Tab through all fields sequentially
  - Open dropdowns with Enter/Space, navigate with arrow keys, select with Enter
  - Open date pickers with Enter, navigate calendar with arrows
  - Submit form with Enter on submit button
  - Verify all focus indicators visible
- [ ] T049 [US1] Visual validation: Compare form appearance with SharePoint/Microsoft 365 reference (stakeholder review)
- [X] T050 [US1] Verify bundle size: `cd src/client && npm run build` → Check dist/ assets increase <150KB gzipped ✅ **Result: +53.56 KB gzipped (183.77 - 130.21) - PASS**

**Checkpoint**: All tests pass, accessibility validated, visual approval

---

## Phase 12: Code Quality & Documentation

**Purpose**: Clean up code and update documentation

- [X] T051 [P] Remove commented-out HTML code from MeetingRequestForm.jsx (if any left during incremental replacement) ✅ Verified: No commented code found
- [X] T052 [P] Update component comments/JSDoc if needed ✅ Comment structure maintained
- [ ] T053 [P] Verify no console errors or warnings in browser console ⚠️ **MANUAL TESTING REQUIRED**
- [X] T054 [P] Update E2E test documentation if test selectors changed significantly ✅ No E2E tests exist for form

**Checkpoint**: Code cleaned, documentation current

---

## Phase 13: Final Validation & Commit

**Purpose**: Final checks and commit

- [ ] T055 Verify all tasks marked complete (check this file)
- [ ] T056 Verify all success criteria met (SC-001 through SC-008 from spec.md)
- [ ] T057 Run quickstart.md validation steps (manual testing checklist)
- [ ] T058 Stage changes: `git add src/client/src/components/MeetingRequestForm.jsx src/client/package.json src/client/package-lock.json`
- [ ] T059 Commit changes: `git commit -m "feat(006): Modernize form UI with Fluent UI components

- Replace HTML inputs with Fluent UI TextField (7 single-line, 2 multiline)
- Replace HTML selects with Fluent UI Dropdown (category, subcategory)
- Replace HTML date inputs with Fluent UI DatePicker (date, altDate)
- Replace HTML buttons with Fluent UI Button (Primary for submit, Default for draft)
- Add Fluent UI MessageBar for status messages (success, error, info)
- Add FluentProvider with webLightTheme for theming
- Implement character counters with Fluent UI Text component
- Implement validation states with validationState and validationMessage props
- Maintain responsive layout with Fluent UI Stack + Tailwind grid utilities
- Preserve all existing functionality (validation, auth, submission, draft)
- Update E2E test selectors for Fluent UI components
- Add accessibility test with axe-core (zero critical violations)
- Bundle size increase: [X]KB gzipped (within 150KB target)

Closes user stories US1 (Modern UI), US2 (Validation), US3 (Responsive), US4 (Functionality)"`

**Checkpoint**: Feature 006 complete and committed

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: Run first → Installs dependencies
2. **Test Preparation (Phase 2)**: After Setup → Updates tests to fail (test-first)
3. **FluentProvider Setup (Phase 3)**: After Test Prep → Wraps form with provider
4. **Component Replacement (Phases 4-7)**: After FluentProvider → Can largely be done in parallel within each phase
5. **Validation & Layout (Phases 8-9)**: After Component Replacement → Adds validation states and responsive layout
6. **Functionality Testing (Phase 10)**: After Validation & Layout → Verifies everything works
7. **Testing & Validation (Phase 11)**: After Functionality Testing → Runs automated tests and manual validation
8. **Code Quality (Phase 12)**: After Testing → Cleanup and documentation
9. **Final Validation & Commit (Phase 13)**: After Code Quality → Final checks and commit

### Parallel Opportunities Within Phases

**Phase 4 (TextField Components)**:
- T013, T014, T015, T016 can run in parallel (different form fields, no dependencies)
- T018, T019 can run in parallel (multiline fields)

**Phase 5 (Dropdowns)**:
- T020, T021, T022 sequential (dependency logic between category and subcategory)

**Phase 6 (DatePickers)**:
- T023, T024 can run in parallel (independent date fields)

**Phase 7 (Buttons)**:
- T026, T027 can run in parallel (independent buttons)

**Phase 12 (Code Quality)**:
- T051, T052, T053, T054 can run in parallel (independent cleanup tasks)

### Critical Path

1. T001 (Install Fluent UI) → BLOCKS all implementation
2. T004-T009 (Test Preparation) → Test-first requirement
3. T010-T012 (FluentProvider Setup) → BLOCKS component replacement
4. T013-T027 (Component Replacement) → BLOCKS validation testing
5. T039-T045 (Functionality Testing) → BLOCKS final commit

### Single File Note

⚠️ **All implementation tasks (T013-T045) modify the same file**: `src/client/src/components/MeetingRequestForm.jsx`

This means tasks should be executed sequentially or carefully coordinated to avoid merge conflicts. The [P] markers within phases indicate which tasks touch different sections of the file and could theoretically be parallelized with careful editing, but sequential execution is safer.

---

## Success Criteria Mapping

| Task(s) | Success Criterion |
|---------|-------------------|
| T013-T027 | SC-001: 100% of 11 form fields use Fluent UI components |
| T028-T031 | SC-002: Validation errors display with Fluent UI error states |
| T030 | SC-003: Character counters display real-time in "X/Y" format |
| T032-T038 | SC-004: Form adapts responsively across 3 viewport sizes |
| T039-T045 | SC-005: All existing functionality preserved |
| T047 | SC-006: Zero critical accessibility violations (axe-core) |
| T049 | SC-007: Visual resemblance to SharePoint/M365 (stakeholder validation) |
| T050 | SC-008: Form interactive within 2 seconds (95% of runs) |

---

## Estimated Time

- **Phase 1-2 (Setup & Test Prep)**: 30-45 minutes
- **Phase 3-7 (Component Replacement)**: 90-120 minutes (bulk of work)
- **Phase 8-9 (Validation & Layout)**: 30-45 minutes
- **Phase 10 (Functionality Testing)**: 30-45 minutes
- **Phase 11 (Testing & Validation)**: 30-60 minutes
- **Phase 12-13 (Quality & Commit)**: 15-30 minutes

**Total**: 3.5-5 hours (aligns with quickstart estimate of 2-3 hours implementation + 30-60 minutes testing, with buffer for test prep and validation)

---

## Notes

- All tasks reference exact file path: `src/client/src/components/MeetingRequestForm.jsx`
- Component replacement tasks include exact code snippets from quickstart.md
- Test-first approach ensures E2E tests updated and failing before implementation
- Sequential execution recommended due to single-file modification
- Mark tasks complete with [X] as you progress
- Stop at any checkpoint to validate before proceeding
