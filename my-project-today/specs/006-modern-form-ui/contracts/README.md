# Component Contracts: Modern Form UI with Fluent UI

**Feature**: 006-modern-form-ui  
**Date**: 2026-02-11  
**Purpose**: Document component interface contracts for modernized form

## Overview

This document defines the interface contracts for the modernized MeetingRequestForm component and its integration with Fluent UI React v9 components. These contracts ensure consistent behavior, proper prop typing, and maintainable component architecture.

## MeetingRequestForm Component Contract

### Public Interface

**Component Name**: `MeetingRequestForm`

**Import**:
```javascript
import MeetingRequestForm from './components/MeetingRequestForm'
```

**Props**: None (component is self-contained)

**Exports**: Default export of functional React component

**Responsibilities**:
1. Render meeting request form with Fluent UI components
2. Manage form state (field values, validation errors, submission status)
3. Validate user input according to business rules
4. Submit form data to backend API
5. Save draft data to backend API
6. Integrate with MSAL for authenticated user information
7. Display success/error messages
8. Maintain responsive layout across devices

### Component Structure

```jsx
<FluentProvider theme={webLightTheme}>
  <form className="max-w-2xl mx-auto p-6" onSubmit={handleSubmit}>
    <MessageBar> {/* Status messages */}
    <Stack tokens={{ childrenGap: 20 }}>
      <TextField />  {/* Title */}
      <Stack horizontal> {/* Date fields */}
      <Stack horizontal> {/* Category/Subcategory */}
      <TextField multiline />  {/* Description */}
      <TextField multiline />  {/* Comments */}
      <TextField />  {/* Classification */}
      <Stack horizontal> {/* Requestor details */}
      <Stack horizontal> {/* Action buttons */}
    </Stack>
  </form>
</FluentProvider>
```

### State Contract

**Form State**:
```typescript
const [form, setForm] = useState<FormState>({
  title: string,
  date: string,  // ISO format YYYY-MM-DD
  altDate: string,
  category: string,
  subcategory: string,
  description: string,
  comments: string,
  classification: string,
  requestorName: string,
  requestType: string,
  country: string
})
```

**Error State**:
```typescript
const [errors, setErrors] = useState<ErrorState>({
  [fieldName: string]: string  // Error message for each field
})
```

**Status State**:
```typescript
const [status, setStatus] = useState<StatusState | null>(
  | { ok: true, id: number }  // Successful submission
  | { ok: false, message: string }  // Submission error
  | { draft: true, id: number }  // Successful draft save
  | { draft: false, message: string }  // Draft save error
  | null  // No status message
)
```

**Loading States**:
```typescript
const [submitting, setSubmitting] = useState<boolean>(false)
const [savingDraft, setSavingDraft] = useState<boolean>(false)
```

### Method Contracts

#### `handleChange(e, data)`
Handles input changes for TextField components.

**Parameters**:
- `e`: Event object (unused but required by onChange signature)
- `data`: Object containing `{ value: string, name?: string }`

**Behavior**:
- Updates `form` state with new value
- Clears error for the changed field (optional)

**Side Effects**: State update triggers re-render

---

#### `handleDropdownChange(e, option, fieldName)`
Handles selection changes for Dropdown components.

**Parameters**:
- `e`: Event object (unused)
- `option`: Selected option object `{ key: string, text: string } | undefined`
- `fieldName`: String identifying which field changed

**Behavior**:
- Updates `form` state with selected key
- If fieldName is 'category', resets subcategory to empty string
- Clears error for the changed field

**Side Effects**: State update, potential subcategory reset

---

#### `handleDateChange(date, fieldName)`
Handles date selection for DatePicker components.

**Parameters**:
- `date`: Date object or null
- `fieldName`: String identifying which field changed ('date' or 'altDate')

**Behavior**:
- Converts Date object to ISO string (YYYY-MM-DD)
- Updates `form` state with ISO string
- Clears error for the changed field

**Side Effects**: State update

---

#### `validate(): boolean`
Validates all form fields according to business rules.

**Returns**: `true` if all validations pass, `false` otherwise

**Behavior**:
- Checks required fields (8 fields must be non-empty)
- Validates character limits (title: 200, description: 4000, comments: 1000)
- Validates dates (not in past, not equal)
- Populates `errors` state with validation messages
- Returns boolean result

**Side Effects**: Updates `errors` state

**Validation Rules**:
1. Required fields: title, date, altDate, category, subcategory, description, comments, classification
2. Character limits: title ≤ 200, description ≤ 4000, comments ≤ 1000
3. Date constraints: date ≥ today, altDate ≥ today, date ≠ altDate

---

#### `handleSubmit(e): Promise<void>`
Submits the form data to the backend API.

**Parameters**:
- `e`: Form submit event

**Returns**: Promise (void)

**Behavior**:
1. Prevents default form submission
2. Calls `validate()`; returns early if validation fails
3. Sets `submitting` to true
4. Acquires MSAL token if authenticated
5. Formats payload (converts form keys to PascalCase)
6. POSTs to `/api/meetingrequests` with Authorization header
7. Handles response:
   - Success: Sets success status, resets form and errors
   - Error: Sets error status with message
8. Sets `submitting` to false

**Side Effects**:
- State updates (submitting, form, errors, status)
- Network request
- Form reset on success

**Error Handling**: Catches and displays API errors

---

#### `handleSaveDraft(): Promise<void>`
Saves the current form data as a draft.

**Parameters**: None

**Returns**: Promise (void)

**Behavior**:
1. Sets `savingDraft` to true
2. Acquires MSAL token if authenticated
3. Formats payload (same as submit)
4. POSTs to `/api/meetingrequests/draft`
5. Handles response:
   - Success: Sets draft success status
   - Error: Sets draft error status
6. Sets `savingDraft` to false
7. Does NOT reset form (preserves user input)

**Side Effects**:
- State updates (savingDraft, status)
- Network request

**Error Handling**: Catches and displays API errors

---

## Fluent UI Component Integration Contracts

### TextField Contract

**Usage**: Text inputs (title, classification, requestType, country), multiline (description, comments)

**Props**:
- `label` (string): Field label displayed above input
- `value` (string): Controlled value from form state
- `onChange` ((e, data) => void): Change handler
- `maxLength` (number, optional): Character limit
- `multiline` (boolean, optional): Enables textarea mode
- `rows` (number, optional): Number of visible rows for multiline
- `validationState` ("error" | undefined): Error state indicator
- `validationMessage` (string, optional): Error message displayed below field
- `readOnly` (boolean, optional): Makes field read-only (for authenticated requestor)
- `disabled` (boolean, optional): Disables field during submission

**Expected Behavior**:
- Displays label above input
- Shows character counter via custom Text component below field
- Displays red border and error message when validationState="error"
- Prevents typing beyond maxLength
- Maintains focus and cursor position during state updates

---

### Dropdown Contract

**Usage**: Category and subcategory fields

**Props**:
- `label` (string): Field label
- `selectedKey` (string | undefined): Currently selected option key
- `options` (array): Array of `{ key: string, text: string }` objects
- `onChange` ((e, option) => void): Selection handler
- `validationState` ("error" | undefined): Error state indicator
- `validationMessage` (string, optional): Error message
- `placeholder` (string, optional): Placeholder text when no selection
- `disabled` (boolean, optional): Disables dropdown during submission

**Expected Behavior**:
- Displays label above dropdown
- Shows placeholder when selectedKey is empty
- Opens dropdown menu on click or Enter key
- Filters options on type (if enabled)
- Shows red border and error message when validationState="error"
- Closes on selection or Escape key

**Special Case - Category Dropdown**:
- onChange must reset subcategory field when category changes
- Options derived from keys of CATEGORY_OPTIONS object

**Special Case - Subcategory Dropdown**:
- Options derived from CATEGORY_OPTIONS[form.category]
- Should be empty when category is not selected
- Displays "Select subcategory" placeholder

---

### DatePicker Contract

**Usage**: Meeting date and alternate date fields

**Props**:
- `label` (string): Field label
- `value` (Date | undefined): Selected date object
- `onSelectDate` ((date: Date | null | undefined) => void): Selection handler
- `validationState` ("error" | undefined): Error state indicator
- `validationMessage` (string, optional): Error message
- `placeholder` (string, optional): Placeholder text
- `disabled` (boolean, optional): Disables picker during submission
- `formatDate` ((date: Date) => string, optional): Custom date formatter

**Expected Behavior**:
- Displays label and text input showing formatted date
- Opens calendar popup on input click or Enter key
- Allows keyboard navigation in calendar (arrow keys)
- Closes calendar on date selection or Escape key
- Shows red border and error message when validationState="error"
- Handles invalid date input gracefully

**Date Conversion**:
- Component expects Date object in `value` prop
- Form state stores ISO string (YYYY-MM-DD)
- Conversion in component: `value={form.date ? new Date(form.date) : undefined}`
- Conversion in handler: `const iso = date ? date.toISOString().slice(0, 10) : ''`

---

### Button Contract

**Usage**: Submit Request (PrimaryButton), Save Draft (DefaultButton)

**Props**:
- `type` ("submit" | "button"): HTML button type
- `onClick` (() => void, optional): Click handler (not needed for type="submit")
- `disabled` (boolean): Disables button
- `appearance` ("primary" | "secondary" | "outline"): Button style
- `loading` (boolean, optional): Shows loading spinner

**Expected Behavior**:
- Primary button: Blue background, white text
- Default button: White background, gray border, black text
- Disabled state: Gray background, no hover effect, cursor not-allowed
- Loading state: Shows spinner, prevents clicks

**Submit Button**:
- type="submit" triggers form onSubmit
- Disabled when `submitting` is true
- Text: "Submit Request" or "Submitting…"

**Draft Button**:
- type="button" triggers handleSaveDraft
- Disabled when `savingDraft` is true
- Text: "Save Draft" or "Saving…"

---

### MessageBar Contract

**Usage**: Display form-level status messages (success, error, draft saved)

**Props**:
- `intent` ("success" | "error" | "info" | "warning"): Message type
- `children` (ReactNode): Message content

**Expected Behavior**:
- Displays at top of form
- Success intent: Green background, checkmark icon
- Error intent: Red background, error icon
- Auto-dismissible after 5 seconds (optional implementation)
- Accessible to screen readers (aria-live="polite")

**Status Rendering Logic**:
```jsx
{status && status.ok && (
  <MessageBar intent="success">
    Submitted (id: {status.id})
  </MessageBar>
)}
{status && status.draft && (
  <MessageBar intent="info">
    Draft saved (id: {status.id})
  </MessageBar>
)}
{status && !status.ok && !status.draft && (
  <MessageBar intent="error">
    Error: {status.message}
  </MessageBar>
)}
```

---

### Stack Contract

**Usage**: Layout container for vertical and horizontal arrangements

**Props**:
- `tokens` (object): Spacing configuration `{ childrenGap: number }`
- `horizontal` (boolean, optional): Enables horizontal layout
- `className` (string, optional): Tailwind CSS classes for additional styling
- `children` (ReactNode): Child components

**Expected Behavior**:
- Vertical stack: Children arranged top-to-bottom with gap spacing
- Horizontal stack: Children arranged left-to-right with gap spacing
- Responsive: Use className="grid grid-cols-1 md:grid-cols-2" for responsive columns

**Layout Examples**:
- Form container: `<Stack tokens={{ childrenGap: 20 }}>` (vertical, 20px gap)
- Date fields row: `<Stack horizontal tokens={{ childrenGap: 16 }}>`
- Requestor details: `<Stack horizontal className="grid grid-cols-1 lg:grid-cols-3">`

---

## API Endpoint Contracts

### POST /api/meetingrequests

**Purpose**: Submit new meeting request

**Authorization**: Optional (Bearer token if authenticated)

**Request Body**:
```json
{
  "MeetingTitle": "string (required, max 200)",
  "MeetingDate": "string (ISO date, required)",
  "AlternateDate": "string (ISO date, required)",
  "MeetingCategory": "string (required)",
  "MeetingSubcategory": "string (required)",
  "MeetingDescription": "string (required, max 4000)",
  "Comments": "string (required, max 1000)",
  "Classification": "string (required)",
  "RequestorName": "string (optional)",
  "RequestType": "string (optional)",
  "Country": "string (optional)"
}
```

**Success Response** (200):
```json
{
  "id": 123,
  "referenceNumber": "REQ-2026-0123",
  ...
}
```

**Error Response** (400/500):
```text
"Error message string"
```

---

### POST /api/meetingrequests/draft

**Purpose**: Save meeting request as draft

**Authorization**: Required (Bearer token)

**Request Body**: Same as submit endpoint

**Success Response** (200): Same as submit endpoint

**Error Response** (400/500): Same as submit endpoint

---

## Testing Contracts

### E2E Test Selectors

Components should include `data-testid` attributes for E2E testing:

- Form: `data-testid="meeting-request-form"`
- Title field: `data-testid="field-title"`
- Date field: `data-testid="field-date"`
- Alternate date field: `data-testid="field-altdate"`
- Category dropdown: `data-testid="dropdown-category"`
- Subcategory dropdown: `data-testid="dropdown-subcategory"`
- Description field: `data-testid="field-description"`
- Comments field: `data-testid="field-comments"`
- Classification field: `data-testid="field-classification"`
- Submit button: `data-testid="button-submit"`
- Draft button: `data-testid="button-draft"`
- Success message: `data-testid="message-success"`
- Error message: `data-testid="message-error"`

### Accessibility Requirements

All components must meet WCAG 2.1 AA standards:

- **Keyboard Navigation**: All interactive elements accessible via Tab, Enter, Escape, Space
- **Screen Reader Support**: Proper labels, ARIA attributes, error announcements
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Touch Targets**: Minimum 44x44px on mobile devices
- **Focus Indicators**: Visible focus outline on all interactive elements

---

## Version Compatibility

- **React**: 18.2.0+
- **Fluent UI React Components**: 9.x (latest stable)
- **Vite**: 5.x
- **TypeScript**: Optional (component uses JSX, TypeScript definitions available)
- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
