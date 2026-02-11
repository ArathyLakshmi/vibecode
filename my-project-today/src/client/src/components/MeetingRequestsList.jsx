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
      
      {/* Modern List View */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item.id) }}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${item.title ?? item.meetingTitle ?? 'meeting request'}`}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 cursor-pointer p-4 md:p-5 hover:border-l-4 hover:border-indigo-500"
            data-testid="meeting-request-card"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Left section: Title and Reference */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate flex-1">
                    {item.title ?? item.meetingTitle ?? 'Untitled'}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded whitespace-nowrap" data-testid="reference-number">
                    {item.referenceNumber ?? item.ReferenceNumber ?? 'No ref'}
                  </span>
                </div>
                
                {/* Metadata row - responsive */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium text-gray-900">{item.requestorName ?? item.requestor ?? '—'}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>{item.requestType ?? item.type ?? '—'}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{item.country ?? '—'}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}</span>
                  </div>
                </div>
              </div>
              
              {/* Right section: Action indicator (desktop only) */}
              <div className="hidden md:flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
