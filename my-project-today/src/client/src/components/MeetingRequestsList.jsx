import React from 'react'

export default function MeetingRequestsList() {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/meetingrequests')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // API may return an array or an object containing `value`/`Count`
        const list = Array.isArray(data) ? data : (data.value || data)
        const count = (typeof data === 'object' && data !== null && ('Count' in data || 'count' in data)) ? (data.Count ?? data.count) : (Array.isArray(list) ? list.length : 0)
        if (!cancelled) {
          setItems(list)
          setCount(count)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-4">Loading meeting requests…</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  if (!items || items.length === 0) {
    return <div className="p-4">No meeting requests found.</div>
  }

  return (
    <div className="p-4">
      <div className="mb-3 text-sm text-gray-600">Showing {count ?? items.length} meeting request(s)</div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-sm rounded">
          <thead>
            <tr className="text-left border-b">
              <th className="px-4 py-2">Reference</th>
              <th className="px-4 py-2">Requestor</th>
              <th className="px-4 py-2">Request type</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Meeting title</th>
              <th className="px-4 py-2">Board date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{it.referenceNumber ?? it.ReferenceNumber ?? '—'}</td>
                <td className="px-4 py-2">{it.requestorName ?? it.requestor ?? '—'}</td>
                <td className="px-4 py-2">{it.requestType ?? it.type ?? '—'}</td>
                <td className="px-4 py-2">{it.country ?? '—'}</td>
                <td className="px-4 py-2">{it.title ?? it.meetingTitle ?? '—'}</td>
                <td className="px-4 py-2">{formatDate(it.meetingDate ?? it.boardDate ?? it.MeetingDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}
