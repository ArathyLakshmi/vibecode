# Quickstart Guide: Modern Form UI with Fluent UI

**Feature**: 006-modern-form-ui  
**Date**: 2026-02-11  
**Estimated Time**: 2-3 hours implementation + 30-60 minutes testing

## Overview

This guide provides step-by-step instructions for modernizing the MeetingRequestForm component with Microsoft Fluent UI React v9 components.

## Prerequisites

- Node.js 18+ and npm installed
- React 18.2.0 project configured (already present)
- Vite 5.0 build tool configured (already present)
- Tailwind CSS 3.4.8 configured (already present)
- Git branch: `006-modern-form-ui` (already created)

## Implementation Steps

### Step 1: Install Dependencies (5 minutes)

```bash
cd src/client
npm install @fluentui/react-components @fluentui/react-icons
```

**Verify installation**:
```bash
npm list @fluentui/react-components
# Expected: @fluentui/react-components@9.x.x
```

**Bundle size check** (after installation):
```bash
npm run build
# Note the dist/ size for comparison after implementation
```

---

### Step 2: Update Imports (5 minutes)

Open `src/client/src/components/MeetingRequestForm.jsx`.

**Add Fluent UI imports** at the top:
```javascript
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

**Keep existing imports**:
```javascript
import React from 'react'
import { useMsal, useIsAuthenticated, useAccount } from '@azure/msal-react'
import { loginRequest } from '../auth/msalConfig'
```

---

### Step 3: Wrap Form in FluentProvider (2 minutes)

Replace the return statement's outermost element:

**Before**:
```jsx
return (
  <form className="max-w-2xl mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
```

**After**:
```jsx
return (
  <FluentProvider theme={webLightTheme}>
    <form className="max-w-2xl mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
      {/* form content */}
    </form>
  </FluentProvider>
)
```

---

### Step 4: Replace Title Field (10 minutes)

**Before** (HTML input):
```jsx
<label className="block mb-2">
  <span className="text-sm font-medium">Meeting Title</span>
  <input name="title" maxLength={LIMITS.title} value={form.title} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
  <div className="text-xs text-gray-500">{form.title.length}/{LIMITS.title}</div>
  {errors.title && <div className="text-red-600 text-sm">{errors.title}</div>}
</label>
```

**After** (Fluent UI TextField):
```jsx
<Stack tokens={{ childrenGap: 4 }}>
  <TextField
    label="Meeting Title"
    value={form.title}
    onChange={(e, data) => setForm(f => ({ ...f, title: data.value }))}
    maxLength={LIMITS.title}
    validationState={errors.title ? "error" : undefined}
    validationMessage={errors.title}
  />
  <Text size={200} className="text-gray-500">
    {form.title.length}/{LIMITS.title}
  </Text>
</Stack>
```

**Update handleChange** (if needed for other fields):
```javascript
function handleChange(fieldName) {
  return (e, data) => {
    setForm(f => ({ ...f, [fieldName]: data.value }))
  }
}
```

---

### Step 5: Replace Date Fields (15 minutes)

**Before** (HTML date inputs):
```jsx
<div className="grid grid-cols-2 gap-4">
  <label className="block mb-2">
    <span className="text-sm font-medium">Meeting Date</span>
    <input type="date" name="date" value={form.date} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
    {errors.date && <div className="text-red-600 text-sm">{errors.date}</div>}
  </label>

  <label className="block mb-2">
    <span className="text-sm font-medium">Alternate Date</span>
    <input type="date" name="altDate" value={form.altDate} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
    {errors.altDate && <div className="text-red-600 text-sm">{errors.altDate}</div>}
  </label>
</div>
```

**After** (Fluent UI DatePicker):
```jsx
<Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 md:grid-cols-2">
  <DatePicker
    label="Meeting Date"
    value={form.date ? new Date(form.date) : undefined}
    onSelectDate={(date) => {
      const iso = date ? date.toISOString().slice(0, 10) : '';
      setForm(f => ({ ...f, date: iso }));
    }}
    validationState={errors.date ? "error" : undefined}
    validationMessage={errors.date}
    placeholder="Select meeting date"
  />
  
  <DatePicker
    label="Alternate Date"
    value={form.altDate ? new Date(form.altDate) : undefined}
    onSelectDate={(date) => {
      const iso = date ? date.toISOString().slice(0, 10) : '';
      setForm(f => ({ ...f, altDate: iso }));
    }}
    validationState={errors.altDate ? "error" : undefined}
    validationMessage={errors.altDate}
    placeholder="Select alternate date"
  />
</Stack>
```

---

### Step 6: Replace Category/Subcategory Dropdowns (15 minutes)

**Before** (HTML select):
```jsx
<div className="grid grid-cols-2 gap-4 mt-4">
  <label className="block">
    <span className="text-sm font-medium">Meeting Category</span>
    <select name="category" value={form.category} onChange={handleChange} className="mt-1 block w-full border rounded p-2">
      <option value="">Select category</option>
      {Object.keys(CATEGORY_OPTIONS).map(c => <option key={c} value={c}>{c}</option>)}
    </select>
    {errors.category && <div className="text-red-600 text-sm">{errors.category}</div>}
  </label>

  {/* Similar for subcategory */}
</div>
```

**After** (Fluent UI Dropdown):
```jsx
<Stack horizontal tokens={{ childrenGap: 16 }} className="grid grid-cols-1 md:grid-cols-2">
  <Dropdown
    label="Meeting Category"
    placeholder="Select category"
    selectedKey={form.category}
    options={Object.keys(CATEGORY_OPTIONS).map(c => ({ key: c, text: c }))}
    onChange={(e, option) => {
      setForm(f => ({
        ...f,
        category: option?.key || '',
        subcategory: ''  // Reset subcategory when category changes
      }));
    }}
    validationState={errors.category ? "error" : undefined}
    validationMessage={errors.category}
  />

  <Dropdown
    label="Meeting Subcategory"
    placeholder="Select subcategory"
    selectedKey={form.subcategory}
    options={subcategories.map(s => ({ key: s, text: s }))}
    onChange={(e, option) => {
      setForm(f => ({ ...f, subcategory: option?.key || '' }));
    }}
    validationState={errors.subcategory ? "error" : undefined}
    validationMessage={errors.subcategory}
    disabled={!form.category}  // Disable until category selected
  />
</Stack>
```

---

### Step 7: Replace Multiline Text Fields (10 minutes)

**Before** (HTML textarea):
```jsx
<label className="block mt-4">
  <span className="text-sm font-medium">Meeting Description</span>
  <textarea name="description" maxLength={LIMITS.description} value={form.description} onChange={handleChange} className="mt-1 block w-full border rounded p-2" rows={4} />
  <div className="text-xs text-gray-500">{form.description.length}/{LIMITS.description}</div>
  {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
</label>
```

**After** (Fluent UI TextField multiline):
```jsx
<Stack tokens={{ childrenGap: 4 }}>
  <TextField
    label="Meeting Description"
    value={form.description}
    onChange={(e, data) => setForm(f => ({ ...f, description: data.value }))}
    maxLength={LIMITS.description}
    multiline
    rows={4}
    validationState={errors.description ? "error" : undefined}
    validationMessage={errors.description}
  />
  <Text size={200} className="text-gray-500">
    {form.description.length}/{LIMITS.description}
  </Text>
</Stack>
```

**Repeat for Comments field** (same pattern, rows={2}).

---

### Step 8: Replace Remaining TextField Inputs (10 minutes)

Apply the same pattern to:
- Classification
- RequestType
- Country

**Pattern**:
```jsx
<TextField
  label="[Field Label]"
  value={form.[fieldName]}
  onChange={(e, data) => setForm(f => ({ ...f, [fieldName]: data.value }))}
  validationState={errors.[fieldName] ? "error" : undefined}
  validationMessage={errors.[fieldName]}
/>
```

**Requestor field** (conditional read-only):
```jsx
{currentUserName ? (
  <TextField
    label="Requestor"
    value={currentUserName}
    readOnly
  />
) : (
  <TextField
    label="Requestor"
    value={form.requestorName}
    onChange={(e, data) => setForm(f => ({ ...f, requestorName: data.value }))}
  />
)}
```

---

### Step 9: Replace Action Buttons (10 minutes)

**Before** (HTML buttons):
```jsx
<div className="mt-6 flex items-center gap-4">
  <button type="submit" disabled={submitting} className={`px-4 py-2 rounded ${submitting ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}>
    {submitting ? 'Submitting…' : 'Submit Request'}
  </button>
  <button type="button" onClick={handleSaveDraft} disabled={savingDraft} className={`px-3 py-2 rounded border ${savingDraft ? 'bg-gray-100' : ''}`}>
    {savingDraft ? 'Saving…' : 'Save Draft'}
  </button>
  {/* Status messages */}
</div>
```

**After** (Fluent UI Buttons):
```jsx
<Stack horizontal tokens={{ childrenGap: 12 }} className="mt-6">
  <Button
    type="submit"
    appearance="primary"
    disabled={submitting}
  >
    {submitting ? 'Submitting…' : 'Submit Request'}
  </Button>
  
  <Button
    type="button"
    appearance="secondary"
    onClick={handleSaveDraft}
    disabled={savingDraft}
  >
    {savingDraft ? 'Saving…' : 'Save Draft'}
  </Button>
</Stack>
```

---

### Step 10: Replace Status Messages (10 minutes)

**Before** (inline divs):
```jsx
{status && status.ok && <div className="text-green-600">Submitted (id: {status.id})</div>}
{status && status.draft && <div className="text-blue-600">Draft saved (id: {status.id})</div>}
{status && !status.ok && !status.draft && <div className="text-red-600">Error: {status.message}</div>}
```

**After** (Fluent UI MessageBar, at top of form):
```jsx
<form className="max-w-2xl mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
  <h2 className="text-xl font-semibold mb-4">Create Meeting Request</h2>
  
  {status && status.ok && (
    <MessageBar intent="success" className="mb-4">
      Meeting request submitted successfully (ID: {status.id})
    </MessageBar>
  )}
  
  {status && status.draft && (
    <MessageBar intent="info" className="mb-4">
      Draft saved successfully (ID: {status.id})
    </MessageBar>
  )}
  
  {status && !status.ok && !status.draft && (
    <MessageBar intent="error" className="mb-4">
      Error: {status.message}
    </MessageBar>
  )}
  
  <Stack tokens={{ childrenGap: 20 }}>
    {/* Form fields */}
  </Stack>
</form>
```

---

### Step 11: Test Locally (15 minutes)

**Start development server**:
```bash
cd src/client
npm run dev
```

**Manual testing checklist**:
- [ ] Form loads without errors
- [ ] All fields render with Fluent UI styling
- [ ] Title field shows character counter
- [ ] Date pickers open calendar on click
- [ ] Category selection updates subcategory options
- [ ] Validation errors display on empty submit
- [ ] Error messages appear below fields with red border
- [ ] Submit succeeds with valid data
- [ ] Success message displays with green MessageBar
- [ ] Draft save works and shows blue MessageBar
- [ ] Authenticated user sees read-only requestor name
- [ ] Form resets after successful submission

**Responsive testing**:
- [ ] Mobile (<= 640px): Single column stacked layout
- [ ] Tablet (641-1023px): Two-column date/category fields
- [ ] Desktop (>= 1024px): Three-column requestor details

**Browser testing**:
- [ ] Chrome: Form works correctly
- [ ] Firefox: Form works correctly
- [ ] Edge: Form works correctly

---

### Step 12: Update E2E Tests (20 minutes)

If E2E tests rely on specific selectors, update them:

**Add data-testid attributes** to components:
```jsx
<TextField
  data-testid="field-title"
  label="Meeting Title"
  // ...
/>

<Button
  data-testid="button-submit"
  type="submit"
  // ...
/>
```

**Update test selectors** in `src/client/e2e/tests/*.spec.ts`:
```typescript
// Before
await page.fill('input[name="title"]', 'Test Title');

// After
await page.fill('[data-testid="field-title"] input', 'Test Title');

// Or use Fluent UI's accessible selectors
await page.fill('input[aria-label="Meeting Title"]', 'Test Title');
```

**Run E2E tests**:
```bash
cd src/client
npm run e2e
```

---

### Step 13: Accessibility Validation (10 minutes)

**Install axe-core** (if not already present):
```bash
npm install -D @axe-core/playwright
```

**Add accessibility test** to E2E suite:
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('meeting request form has no accessibility violations', async ({ page }) => {
  await page.goto('/meeting-requests/new');
  
  const results = await new AxeBuilder({ page }).analyze();
  
  expect(results.violations).toEqual([]);
});
```

**Manual keyboard testing**:
- [ ] Tab through all fields sequentially
- [ ] Open dropdowns with Enter/Space
- [ ] Navigate dropdown options with arrow keys
- [ ] Select dropdown option with Enter
- [ ] Close dropdown with Escape
- [ ] Open date picker with Enter
- [ ] Navigate calendar with arrow keys
- [ ] Submit form with Enter on submit button
- [ ] All focus indicators visible

---

### Step 14: Bundle Size Verification (5 minutes)

**Build for production**:
```bash
npm run build
```

**Check output**:
```bash
# Check dist/ folder size
ls -lh dist/assets/

# Look for main JavaScript bundle size
# Should be < 150KB gzipped increase (per spec NFR-005)
```

**If bundle too large**, consider:
- Lazy loading the form component
- Code splitting Fluent UI imports
- Tree-shaking verification

---

### Step 15: Commit Changes (5 minutes)

```bash
git add src/client/src/components/MeetingRequestForm.jsx
git add src/client/package.json src/client/package-lock.json
git commit -m "feat(006): Modernize form UI with Fluent UI components

- Replace HTML inputs with Fluent UI TextField
- Replace HTML selects with Fluent UI Dropdown
- Replace HTML date inputs with Fluent UI DatePicker
- Replace HTML buttons with Fluent UI Button
- Add FluentProvider with webLightTheme
- Implement validation states with Fluent UI props
- Add MessageBar for status messages
- Maintain responsive layout with Stack + Tailwind
- Preserve all existing functionality (validation, auth, API calls)
- Update character counters with Fluent UI Text component"
```

---

## Common Issues & Solutions

### Issue: Fluent UI styles not applying

**Solution**: Ensure `FluentProvider` wraps the form:
```jsx
<FluentProvider theme={webLightTheme}>
  {/* form content */}
</FluentProvider>
```

### Issue: DatePicker shows NaN or invalid date

**Solution**: Convert ISO string to Date object:
```jsx
value={form.date ? new Date(form.date) : undefined}
```

### Issue: Dropdown not showing selected value

**Solution**: Use `selectedKey` prop (not `value`):
```jsx
<Dropdown selectedKey={form.category} /* ... */ />
```

### Issue: Validation messages not appearing

**Solution**: Use both `validationState` and `validationMessage`:
```jsx
<TextField
  validationState={errors.title ? "error" : undefined}
  validationMessage={errors.title}
/>
```

### Issue: Form fields too wide on mobile

**Solution**: Ensure responsive Tailwind classes:
```jsx
<Stack horizontal className="grid grid-cols-1 md:grid-cols-2">
```

### Issue: Bundle size increased significantly

**Solution**: Check for duplicate dependencies or missing tree-shaking. Verify Vite is configured correctly.

---

## Next Steps

After completing this quickstart:

1. **Visual Review**: Compare form appearance with SharePoint/Microsoft 365 reference
2. **User Acceptance Testing**: Get feedback from stakeholders
3. **Performance Testing**: Measure form load time and interaction responsiveness
4. **Integration Testing**: Verify form works with backend API in staging environment
5. **Documentation**: Update user documentation if needed
6. **Deployment**: Merge to main branch and deploy to production

---

## Reference Links

- [Fluent UI React v9 Documentation](https://react.fluentui.dev/)
- [TextField Component](https://react.fluentui.dev/?path=/docs/components-input-textfield--default)
- [Dropdown Component](https://react.fluentui.dev/?path=/docs/components-input-dropdown--default)
- [DatePicker Component](https://react.fluentui.dev/?path=/docs/components-input-datepicker--default)
- [Button Component](https://react.fluentui.dev/?path=/docs/components-button-button--default)
- [MessageBar Component](https://react.fluentui.dev/?path=/docs/components-messagebar--default)
- [Stack Component](https://react.fluentui.dev/?path=/docs/components-layout-stack--default)

---

## Support

For issues or questions during implementation:
- Review [spec.md](../spec.md) for requirements
- Check [contracts/README.md](../contracts/README.md) for component interfaces
- Review [research.md](../research.md) for technical decisions
- Consult Fluent UI documentation for component-specific help
