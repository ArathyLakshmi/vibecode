import React, { useState } from 'react'
import Drawer from './Drawer'

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

export default function MeetingRequestsList({ searchTerm = '', isSearching = false }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [count, setCount] = React.useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

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
      {/* Loading indicator for search */}
      {isSearching && (
        <div className="mb-3 flex items-center text-sm text-indigo-600">
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Searching...
        </div>
      )}
      
      <div className="mb-3 text-sm text-gray-600">
        Showing {filteredItems.length} of {count ?? items.length} meeting request(s)
      </div>
      
      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item.id) }}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${item.title ?? item.meetingTitle ?? 'meeting request'}`}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer p-6"
            data-testid="meeting-request-card"
          >
            {/* Title - prominent at top */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {item.title ?? item.meetingTitle ?? 'Untitled'}
            </h3>
            
            {/* Reference number - secondary */}
            <div className="mb-4">
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded" data-testid="reference-number">
                {item.referenceNumber ?? item.ReferenceNumber ?? 'No reference'}
              </span>
            </div>
            
            {/* 2x2 grid for metadata */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <div className="text-gray-600">Requestor</div>
                <div className="text-gray-900 font-medium">
                  {item.requestorName ?? item.requestor ?? '—'}
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Type</div>
                <div className="text-gray-900 font-medium">
                  {item.requestType ?? item.type ?? '—'}
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Country</div>
                <div className="text-gray-900 font-medium">
                  {item.country ?? '—'}
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Board Date</div>
                <div className="text-gray-900 font-medium">
                  {formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Drawer for detail view */}
      <Drawer 
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (() => {
          const item = filteredItems.find(it => it.id === selectedItem)
          if (!item) return <div>Item not found</div>
          
          return (
            <div>
              <h2 id="drawer-title" className="text-2xl font-bold text-gray-900 mb-6">
                {item.title ?? item.meetingTitle ?? 'Meeting Request Details'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Reference Number</div>
                  <div className="mt-1 text-lg text-gray-900">{item.referenceNumber ?? item.ReferenceNumber ?? '—'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Requestor</div>
                  <div className="mt-1 text-lg text-gray-900">{item.requestorName ?? item.requestor ?? '—'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Request Type</div>
                  <div className="mt-1 text-lg text-gray-900">{item.requestType ?? item.type ?? '—'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Country</div>
                  <div className="mt-1 text-lg text-gray-900">{item.country ?? '—'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Board Date</div>
                  <div className="mt-1 text-lg text-gray-900">{formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}</div>
                </div>
              </div>
            </div>
          )
        })()}
      </Drawer>
    </div>
  )
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}
