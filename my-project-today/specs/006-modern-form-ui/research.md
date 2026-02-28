# Research: Modern Form UI with Fluent UI

**Feature**: 006-modern-form-ui  
**Date**: 2026-02-11  
**Purpose**: Technical research for integrating Fluent UI React v9 components into existing React form

## Research Areas

### 1. Fluent UI React v9 Setup & Configuration

**Decision**: Use `@fluentui/react-components` package (Fluent UI React v9)

**Rationale**:
- Fluent UI v9 is the latest stable version as of 2026, aligned with Microsoft 365's current design system
- Better performance than v8 with smaller bundle size and improved tree-shaking
- Modern React patterns (hooks-based) compatible with existing React 18.2.0 codebase
- Active Microsoft support and ongoing updates for SharePoint Online and Microsoft 365
- Provides `FluentProvider` for theming and global configuration

**Setup Requirements**:
```bash
npm install @fluentui/react-components @fluentui/react-icons
```

**Alternatives Considered**:
- **Fluent UI v8 (`@fluentui/react`)**: Rejected because v8 is in maintenance mode, larger bundle size, and uses older API patterns
- **Material-UI**: Rejected because it doesn't match SharePoint aesthetic; user specifically requested SharePoint-style UI
- **Ant Design**: Rejected for same reason as Material-UI; not aligned with Microsoft 365 design language

---

### 2. Fluent UI + Tailwind CSS Integration Strategy

**Decision**: Use Fluent UI components for form controls with Tailwind CSS for layout/spacing utilities

**Rationale**:
- Fluent UI provides styled form components (TextField, Dropdown, DatePicker) with built-in themes
- Tailwind excels at layout utilities (max-w-*, mx-auto, p-*, flex, grid) which don't conflict with Fluent UI
- Hybrid approach avoids fighting Fluent UI's styling system while leveraging Tailwind for consistent spacing
- Existing codebase already uses Tailwind; removing it would require widespread changes

**Integration Pattern**:
```jsx
<FluentProvider theme={webLightTheme}>
  <form className="max-w-2xl mx-auto p-6">  {/* Tailwind for layout */}
    <TextField label="Title" />  {/* Fluent UI for controls */}
  </form>
</FluentProvider>
```

**Alternatives Considered**:
- **Pure Fluent UI with Fluent UI styling utilities**: Rejected because existing app uses Tailwind extensively; migration cost too high
- **Pure Tailwind with custom-styled inputs**: Rejected because doesn't achieve SharePoint look; building comparable components would be high effort
- **CSS Modules**: Rejected because Tailwind already provides utility system; mixing three styling approaches adds complexity

---

### 3. Component Mapping: HTML → Fluent UI

**Decision**: Map each HTML form element to appropriate Fluent UI component

| Current HTML | Fluent UI Component | Import |
|--------------|---------------------|--------|
| `<input type="text">` | `TextField` | `@fluentui/react-components` |
| `<textarea>` | `TextField multiline` | `@fluentui/react-components` |
| `<input type="date">` | `DatePicker` | `@fluentui/react-components` |
| `<select>` | `Dropdown` | `@fluentui/react-components` |
| `<button type="submit">` | `PrimaryButton` | `@fluentui/react-components` |
| `<button type="button">` | `DefaultButton` | `@fluentui/react-components` |
| Status messages | `MessageBar` | `@fluentui/react-components` |

**Rationale**:
- Direct 1:1 mapping minimizes migration complexity
- Fluent UI components provide built-in validation states (error, warning, success)
- DatePicker provides calendar UI superior to HTML5 date input (especially on desktop browsers)
- Dropdown provides consistent select experience across browsers with search/filter capabilities

**Key Props Mapping**:
- `value` → `value` (TextField, Dropdown, DatePicker)
- `onChange` → `onChange` (similar signature)
- `name` → Use controlled component pattern with state
- `maxLength` → `maxLength` (TextField)
- Error messages → `validationState="error"` + `validationMessage` prop

**Alternatives Considered**:
- **ComboBox instead of Dropdown**: Rejected for category/subcategory because options are fixed and small; ComboBox is for searchable/filterable large lists
- **SpinButton for numeric fields**: Not applicable; no numeric fields in this form
- **Calendar instead of DatePicker**: DatePicker wraps Calendar with input field; Calendar alone would require custom integration

---

### 4. Responsive Layout with Fluent UI Stack

**Decision**: Use Fluent UI `Stack` component with responsive tokens for layout, combine with Tailwind breakpoints

**Rationale**:
- `Stack` provides consistent spacing and flex/grid layout with tokens (e.g., `tokens={{ childrenGap: 16 }}`)
- Fluent UI theming system includes responsive spacing tokens
- Can nest Stack components for complex layouts (e.g., horizontal stack for date fields within vertical form stack)
- Tailwind `grid` classes can complement Stack for specific layouts (e.g., 3-column requestor details)

**Responsive Approach**:
```jsx
<Stack tokens={{ childrenGap: 20 }} className="max-w-2xl mx-auto p-6">
  <TextField label="Title" />
  <Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 md:grid-cols-2">
    <DatePicker label="Meeting Date" />
    <DatePicker label="Alternate Date" />
  </Stack>
</Stack>
```

**Mobile Strategy**:
- Single column stack on mobile (<= 640px) using Tailwind `grid-cols-1`
- Two-column layout on tablet+ using `md:grid-cols-2`
- Three-column for requestor details row using `lg:grid-cols-3`

**Alternatives Considered**:
- **Pure CSS Grid/Flexbox**: Rejected because Stack provides semantic grouping and consistent spacing tokens; manual CSS requires more maintenance
- **Fluent UI's Surface/Card**: Not needed for this form; form is already in a white container with shadow
- **Responsive utilities from Fluent UI only**: Rejected because Tailwind provides more granular responsive control and is already in codebase

---

### 5. Form Validation with Fluent UI

**Decision**: Implement validation using React state with Fluent UI validation states

**Rationale**:
- Fluent UI TextField/Dropdown/DatePicker support `validationState` prop: "error", "warning", "success", "none"
- `validationMessage` prop displays error text below field (replaces manual error div rendering)
- Existing validation logic in MeetingRequestForm.jsx can be preserved; only presentation changes
- Built-in error styling matches SharePoint/Microsoft 365 patterns

**Implementation Pattern**:
```jsx
<TextField 
  label="Title"
  value={form.title}
  onChange={handleChange}
  maxLength={200}
  validationState={errors.title ? "error" : undefined}
  validationMessage={errors.title}
/>
```

**Character Counter Strategy**:
- Use `description` prop or custom `Text` component below field
- Display as "X/Y" format (e.g., "150/200") updating on change
- Style counter in red when at/exceeding limit using conditional className

**Alternatives Considered**:
- **HTML5 Form Validation**: Rejected because doesn't provide customizable error styling or messages; Fluent UI validation states give better UX
- **Third-party validation library (Formik, React Hook Form)**: Rejected because current form has simple validation logic; adding library increases complexity/bundle size
- **Server-side validation only**: Rejected because client-side validation provides immediate feedback; server validation still needed as backup

---

### 6. Date Handling with Fluent UI DatePicker

**Decision**: Use Fluent UI `DatePicker` component with controlled Date objects, convert to ISO string for backend

**Rationale**:
- DatePicker expects `value` prop as Date object or undefined
- Current form stores dates as ISO string (YYYY-MM-DD) for backend API
- Need conversion layer: string → Date for display, Date → string for storage
- DatePicker provides calendar UI, keyboard navigation, and accessibility out of box

**Implementation Pattern**:
```jsx
<DatePicker
  label="Meeting Date"
  value={form.date ? new Date(form.date) : undefined}
  onSelectDate={(date) => {
    const isoString = date ? date.toISOString().slice(0, 10) : '';
    setForm(f => ({ ...f, date: isoString }));
  }}
  validationState={errors.date ? "error" : undefined}
  validationMessage={errors.date}
/>
```

**Date Validation**:
- Prevent past dates: Compare selected date with `new Date()` in validation function
- Date difference validation: Ensure alternateDate !== meetingDate

**Alternatives Considered**:
- **Keep HTML5 date input**: Rejected because doesn't match SharePoint look; browser implementations vary significantly
- **Third-party date picker (react-datepicker)**: Rejected because Fluent UI provides built-in DatePicker aligned with Microsoft 365 design
- **Manual calendar implementation**: Rejected because DatePicker provides full-featured calendar with accessibility

---

### 7. Category → Subcategory Dependency Handling

**Decision**: Preserve existing dependency logic with Fluent UI Dropdown; reset subcategory when category changes

**Rationale**:
- Current implementation maintains CATEGORY_OPTIONS object mapping categories to subcategories
- When category changes, subcategories array updates and subcategory field resets if invalid
- Fluent UI Dropdown `options` prop accepts array of `{ key, text }` objects
- Existing logic translates cleanly to Fluent UI API

**Implementation Pattern**:
```jsx
<Dropdown
  label="Meeting Category"
  options={Object.keys(CATEGORY_OPTIONS).map(c => ({ key: c, text: c }))}
  selectedKey={form.category}
  onChange={(e, option) => {
    setForm(f => ({
      ...f,
      category: option?.key || '',
      subcategory: '' // Reset subcategory when category changes
    }));
  }}
/>
```

**Alternatives Considered**:
- **Cascading Dropdown component**: Rejected because Fluent UI doesn't provide dedicated cascading dropdown; easier to manage separately
- **Disable subcategory until category selected**: Rejected because Fluent UI Dropdown handles empty options gracefully; no need for complex disable logic
- **Combined single dropdown**: Rejected because business logic requires separate category/subcategory fields

---

### 8. Authentication Integration (MSAL)

**Decision**: Preserve existing MSAL integration; no changes required for Fluent UI migration

**Rationale**:
- Existing useMsal, useIsAuthenticated, useAccount hooks remain functional
- Requestor name display logic unchanged (authenticated user vs. manual input)
- Token acquisition for API calls unchanged
- Fluent UI components are presentational; don't affect authentication flow

**Read-only Requestor Field with Fluent UI**:
```jsx
{currentUserName ? (
  <TextField
    label="Requestor"
    value={currentUserName}
    readOnly
    disabled  // Or use readOnly: true
  />
) : (
  <TextField
    label="Requestor"
    value={form.requestorName}
    onChange={handleChange}
  />
)}
```

**Alternatives Considered**:
- **Fluent UI Persona component**: Could display user with avatar; rejected because spec doesn't require avatar, just name display
- **Remove requestor field for authenticated users**: Rejected because business may want to show who's creating the request

---

### 9. Performance Optimization

**Decision**: Import only needed Fluent UI components; rely on Vite tree-shaking for bundle optimization

**Rationale**:
- Vite 5.0 with ES modules provides automatic tree-shaking
- Fluent UI v9 is designed for tree-shaking; importing specific components reduces bundle size
- No need for manual chunking unless bundle size exceeds acceptable threshold (check after implementation)
- Current form is single component; not enough complexity to warrant code splitting

**Import Pattern**:
```jsx
import {
  FluentProvider,
  webLightTheme,
  TextField,
  Dropdown,
  DatePicker,
  Button,
  MessageBar,
  Stack,
  Text,
  Label
} from '@fluentui/react-components';
```

**Monitoring**:
- Check bundle size after implementation: `npm run build` → check `dist/` output
- Target: <150KB gzipped increase (per spec NFR-005)
- If exceeds target, consider lazy loading form component or splitting Fluent UI into separate chunk

**Alternatives Considered**:
- **CDN-hosted Fluent UI**: Rejected because npm install provides better version control and build-time optimization
- **Lazy load the entire form**: Rejected unless bundle size becomes problematic; form is critical feature, not optional
- **Manual tree-shaking configuration**: Rejected because Vite handles this automatically

---

### 10. Accessibility Considerations

**Decision**: Rely on Fluent UI's built-in accessibility features; validate with axe-core

**Rationale**:
- Fluent UI components are WCAG 2.1 AA compliant by design
- Built-in keyboard navigation, focus management, ARIA attributes
- TextField, Dropdown, DatePicker all include proper labels, roles, and state communication
- Validation messages automatically announced to screen readers via aria-live regions

**Testing Strategy**:
- Run automated accessibility scan with axe-core (existing in project if E2E tests include it, or add to E2E)
- Manual keyboard navigation test: Tab through form, submit with Enter, close dropdowns with Escape
- Screen reader test: Verify error messages, field labels, and status announcements

**Specific Requirements from Spec**:
- Minimum 44x44px touch targets on mobile: Fluent UI components meet this by default
- Keyboard navigation: All controls accessible via Tab, Space, Enter, Escape
- Error message announcement: Fluent UI MessageBar and field validation messages use aria-live

**Alternatives Considered**:
- **Custom ARIA implementation**: Rejected because Fluent UI provides comprehensive accessibility; reinventing would introduce bugs
- **Skip accessibility testing**: Not acceptable; spec requires WCAG 2.1 AA compliance (NFR-003)

---

## Summary of Key Decisions

1. **Library**: `@fluentui/react-components` v9 (not v8)
2. **Styling Strategy**: Fluent UI for components + Tailwind for layout
3. **Component Mapping**: Direct HTML → Fluent UI replacements (TextField, Dropdown, DatePicker, Button, MessageBar)
4. **Layout**: Fluent UI Stack with Tailwind grid utilities for responsive layout
5. **Validation**: Preserve existing validation logic, use Fluent UI `validationState` and `validationMessage` props
6. **Dates**: DatePicker with Date objects, convert to/from ISO strings for backend
7. **Dependencies**: Preserve category → subcategory logic with Dropdown
8. **Authentication**: No changes; MSAL integration unchanged
9. **Performance**: Tree-shaking via Vite; monitor bundle size
10. **Accessibility**: Built-in Fluent UI accessibility + axe-core validation

## Open Questions (NONE)

All technical decisions resolved through research. Ready to proceed to Phase 1 (data model, contracts, quickstart).

## References

- Fluent UI React v9 Documentation: https://react.fluentui.dev/
- Fluent UI Component Examples: https://react.fluentui.dev/?path=/docs/components
- SharePoint Design Patterns: Fluent UI used internally by SharePoint Online
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Vite Tree-shaking: https://vitejs.dev/guide/features.html#tree-shaking
