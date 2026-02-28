import React from 'react'
import { useMsal, useIsAuthenticated, useAccount } from '@azure/msal-react'
import { loginRequest } from '../auth/msalConfig'
import {
  FluentProvider,
  webLightTheme,
  Field,
  Input,
  Textarea,
  Dropdown,
  Button,
  MessageBar,
  Text
} from '@fluentui/react-components'

const CATEGORY_OPTIONS = {
  Governance: ['Board Meeting', 'Committee Meeting'],
  Operations: ['Planning', 'Retrospective'],
  HR: ['Hiring', 'Onboarding']
}

const LIMITS = {
  title: 200,
  description: 4000,
  comments: 1000
}

export default function MeetingRequestForm() {
  const [currentUserName, setCurrentUserName] = React.useState(null)
  const [form, setForm] = React.useState({
    title: '',
    date: '',
    altDate: '',
    category: '',
    subcategory: '',
    description: '',
    comments: '',
    classification: '',
    requestorName: '',
    requestType: '',
    country: ''
  })
  const [errors, setErrors] = React.useState({})
  const [status, setStatus] = React.useState(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [savingDraft, setSavingDraft] = React.useState(false)

  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts && accounts.length > 0 ? accounts[0] : null

  React.useEffect(() => {
    if (account && account.name) setCurrentUserName(account.name)
    else setCurrentUserName(null)
  }, [account])

  const subcategories = form.category ? CATEGORY_OPTIONS[form.category] || [] : []

  function handleChange(fieldName) {
    return (e, data) => {
setForm(f => ({ ...f, [fieldName]: data.value || '' }))
    }
  }

  function handleDropdownChange(fieldName) {
    return (e, option) => {
      if (fieldName === 'category') {
        setForm(f => ({ ...f, category: option?.key || '', subcategory: '' }))
      } else {
        setForm(f => ({ ...f, [ fieldName]: option?.key || '' }))
      }
    }
  }

  function handleDateChange(fieldName) {
    return (e) => {
      const iso = e.target.value || ''
      setForm(f => ({ ...f, [fieldName]: iso }))
    }
  }

  function validate() {
    const req = ['title','date','altDate','category','subcategory','description','comments','classification']
    const next = {}
    for (const k of req) {
      if (!form[k] || String(form[k]).trim() === '') next[k] = 'Required'
    }
    // length checks
    if (form.title && form.title.length > LIMITS.title) next.title = `Max ${LIMITS.title} chars`
    if (form.description && form.description.length > LIMITS.description) next.description = `Max ${LIMITS.description} chars`
    if (form.comments && form.comments.length > LIMITS.comments) next.comments = `Max ${LIMITS.comments} chars`
    // date checks
    const today = new Date().toISOString().slice(0,10)
    if (form.date && form.date < today) next.date = 'Meeting date cannot be in the past'
    if (form.altDate && form.altDate < today) next.altDate = 'Alternate date cannot be in the past'
    if (form.date && form.altDate && form.date === form.altDate) next.altDate = 'Alternate date must differ from meeting date'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      let requestorToSend = currentUserName ?? (form.requestorName || undefined)
      let authHeader = {}
      if (isAuthenticated && account) {
        try {
          const resp = await instance.acquireTokenSilent({ scopes: loginRequest.scopes, account })
          authHeader = { Authorization: `Bearer ${resp.accessToken}` }
        } catch (e) {
          try { const resp = await instance.acquireTokenPopup({ scopes: loginRequest.scopes }); authHeader = { Authorization: `Bearer ${resp.accessToken}` } } catch { }
        }
      }
      const payload = {
        MeetingTitle: form.title,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category,
        MeetingSubcategory: form.subcategory,
        MeetingDescription: form.description,
        Comments: form.comments,
        Classification: form.classification
        , RequestorName: requestorToSend
        , RequestType: form.requestType || undefined
        , Country: form.country || undefined
      }
      const res = await fetch('/api/meetingrequests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Server error')
      }
      const data = await res.json()
      setStatus({ ok: true, id: data.id })
      setForm({ title: '', date: '', altDate: '', category: '', subcategory: '', description: '', comments: '', classification: '' })
      setErrors({})
    } catch (err) {
      setStatus({ ok: false, message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveDraft() {
    setStatus(null)
    // allow saving partial drafts without full validation
    setSavingDraft(true)
    try {
      let requestorToSend = currentUserName ?? (form.requestorName || undefined)
      let authHeader = {}
      if (isAuthenticated && account) {
        try {
          const resp = await instance.acquireTokenSilent({ scopes: loginRequest.scopes, account })
          authHeader = { Authorization: `Bearer ${resp.accessToken}` }
        } catch (e) {
          try { const resp = await instance.acquireTokenPopup({ scopes: loginRequest.scopes }); authHeader = { Authorization: `Bearer ${resp.accessToken}` } } catch { }
        }
      }
      const payload = {
        MeetingTitle: form.title,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category,
        MeetingSubcategory: form.subcategory,
        MeetingDescription: form.description,
        Comments: form.comments,
        Classification: form.classification
        , RequestorName: requestorToSend
        , RequestType: form.requestType || undefined
        , Country: form.country || undefined
      }
      const res = await fetch('/api/meetingrequests/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Server error')
      }
      const data = await res.json()
      setStatus({ draft: true, id: data.id })
    } catch (err) {
      setStatus({ draft: false, message: err.message })
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <FluentProvider theme={webLightTheme}>
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

        <div className="space-y-5">
          {/* Title Field */}
          <div className="space-y-1">
            <Field
              label="Meeting Title"
              validationState={errors.title ? "error" : undefined}
              validationMessage={errors.title}
            >
              <Input
                value={form.title}
                onChange={handleChange('title')}
                maxLength={LIMITS.title}
              />
            </Field>
            <Text size={200} className="text-gray-500">
              {form.title.length}/{LIMITS.title}
            </Text>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Meeting Date"
              validationState={errors.date ? "error" : undefined}
              validationMessage={errors.date}
            >
              <Input
                type="date"
                value={form.date}
                onChange={handleDateChange('date')}
                placeholder="Select meeting date"
              />
            </Field>
            
            <Field
              label="Alternate Date"
              validationState={errors.altDate ? "error" : undefined}
              validationMessage={errors.altDate}
            >
              <Input
                type="date"
                value={form.altDate}
                onChange={handleDateChange('altDate')}
                placeholder="Select alternate date"
              />
            </Field>
          </div>

          {/* Category and Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dropdown
              label="Meeting Category"
              placeholder="Select category"
              selectedKey={form.category || undefined}
              options={Object.keys(CATEGORY_OPTIONS).map(c => ({ key: c, text: c }))}
              onChange={handleDropdownChange('category')}
              validationState={errors.category ? "error" : undefined}
              validationMessage={errors.category}
            />

            <Dropdown
              label="Meeting Subcategory"
              placeholder="Select subcategory"
              selectedKey={form.subcategory || undefined}
              options={subcategories.map(s => ({ key: s, text: s }))}
              onChange={handleDropdownChange('subcategory')}
              validationState={errors.subcategory ? "error" : undefined}
              validationMessage={errors.subcategory}
              disabled={!form.category}
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1">
            <Field
              label="Meeting Description"
              validationState={errors.description ? "error" : undefined}
              validationMessage={errors.description}
            >
              <Textarea
                value={form.description}
                onChange={handleChange('description')}
                maxLength={LIMITS.description}
                rows={4}
              />
            </Field>
            <Text size={200} className="text-gray-500">
              {form.description.length}/{LIMITS.description}
            </Text>
          </div>

          {/* Comments Field */}
          <div className="space-y-1">
            <Field
              label="Comments"
              validationState={errors.comments ? "error" : undefined}
              validationMessage={errors.comments}
            >
              <Textarea
                value={form.comments}
                onChange={handleChange('comments')}
                maxLength={LIMITS.comments}
                rows={2}
              />
            </Field>
            <Text size={200} className="text-gray-500">
              {form.comments.length}/{LIMITS.comments}
            </Text>
          </div>

          {/* Classification Field */}
          <Field
            label="Classification of Meeting"
            validationState={errors.classification ? "error" : undefined}
            validationMessage={errors.classification}
          >
            <Input
              value={form.classification}
              onChange={handleChange('classification')}
            />
          </Field>

          {/* Requestor Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {currentUserName ? (
              <Field label="Requestor">
                <Input value={currentUserName} readOnly />
              </Field>
            ) : (
              <Field label="Requestor">
                <Input
                  value={form.requestorName}
                  onChange={handleChange('requestorName')}
                />
              </Field>
            )}

            <Field label="Request Type">
              <Input
                value={form.requestType}
                onChange={handleChange('requestType')}
              />
            </Field>

            <Field label="Country">
              <Input
                value={form.country}
                onChange={handleChange('country')}
              />
            </Field>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
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
          </div>
        </div>
      </form>
    </FluentProvider>
  )
}

// end of file

