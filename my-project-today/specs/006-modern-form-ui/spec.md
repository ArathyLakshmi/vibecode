# Feature Specification: Modern Form UI with Fluent UI

**Feature Branch**: `006-modern-form-ui`  
**Created**: 2026-02-11  
**Status**: Draft  
**Input**: User description: "Update UI of new request form similar to sharepoint site. use fluent ui controls and tailwind.css. make it responsive and modern"

## Problem Statement

The current meeting request form (MeetingRequestForm.jsx) uses basic HTML input elements with minimal Tailwind styling. While functional, the form lacks the modern, polished appearance of SharePoint and Microsoft 365 applications. Users expect a cohesive, professional UI that aligns with enterprise standards and provides enhanced usability through better visual feedback, clearer validation states, and improved form controls.

## Objectives

- Transform the meeting request form into a modern, SharePoint-style interface
- Integrate Microsoft Fluent UI React components for consistent Microsoft 365 look and feel
- Maintain responsive design for mobile, tablet, and desktop devices
- Enhance user experience with improved form controls (date pickers, dropdowns, character counters)
- Preserve all existing functionality (validation, draft saving, submission, authentication)
- Combine Fluent UI theming with Tailwind CSS utility classes for optimal styling flexibility

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modern Form Interface (Priority: P1)

A user navigates to the meeting request form and sees a modern, SharePoint-style interface with professional form controls, clear visual hierarchy, and polished styling.

**Why this priority**: The visual appearance and professional look directly impact user confidence and adoption. A modern UI signals quality and aligns with enterprise standards.

**Independent Test**: Navigate to the form page, visually inspect that form uses Fluent UI components (TextField, Dropdown, DatePicker, etc.), verify styling resembles SharePoint/Microsoft 365, check that the form layout is clean with proper spacing and visual hierarchy.

**Acceptance Scenarios**:

1. **Given** a user visits the form, **When** the page loads, **Then** all text inputs use Fluent UI TextField component with proper labels, placeholders, and styling.
2. **Given** a user views the form, **When** examining dropdown fields (category, subcategory), **Then** Fluent UI Dropdown component is used with proper option rendering and selection states.
3. **Given** a user views date fields, **When** clicking on date inputs, **Then** Fluent UI DatePicker component opens with calendar view for date selection.
4. **Given** a user views the form, **When** examining the overall layout, **Then** the form displays clear visual hierarchy with section grouping, consistent spacing (using Stack/StackItem), and modern typography.

---

### User Story 2 - Enhanced Validation Feedback (Priority: P1)

A user fills out the form and receives clear, immediate visual feedback on field validation states, including error messages, character limits, and required field indicators.

**Why this priority**: Clear validation feedback is essential for user experience and reduces form submission errors. Fluent UI provides built-in validation states that are more visible and user-friendly than basic HTML.

**Independent Test**: Submit form with empty required fields, enter invalid data (dates in past, exceeding character limits), verify error messages display with Fluent UI error styling (red indicators, error text below fields), verify character counters update in real-time.

**Acceptance Scenarios**:

1. **Given** a user submits the form with empty required fields, **When** validation runs, **Then** Fluent UI TextField/Dropdown components display error state (red border) with specific error messages below each field.
2. **Given** a user types in a text field with character limit, **When** approaching or exceeding the limit, **Then** a character counter displays (e.g., "150/200") and turns red when limit is exceeded.
3. **Given** a user selects a past date, **When** field loses focus, **Then** date field shows error state with message "Meeting date cannot be in the past".
4. **Given** a user fixes validation errors, **When** entering valid data, **Then** error states clear immediately and fields display success state (or neutral state).

---

### User Story 3 - Responsive Form Layout (Priority: P1)

A user accesses the form on mobile, tablet, or desktop devices and experiences a layout that adapts appropriately to the screen size, maintaining usability and readability.

**Why this priority**: Users need to create meeting requests from various devices. Responsive design ensures the form is usable regardless of device.

**Independent Test**: Open form on mobile viewport (<= 640px), tablet (641-1023px), and desktop (>= 1024px), verify layout adjusts (single column on mobile, adaptive columns on larger screens), verify all controls remain accessible and properly sized, verify no horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** a mobile viewport (<= 640px), **When** the form renders, **Then** all fields stack vertically in single column, date fields stack vertically instead of side-by-side, action buttons stack or wrap appropriately.
2. **Given** a tablet viewport (641-1023px), **When** the form renders, **Then** date fields display side-by-side (2 columns), category/subcategory display side-by-side, form maintains readability with appropriate field widths.
3. **Given** a desktop viewport (>= 1024px), **When** the form renders, **Then** layout optimizes for wider screen with multi-column arrangements where appropriate (dates, category/subcategory, requestor details in 3 columns).
4. **Given** any viewport size, **When** user interacts with form controls, **Then** dropdowns, date pickers, and text fields render with appropriate sizes and touch targets (minimum 44x44px for mobile).

---

### User Story 4 - Preserved Functionality (Priority: P1)

A user interacts with the modernized form and all existing functionality works identically to the previous version: form submission, draft saving, field dependencies (category → subcategory), authentication integration, and data validation.

**Why this priority**: Modernization should enhance the UI without breaking existing features. Users expect the form to function reliably.

**Independent Test**: Fill out form completely and submit, verify data saves to backend with correct payload, save draft and verify draft endpoint called, change category and verify subcategory options update, verify authenticated user's name displays in requestor field, verify all validation rules still apply.

**Acceptance Scenarios**:

1. **Given** a user fills valid data and clicks Submit, **When** form submits, **Then** POST /api/meetingrequests is called with correct payload, success message displays using Fluent UI MessageBar component, form resets after successful submission.
2. **Given** a user fills partial data and clicks Save Draft, **When** draft saves, **Then** POST /api/meetingrequests/draft is called, success message displays ("Draft saved (id: {id})"), form data persists in state.
3. **Given** a user selects a category, **When** category changes, **Then** subcategory dropdown updates to show only relevant options, subcategory resets if previous value not in new options.
4. **Given** an authenticated user loads the form, **When** form initializes, **Then** requestor field displays user's name from MSAL (read-only), other fields remain editable.
5. **Given** a user sets the same date for meeting date and alternate date, **When** validation runs, **Then** error message displays: "Alternate date must differ from meeting date".

---

### Edge Cases

- **Long field values**: Fields with maximum character limits (title: 200, description: 4000, comments: 1000) should handle long text gracefully, display character counter, prevent typing beyond limit or show clear error.
- **Subcategory dependency**: When category changes, if current subcategory is invalid for new category, subcategory should reset to empty and show validation error if required.
- **Date validation**: Dates in the past should show error, dates far in the future should be allowed, invalid date formats should be prevented by DatePicker component.
- **Form state during submission**: While submitting or saving draft, disable form controls and show loading indicator on button to prevent duplicate submissions.
- **Authentication edge cases**: If user is not authenticated, requestor name field should be editable input; if authentication token acquisition fails, form should still allow submission without token (backend handles 401).
- **Dropdown overflow**: Category/subcategory dropdowns with many options should render with appropriate max height and scrolling.
- **Touch targets on mobile**: All interactive elements (buttons, dropdowns, date picker triggers) should meet minimum 44x44px touch target size on mobile devices.
- **Accessibility**: Form must be keyboard navigable, screen reader accessible, maintain proper focus management, and display error messages in aria-live regions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Replace all HTML `<input type="text">` elements with Fluent UI `TextField` component, maintaining all existing props (name, value, onChange, maxLength).
- **FR-002**: Replace HTML `<textarea>` elements with Fluent UI `TextField` component using `multiline` prop for description and comments fields.
- **FR-003**: Replace HTML `<input type="date">` elements with Fluent UI `DatePicker` component for meeting date and alternate date fields.
- **FR-004**: Replace HTML `<select>` elements with Fluent UI `Dropdown` component for category and subcategory fields.
- **FR-005**: Replace submit and draft buttons with Fluent UI `PrimaryButton` (submit) and `DefaultButton` (draft) components.
- **FR-006**: Implement character counters using Fluent UI `Label` or `Text` component, displaying current/max length (e.g., "150/200") for title, description, and comments fields.
- **FR-007**: Display validation error messages using Fluent UI's `errorMessage` prop on TextField/Dropdown components, showing specific error text below each field.
- **FR-008**: Use Fluent UI `MessageBar` component to display form-level status messages (success, error, draft saved) at top of form.
- **FR-009**: Implement responsive layout using Fluent UI `Stack` component with responsive `tokens` for spacing, ensuring single-column layout on mobile (<= 640px) and multi-column on larger screens.
- **FR-010**: Apply Tailwind CSS utility classes for container layout (max-w-2xl, mx-auto, p-6), background (bg-white), and positioning alongside Fluent UI components.
- **FR-011**: Maintain all existing validation rules from original form: required fields, character limits, date validation (no past dates, dates must differ), and display errors accordingly.
- **FR-012**: Preserve MSAL authentication integration: display authenticated user's name in read-only requestor field, include Authorization header in API requests.
- **FR-013**: Ensure form submission and draft saving functionality remains identical: POST to /api/meetingrequests for submit, POST to /api/meetingrequests/draft for draft, with proper error handling.
- **FR-014**: Implement loading states: disable all form controls during submission/draft save, show spinner or loading text on action buttons.
- **FR-015**: Maintain category → subcategory dependency: when category changes, update subcategory options dynamically, reset subcategory if invalid.

### Non-Functional Requirements

- **NFR-001**: Form must render and become interactive within 2 seconds on typical development machine.
- **NFR-002**: Form must be fully responsive across mobile (320px - 640px), tablet (641px - 1023px), and desktop (>= 1024px) viewports.
- **NFR-003**: Form must meet WCAG 2.1 AA accessibility standards: keyboard navigation, screen reader support, proper ARIA labels, sufficient color contrast.
- **NFR-004**: Fluent UI components must follow Microsoft Fluent Design System guidelines for consistent appearance with SharePoint/Microsoft 365.
- **NFR-005**: Form bundle size increase due to Fluent UI should not exceed 150KB (gzipped) to maintain reasonable load times.
- **NFR-006**: Touch targets on mobile devices must meet minimum 44x44px size for all interactive elements (buttons, dropdowns, date pickers).

### Key Entities *(feature does not introduce new data entities)*

The form interacts with the existing `MeetingRequest` entity:
- **MeetingRequest**: { id, meetingTitle, meetingDate, alternateDate, meetingCategory, meetingSubcategory, meetingDescription, comments, classification, requestorName, requestType, country, referenceNumber, status, createdAt }

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of form input elements (11 fields) are replaced with appropriate Fluent UI components (TextField, Dropdown, DatePicker).
- **SC-002**: Form displays validation errors using Fluent UI error states (red border, error message) for all required fields when submitted empty.
- **SC-003**: Character counters display in real-time for title, description, and comments fields, showing format "X/Y" where X = current length, Y = max length.
- **SC-004**: Form layout adapts responsively: single-column on mobile (<= 640px), multi-column on desktop (>= 1024px), verified across 3 viewport sizes.
- **SC-005**: All existing functionality works identically: form submission succeeds, draft saving succeeds, validation rules apply, category/subcategory dependency functions, authentication integration works.
- **SC-006**: Form passes automated accessibility scan (axe-core or equivalent) with zero critical violations.
- **SC-007**: Visual inspection confirms form resembles SharePoint/Microsoft 365 styling: modern appearance, professional look, consistent spacing and typography.
- **SC-008**: Form becomes interactive (first input focusable) within 2 seconds of page load on 95% of test runs.

## Assumptions

- **Fluent UI React**: The project will install and configure Microsoft Fluent UI React v9 (`@fluentui/react-components` package) as a new dependency.
- **Tailwind CSS**: Existing Tailwind CSS configuration remains available and will be used alongside Fluent UI for layout utilities (max-w-*, mx-auto, p-*, etc.).
- **Browser Support**: Form will target modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) that support Fluent UI React requirements.
- **Existing Backend API**: Backend API endpoints (/api/meetingrequests, /api/meetingrequests/draft) remain unchanged; no backend modifications required.
- **Authentication**: MSAL authentication setup is already functional and integrated; form will maintain existing authentication flow.
- **Design Tokens**: Fluent UI's default theme will be used initially; custom theming (brand colors, fonts) is out of scope unless specified later.
- **Bundle Size**: Adding Fluent UI will increase JavaScript bundle size; tree-shaking and code splitting may be needed to keep bundle size reasonable.

## Dependencies

- **Package**: `@fluentui/react-components` (Fluent UI React v9) must be installed via npm/yarn.
- **Package**: `@fluentui/react-icons` (optional, for icons if needed in form) may be installed if icon support is required.
- **Configuration**: May need to configure build tools (Vite) to properly bundle Fluent UI components if default config has issues.
- **Existing Code**: Feature 005 (listview-drawer) completion is not blocking this feature; form modernization is independent.

## Out of Scope

- **New Form Fields**: Adding new fields to the form (e.g., location, attendees, duration) is out of scope; this feature only modernizes existing 11 fields.
- **Backend Changes**: No changes to API endpoints, data models, validation logic on backend, or database schema.
- **Custom Theming**: Applying custom brand colors, fonts, or design tokens to Fluent UI components; default Fluent UI theme will be used.
- **Form Builder**: Creating a dynamic form builder or configuration system; this feature modernizes the specific meeting request form only.
- **Multi-Page Form**: Breaking form into multiple steps/wizard; form remains single-page.
- **Advanced Date Features**: Complex date selection features (recurring meetings, date ranges, time zones); form only captures single meeting date and alternate date.
- **Draft Management**: Editing/loading previously saved drafts; form only allows saving new drafts during current session.
- **File Attachments**: Adding ability to attach documents to meeting requests.
- **Rich Text Editor**: Using rich text editor for description/comments fields; plain text multiline fields will be used.
- **Inline Editing**: Editing meeting requests from list view; this feature only covers the creation form.

## Notes

- **Fluent UI Version**: Use Fluent UI React v9 (`@fluentui/react-components`) rather than v8 (`@fluentui/react`) for better performance, modern API, and alignment with latest Microsoft 365 applications.
- **Component Mapping**:
  - Title, Classification, RequestType, Country → `TextField`
  - Description, Comments → `TextField multiline`
  - MeetingDate, AlternateDate → `DatePicker`
  - Category, Subcategory → `Dropdown`
  - Submit button → `PrimaryButton`
  - Save Draft button → `DefaultButton`
  - Status messages → `MessageBar`
  - Layout/spacing → `Stack` with responsive tokens
- **Migration Strategy**: Replace components incrementally or all at once; recommend all-at-once for consistency.
- **Testing**: Update existing E2E tests if needed to handle Fluent UI component selectors (data-testid attributes).
- **SharePoint Similarity**: "SharePoint-like" refers to visual appearance, component style, and professional look; exact SharePoint theming (purple accent color, specific fonts) may require custom theme configuration beyond this feature's scope.
