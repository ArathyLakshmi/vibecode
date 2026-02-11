import React from 'react'

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
  const [form, setForm] = React.useState({
    title: '',
    date: '',
    altDate: '',
    category: '',
    subcategory: '',
    description: '',
    comments: '',
    classification: ''
  })
  const [errors, setErrors] = React.useState({})
  const [status, setStatus] = React.useState(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [savingDraft, setSavingDraft] = React.useState(false)

  const subcategories = form.category ? CATEGORY_OPTIONS[form.category] || [] : []

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
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
      const payload = {
        MeetingTitle: form.title,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category,
        MeetingSubcategory: form.subcategory,
        MeetingDescription: form.description,
        Comments: form.comments,
        Classification: form.classification
      }
      const res = await fetch('/api/meetingrequests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const payload = {
        MeetingTitle: form.title,
        MeetingDate: form.date || null,
        AlternateDate: form.altDate || null,
        MeetingCategory: form.category,
        MeetingSubcategory: form.subcategory,
        MeetingDescription: form.description,
        Comments: form.comments,
        Classification: form.classification
      }
      const res = await fetch('/api/meetingrequests/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <form className="max-w-2xl mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-4">Create Meeting Request</h2>

      <label className="block mb-2">
        <span className="text-sm font-medium">Meeting Title</span>
        <input name="title" maxLength={LIMITS.title} value={form.title} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
        <div className="text-xs text-gray-500">{form.title.length}/{LIMITS.title}</div>
        {errors.title && <div className="text-red-600 text-sm">{errors.title}</div>}
      </label>

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

      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="block">
          <span className="text-sm font-medium">Meeting Category</span>
          <select name="category" value={form.category} onChange={handleChange} className="mt-1 block w-full border rounded p-2">
            <option value="">Select category</option>
            {Object.keys(CATEGORY_OPTIONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <div className="text-red-600 text-sm">{errors.category}</div>}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Meeting Subcategory</span>
          <select name="subcategory" value={form.subcategory} onChange={handleChange} className="mt-1 block w-full border rounded p-2">
            <option value="">Select subcategory</option>
            {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.subcategory && <div className="text-red-600 text-sm">{errors.subcategory}</div>}
        </label>
      </div>

      <label className="block mt-4">
        <span className="text-sm font-medium">Meeting Description</span>
        <textarea name="description" maxLength={LIMITS.description} value={form.description} onChange={handleChange} className="mt-1 block w-full border rounded p-2" rows={4} />
        <div className="text-xs text-gray-500">{form.description.length}/{LIMITS.description}</div>
        {errors.description && <div className="text-red-600 text-sm">{errors.description}</div>}
      </label>

      <label className="block mt-4">
        <span className="text-sm font-medium">Comments</span>
        <textarea name="comments" maxLength={LIMITS.comments} value={form.comments} onChange={handleChange} className="mt-1 block w-full border rounded p-2" rows={2} />
        <div className="text-xs text-gray-500">{form.comments.length}/{LIMITS.comments}</div>
        {errors.comments && <div className="text-red-600 text-sm">{errors.comments}</div>}
      </label>

      <label className="block mt-4">
        <span className="text-sm font-medium">Classification of Meeting</span>
        <input name="classification" value={form.classification} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
        {errors.classification && <div className="text-red-600 text-sm">{errors.classification}</div>}
      </label>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={submitting} className={`px-4 py-2 rounded ${submitting ? 'bg-gray-400' : 'bg-blue-600 text-white'}`}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
        <button type="button" onClick={handleSaveDraft} disabled={savingDraft} className={`px-3 py-2 rounded border ${savingDraft ? 'bg-gray-100' : ''}`}>
          {savingDraft ? 'Saving…' : 'Save Draft'}
        </button>
        {status && status.ok && <div className="text-green-600">Submitted (id: {status.id})</div>}
        {status && status.draft && <div className="text-blue-600">Draft saved (id: {status.id})</div>}
        {status && !status.ok && !status.draft && <div className="text-red-600">Error: {status.message}</div>}
      </div>
    </form>
  )
}
