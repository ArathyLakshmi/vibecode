# Data Model: Modern Form UI with Fluent UI

**Feature**: 006-modern-form-ui  
**Date**: 2026-02-11  
**Purpose**: Document data entities and state management for modernized form component

## Overview

This feature modernizes the UI of the meeting request form but **does not introduce new data entities or change the data model**. The form interacts with the existing `MeetingRequest` entity defined in the backend API.

## Existing Data Entity

### MeetingRequest

The form creates and submits MeetingRequest entities to the backend API.

**Backend Model** (C# Entity):
```csharp
public class MeetingRequest
{
    public int Id { get; set; }
    public string ReferenceNumber { get; set; }  // Auto-generated
    public string MeetingTitle { get; set; }  // Required, max 200 chars
    public DateTime? MeetingDate { get; set; }  // Required, cannot be past
    public DateTime? AlternateDate { get; set; }  // Required, must differ from MeetingDate
    public string MeetingCategory { get; set; }  // Required, enum-like
    public string MeetingSubcategory { get; set; }  // Required, depends on Category
    public string MeetingDescription { get; set; }  // Required, max 4000 chars
    public string Comments { get; set; }  // Required, max 1000 chars
    public string Classification { get; set; }  // Required
    public string RequestorName { get; set; }  // From MSAL or manual input
    public string RequestType { get; set; }  // Optional
    public string Country { get; set; }  // Optional
    public string Status { get; set; }  // Server-managed
    public DateTime CreatedAt { get; set; }  // Server-managed
}
```

**Frontend Form State** (React):
```typescript
interface FormState {
  title: string;           // Maps to MeetingTitle
  date: string;            // Maps to MeetingDate (ISO string YYYY-MM-DD)
  altDate: string;         // Maps to AlternateDate (ISO string)
  category: string;        // Maps to MeetingCategory
  subcategory: string;     // Maps to MeetingSubcategory
  description: string;     // Maps to MeetingDescription
  comments: string;        // Maps to Comments
  classification: string;  // Maps to Classification
  requestorName: string;   // Maps to RequestorName (if not authenticated)
  requestType: string;     // Maps to RequestType
  country: string;         // Maps to Country
}
```

**Validation Rules** (Client-side):

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required, max 200 chars | "Required" / "Max 200 chars" |
| date | Required, not in past | "Required" / "Meeting date cannot be in the past" |
| altDate | Required, not in past, differs from date | "Required" / "Alternate date cannot be in the past" / "Alternate date must differ from meeting date" |
| category | Required | "Required" |
| subcategory | Required | "Required" |
| description | Required, max 4000 chars | "Required" / "Max 4000 chars" |
| comments | Required, max 1000 chars | "Required" / "Max 1000 chars" |
| classification | Required | "Required" |

**Category → Subcategory Mapping**:
```javascript
const CATEGORY_OPTIONS = {
  Governance: ['Board Meeting', 'Committee Meeting'],
  Operations: ['Planning', 'Retrospective'],
  HR: ['Hiring', 'Onboarding']
};
```

## State Management

### Component State

The form uses React `useState` for local state management:

1. **Form Data** (`form`): FormState object holding all field values
2. **Errors** (`errors`): Object mapping field names to error messages
3. **Status** (`status`): Submission status (success, error, draft saved)
4. **Loading States** (`submitting`, `savingDraft`): Boolean flags for async operations
5. **Current User** (`currentUserName`): Authenticated user's name from MSAL

### State Transitions

```
Initial State (form = empty strings, errors = {})
  ↓
User Input (form updates, errors cleared for field)
  ↓
Validation Triggered (on submit or field blur)
  ↓ [if invalid]
Error State (errors object populated)
  ↓ [user fixes]
Valid State (errors object empty)
  ↓
Submitting State (submitting = true, form disabled)
  ↓ [API call]
Success State (status = { ok: true, id }, form reset)
  OR
Error State (status = { ok: false, message })
```

## Data Flow

### Form Submission Flow

```
1. User fills form → Component state updates
2. User clicks "Submit Request" → validate() called
3. If validation passes → handleSubmit()
4. Acquire MSAL token (if authenticated)
5. Format payload:
   - Convert form state keys to backend property names (PascalCase)
   - Convert date strings to ISO format (already in ISO format)
   - Include Authorization header with bearer token
6. POST /api/meetingrequests
7. Handle response:
   - Success (200): Display success message, reset form
   - Error (400/500): Display error message
```

### Draft Save Flow

```
1. User clicks "Save Draft" → handleSaveDraft()
2. Skip full validation (allow partial data)
3. Acquire MSAL token (if authenticated)
4. Format payload (same as submission)
5. POST /api/meetingrequests/draft
6. Handle response:
   - Success: Display "Draft saved (id: X)"
   - Error: Display error message
7. Preserve form state (do NOT reset)
```

## API Contract

### POST /api/meetingrequests (Submit)

**Request**:
```json
{
  "MeetingTitle": "Q4 Board Meeting",
  "MeetingDate": "2026-03-15",
  "AlternateDate": "2026-03-16",
  "MeetingCategory": "Governance",
  "MeetingSubcategory": "Board Meeting",
  "MeetingDescription": "Quarterly board meeting to review...",
  "Comments": "Please confirm venue availability",
  "Classification": "Internal",
  "RequestorName": "John Doe",
  "RequestType": "Regular",
  "Country": "USA"
}
```

**Response** (Success - 200):
```json
{
  "id": 123,
  "referenceNumber": "REQ-2026-0123",
  ...
}
```

**Response** (Error - 400/500):
```text
"Validation failed: MeetingDate is required"
```

### POST /api/meetingrequests/draft (Draft)

Same contract as submission endpoint.

## UI Component State (Fluent UI Specific)

### Fluent UI Component Props Mapping

**TextField**:
- `value={form.fieldName}`
- `onChange={(e, data) => setForm(f => ({ ...f, fieldName: data.value }))}`
- `validationState={errors.fieldName ? "error" : undefined}`
- `validationMessage={errors.fieldName}`
- `maxLength={LIMITS.fieldName}`

**Dropdown**:
- `selectedKey={form.fieldName}`
- `onChange={(e, option) => setForm(f => ({ ...f, fieldName: option?.key || '' }))}`
- `options={optionsArray.map(o => ({ key: o, text: o }))}`
- `validationState={errors.fieldName ? "error" : undefined}`
- `validationMessage={errors.fieldName}`

**DatePicker**:
- `value={form.fieldName ? new Date(form.fieldName) : undefined}`
- `onSelectDate={(date) => { const iso = date ? date.toISOString().slice(0, 10) : ''; setForm(f => ({ ...f, fieldName: iso })); }}`
- `validationState={errors.fieldName ? "error" : undefined}`
- `validationMessage={errors.fieldName}`

## Data Changes (NONE)

**No backend changes required**:
- Database schema unchanged
- API endpoints unchanged
- Payload format unchanged
- Validation rules unchanged (client-side presentation only)

**No frontend data model changes**:
- FormState interface unchanged
- State management approach unchanged (useState)
- Data flow unchanged (validation → submit → API call)

## Migration Notes

**State Compatibility**:
- Current form state structure fully compatible with Fluent UI components
- Only presentation layer changes; business logic preserved
- Validation logic requires minor adjustment to use Fluent UI validation props

**Testing Data**:
- Existing E2E test data remains valid
- Test selectors may need updates (data-testid attributes)
- Validation scenarios unchanged
