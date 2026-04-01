import React from 'react'
import { useMsal, useIsAuthenticated, useAccount } from '@azure/msal-react'
import { loginRequest } from '../auth/msalConfig'
import {
  FluentProvider,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Button,
  MessageBar,
  Text,
  Card,
  CardHeader
} from '@fluentui/react-components'
import { accessibleTheme } from '../theme/accessibleTheme'
import { Attach24Regular, Dismiss24Regular, Eye24Regular, ArrowDownload24Regular } from '@fluentui/react-icons'

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

export default function MeetingRequestForm({ initialData = null, onSuccess = null }) {
  const isEditMode = !!initialData
  const [currentUserName, setCurrentUserName] = React.useState('')
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
  
  // File attachment state (T028-T030)
  const [attachments, setAttachments] = React.useState([])
  const [existingAttachments, setExistingAttachments] = React.useState([])
  const [loadingExisting, setLoadingExisting] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState(null)

  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts && accounts.length > 0 ? accounts[0] : null

  React.useEffect(() => {
    if (account && account.name) setCurrentUserName(account.name)
    else setCurrentUserName('')
  }, [account])

  React.useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? initialData.meetingTitle ?? '',
        date: initialData.meetingDate ?? initialData.MeetingDate ? new Date(initialData.meetingDate ?? initialData.MeetingDate).toISOString().slice(0, 10) : '',
        altDate: initialData.alternateDate ?? initialData.AlternateDate ? new Date(initialData.alternateDate ?? initialData.AlternateDate).toISOString().slice(0, 10) : '',
        category: initialData.category ?? initialData.meetingCategory ?? initialData.MeetingCategory ?? '',
        subcategory: initialData.subcategory ?? initialData.meetingSubcategory ?? initialData.MeetingSubcategory ?? '',
        description: initialData.description ?? initialData.meetingDescription ?? initialData.MeetingDescription ?? '',
        comments: initialData.comments ?? initialData.Comments ?? '',
        classification: initialData.classification ?? initialData.Classification ?? '',
        requestorName: initialData.requestorName ?? initialData.requestor ?? initialData.RequestorName ?? '',
        requestType: initialData.requestType ?? initialData.type ?? initialData.RequestType ?? '',
        country: initialData.country ?? ''
      })
    }
  }, [initialData])

  // Fetch existing attachments when in edit mode
  React.useEffect(() => {
    if (isEditMode && initialData?.id) {
      setLoadingExisting(true)
      fetch(`/api/meetingrequests/${initialData.id}/attachments`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch attachments')
          return res.json()
        })
        .then(data => {
          setExistingAttachments(data || [])
        })
        .catch(err => {
          console.error('Error fetching existing attachments:', err)
          setExistingAttachments([])
        })
        .finally(() => {
          setLoadingExisting(false)
        })
    }
  }, [isEditMode, initialData?.id])

  React.useEffect(() => {
    if (status) {
      // Find the drawer's scrollable container (parent element with overflow-auto)
      const formElement = document.querySelector('form')
      const scrollContainer = formElement?.closest('.overflow-auto') || formElement?.closest('aside > div')
      
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [status])

  const subcategories = form.category ? CATEGORY_OPTIONS[form.category] || [] : []

  function handleChange(fieldName) {
    return (e, data) => {
setForm(f => ({ ...f, [fieldName]: data.value || '' }))
    }
  }

  function handleDropdownChange(fieldName) {
    return (e, data) => {
      const value = data.optionValue ?? ''
      if (fieldName === 'category') {
        // Only reset subcategory if the category is actually changing
        setForm(f => {
          if (f.category !== value) {
            return { ...f, category: value, subcategory: '' }
          }
          return { ...f, category: value }
        })
      } else {
        setForm(f => ({ ...f, [fieldName]: value }))
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

  // T032: Handle file selection with client-side validation
  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadError(null)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
    const MAX_ATTACHMENTS = 5
    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.txt']

    // Validate total count
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setUploadError(`Maximum ${MAX_ATTACHMENTS} attachments allowed`)
      return
    }

    // Validate each file
    const validFiles = []
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`Invalid file type: ${file.name}. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`)
        return
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File too large: ${file.name}. Maximum size is 10 MB`)
        return
      }
      
      validFiles.push(file)
    }

    setAttachments(prev => [...prev, ...validFiles])
    e.target.value = '' // Reset input
  }

  // T033: Remove attachment before upload
  function removeAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index))
    setUploadError(null)
  }

  // Delete existing attachment
  async function deleteExistingAttachment(attachmentId) {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const res = await fetch(`/api/meetingrequests/${initialData.id}/attachments/${attachmentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete attachment')

      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId))
    } catch (err) {
      alert('Error deleting attachment: ' + err.message)
    }
  }

  // Preview existing attachment
  async function previewExistingAttachment(attachmentId, fileName, contentType) {
    try {
      const previewableTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'text/html',
        'text/csv'
      ]

      const isPreviewable = previewableTypes.includes(contentType.toLowerCase())

      const res = await fetch(`/api/meetingrequests/${initialData.id}/attachments/${attachmentId}`)
      if (!res.ok) throw new Error('Failed to load file')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      if (isPreviewable) {
        window.open(url, '_blank')
        setTimeout(() => window.URL.revokeObjectURL(url), 60000)
      } else {
        // Download if not previewable
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      alert('Error loading attachment: ' + err.message)
    }
  }

  // T035: Upload attachments sequentially
  async function uploadAttachments(requestId, authHeader) {
    if (attachments.length === 0) return true

    setUploading(true)
    setUploadError(null)

    try {
      for (let i = 0; i < attachments.length; i++) {
        const file = attachments[i]
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/meetingrequests/${requestId}/attachments`, {
          method: 'POST',
          headers: authHeader,
          body: formData
        })

        if (!res.ok) {
          const errorText = await res.text()
          let errorMessage
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorText
          } catch {
            errorMessage = errorText
          }
          throw new Error(`Failed to upload ${file.name}: ${errorMessage}`)
        }
      }

      // Clear attachments after successful upload
      setAttachments([])
      return true
    } catch (err) {
      setUploadError(err.message)
      return false
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      let requestorToSend = currentUserName || form.requestorName || undefined
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
        MeetingTitle: form.title || undefined,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category || undefined,
        MeetingSubcategory: form.subcategory || undefined,
        MeetingDescription: form.description || undefined,
        Comments: form.comments || undefined,
        Classification: form.classification || undefined,
        Status: 'Pending'
        , RequestorName: requestorToSend
        , RequestType: form.requestType || undefined
        , Country: form.country || undefined
      }
      
      // Add UpdatedBy for edit mode
      if (isEditMode && currentUserName) {
        payload.UpdatedBy = currentUserName
      }
      
      const url = isEditMode ? `/api/meetingrequests/${initialData.id}` : '/api/meetingrequests'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Server error')
      }
      const data = await res.json()
      
      // T036: Upload attachments after request creation or update
      if (attachments.length > 0) {
        const requestId = isEditMode ? initialData.id : data.id
        const uploadSuccess = await uploadAttachments(requestId, authHeader)
        if (!uploadSuccess) {
          // Request created/updated but attachments failed
          setStatus({ ok: true, id: requestId, isEdit: isEditMode, attachmentWarning: true })
          setErrors({})
          if (onSuccess) {
            onSuccess(data)
          }
          return
        }
      }
      
      setStatus({ ok: true, id: isEditMode ? initialData.id : data.id, isEdit: isEditMode })
      
      if (!isEditMode) {
        // Only reset form on create
        setForm({ title: '', date: '', altDate: '', category: '', subcategory: '', description: '', comments: '', classification: '', requestorName: '', requestType: '', country: '' })
      }
      
      setErrors({})
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data)
      }
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
      let requestorToSend = currentUserName || form.requestorName || undefined
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
        MeetingTitle: form.title || undefined,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category || undefined,
        MeetingSubcategory: form.subcategory || undefined,
        MeetingDescription: form.description || undefined,
        Comments: form.comments || undefined,
        Classification: form.classification || undefined,
        Status: 'Draft'
        , RequestorName: requestorToSend
        , RequestType: form.requestType || undefined
        , Country: form.country || undefined
      }
      
      // Add UpdatedBy for edit mode
      if (isEditMode && currentUserName) {
        payload.UpdatedBy = currentUserName
      }
      
      // Use appropriate endpoint based on mode
      const url = isEditMode ? `/api/meetingrequests/${initialData.id}` : '/api/meetingrequests/draft'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Server error')
      }
      const data = await res.json()
      
      // Upload attachments after draft creation/update
      if (attachments.length > 0) {
        const requestId = isEditMode ? initialData.id : data.id
        const uploadSuccess = await uploadAttachments(requestId, authHeader)
        if (!uploadSuccess) {
          // Draft saved but attachments failed
          setStatus({ draft: true, id: requestId, isEdit: isEditMode, attachmentWarning: true })
          if (onSuccess) {
            onSuccess(data)
          }
          return
        }
      }
      
      setStatus({ draft: true, id: isEditMode ? initialData.id : data.id, isEdit: isEditMode })
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err) {
      setStatus({ draft: false, message: err.message })
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <FluentProvider theme={accessibleTheme}>
      <form className="max-w-2xl mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
        {status && status.ok && (
          <MessageBar intent="success" className="mb-4">
            {status.isEdit ? 'Meeting request updated successfully' : `Meeting request submitted successfully (ID: ${status.id})`}
            {status.attachmentWarning && uploadError && (
              <div className="mt-2 text-sm">Warning: {uploadError}</div>
            )}
          </MessageBar>
        )}
        
        {uploadError && !status && (
          <MessageBar intent="warning" className="mb-4">
            {uploadError}
          </MessageBar>
        )}
        
        {status && status.draft && (
          <MessageBar intent="info" className="mb-4">
            {status.isEdit ? `Draft updated successfully (ID: ${status.id})` : `Draft saved successfully (ID: ${status.id})`}
            {status.attachmentWarning && uploadError && (
              <div className="mt-2 text-sm">Warning: {uploadError}</div>
            )}
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
          <div className="space-y-4">
            <Field
              label="Meeting Category"
              validationState={errors.category ? "error" : undefined}
              validationMessage={errors.category}
            >
              <Dropdown
                placeholder="Select category"
                value={form.category}
                selectedOptions={form.category ? [form.category] : []}
                onOptionSelect={handleDropdownChange('category')}
              >
                {Object.keys(CATEGORY_OPTIONS).map(cat => (
                  <Option key={cat} value={cat}>
                    {cat}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field
              label="Meeting Subcategory"
              validationState={errors.subcategory ? "error" : undefined}
              validationMessage={errors.subcategory}
            >
              <Dropdown
                placeholder="Select subcategory"
                value={form.subcategory}
                selectedOptions={form.subcategory ? [form.subcategory] : []}
                onOptionSelect={handleDropdownChange('subcategory')}
                disabled={!form.category}
              >
                {subcategories.map(sub => (
                  <Option key={sub} value={sub}>
                    {sub}
                  </Option>
                ))}
              </Dropdown>
            </Field>
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
            <Dropdown
              placeholder="Select classification"
              value={form.classification}
              selectedOptions={form.classification ? [form.classification] : []}
              onOptionSelect={handleDropdownChange('classification')}
            >
              <Option value="High">High</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Low">Low</Option>
            </Dropdown>
          </Field>

          {/* Request Type */}
          <Field label="Request Type">
            <Dropdown
              placeholder="Select request type"
              value={form.requestType}
              selectedOptions={form.requestType ? [form.requestType] : []}
              onOptionSelect={handleDropdownChange('requestType')}
            >
              <Option value="Regional">Regional</Option>
              <Option value="Local">Local</Option>
              <Option value="International">International</Option>
            </Dropdown>
          </Field>

          {/* T031-T034: File Attachments Section */}
          <div className="space-y-3">
            <Field label="Attachments (Optional)">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                    onChange={handleFileSelect}
                    disabled={uploading || attachments.length >= 5}
                    className="hidden"
                    id="file-input"
                  />
                  <Button
                    as="span"
                    appearance="secondary"
                    icon={<Attach24Regular />}
                    disabled={uploading || attachments.length >= 5}
                  >
                    Choose Files
                  </Button>
                </label>
                <Text size={200} className="text-gray-600">
                  {attachments.length}/5 files • Max 10 MB each
                </Text>
              </div>
            </Field>

            {/* Display existing attachments in edit mode */}
            {isEditMode && (
              <div className="space-y-2 mb-3">
                {loadingExisting ? (
                  <Text size={200} className="text-gray-600">Loading existing attachments...</Text>
                ) : existingAttachments.length > 0 ? (
                  <>
                    <Text size={300} weight="semibold">Existing Attachments ({existingAttachments.length})</Text>
                    {existingAttachments.map((attachment) => (
                      <Card key={attachment.id} size="small" className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <Text weight="semibold" size={300} className="truncate block">{attachment.fileName}</Text>
                            <Text size={200} className="text-gray-600">
                              {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.contentType}
                            </Text>
                          </div>
                          <div className="flex gap-1 ml-3 flex-shrink-0">
                            <Button
                              appearance="subtle"
                              icon={<Eye24Regular />}
                              onClick={() => previewExistingAttachment(attachment.id, attachment.fileName, attachment.contentType)}
                              title="Preview file"
                              size="small"
                            />
                            <Button
                              appearance="subtle"
                              icon={<Dismiss24Regular />}
                              onClick={() => deleteExistingAttachment(attachment.id)}
                              title="Delete attachment"
                              size="small"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Text size={200} className="text-gray-600">No existing attachments</Text>
                )}
              </div>
            )}

            {/* T034: Display new files to upload */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Text size={300} weight="semibold">New Attachments to Upload ({attachments.length})</Text>
                {attachments.map((file, index) => (
                  <Card key={index} size="small" className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <Text weight="semibold" size={300}>{file.name}</Text>
                      <Text size={200} className="text-gray-600 ml-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </Text>
                    </div>
                    <Button
                      appearance="subtle"
                      icon={<Dismiss24Regular />}
                      onClick={() => removeAttachment(index)}
                      disabled={uploading}
                      aria-label={`Remove ${file.name}`}
                    />
                  </Card>
                ))}
              </div>
            )}
            
            {isEditMode && (
              <Text size={200} className="text-gray-600 italic mt-2">
                Note: New attachments will be added to existing ones.
              </Text>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              appearance="primary"
              disabled={submitting || uploading || savingDraft}
            >
              {uploading ? 'Uploading files…' : submitting ? (isEditMode ? 'Updating…' : 'Submitting…') : (isEditMode ? 'Update Request' : 'Submit Request')}
            </Button>
            
            <Button
              type="button"
              appearance="secondary"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting || uploading}
            >
              {savingDraft ? 'Saving…' : (isEditMode ? 'Save as Draft' : 'Save Draft')}
            </Button>
          </div>
        </div>
      </form>
    </FluentProvider>
  )
}

// end of file

