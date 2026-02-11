import React from 'react'

/**
 * Checks if a meeting request matches the search term
 * Performs case-insensitive partial matching across all searchable fields
 * 
 * @param {Object} item - Meeting request object
 * @param {string} searchTerm - Search term to match
 * @returns {boolean} - True if item matches search term, false otherwise
 */
function matchesSearch(item, searchTerm) {
  // If no search term, show all items
  if (!searchTerm || searchTerm.trim() === '') {
    return true
  }

  // Convert search term to lowercase for case-insensitive matching
  const query = searchTerm.toLowerCase().trim()

  // Define searchable fields (handle both camelCase and PascalCase from API)
  const searchableFields = [
    item.referenceNumber ?? item.ReferenceNumber,
    item.requestorName ?? item.requestor,
    item.requestType ?? item.type,
    item.country,
    item.title ?? item.meetingTitle,
    formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)
  ]

  // Check if any field contains the search term (partial match)
  return searchableFields.some(field => 
    String(field || '').toLowerCase().includes(query)
  )
}

export default function MeetingRequestsList({ searchTerm = '' }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [count, setCount] = React.useState(null)

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

  // Filter items based on search term
  const filteredItems = items.filter(item => matchesSearch(item, searchTerm))

  // Show "No results found" if search returns no matches
  if (filteredItems.length === 0) {
    return (
      <div className="p-4" data-testid="meeting-requests-list">
        <div className="text-center py-8 text-gray-500" data-testid="no-results-message">
          No results found for "{searchTerm}"
        </div>
      </div>
    )
  }

  return (
    <div className="p-4" data-testid="meeting-requests-list">
      <div className="mb-3 text-sm text-gray-600">
        Showing {filteredItems.length} of {count ?? items.length} meeting request(s)
      </div>
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
            {filteredItems.map((it) => (
              <tr key={it.id} className="border-b hover:bg-gray-50" data-testid="meeting-request-item">
                <td className="px-4 py-2" data-testid="reference-number">{it.referenceNumber ?? it.ReferenceNumber ?? '—'}</td>
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
