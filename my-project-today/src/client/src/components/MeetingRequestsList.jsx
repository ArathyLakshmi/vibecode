import React, { useState } from 'react'
import Drawer from './Drawer'
import { useMsal } from '@azure/msal-react'
import { useRoles, hasAnyRole } from '../auth/useRoles'
import {
  FluentProvider,
  teamsLightTheme,
  Field,
  Input,
  Textarea,
  Spinner,
  Pivot,
  PivotItem
} from '@fluentui/react-components'
import { 
  DocumentBulletList24Regular, 
  Clock24Regular, 
  CheckmarkCircle24Regular, 
  CalendarCheckmark24Regular, 
  Megaphone24Regular,
  CalendarClock20Regular,
  Person20Regular,
  ChevronDown20Regular,
  ChevronUp20Regular,
  DismissCircle24Regular,
  ArrowDownload20Regular,
  Attach20Regular
} from '@fluentui/react-icons'

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

export default function MeetingRequestsList({ searchTerm = '', isSearching = false, refreshTrigger = 0, onEdit = null }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [count, setCount] = React.useState(null)
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItemDetails, setSelectedItemDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showLifecycle, setShowLifecycle] = useState(true)
  const [showUpdateHistory, setShowUpdateHistory] = useState(false)
  const [showChangeHistory, setShowChangeHistory] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingRequest, setCancellingRequest] = useState(false)
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState(false)
  const [approveSuccessMessage, setApproveSuccessMessage] = useState(false)
  const [confirmSuccessMessage, setConfirmSuccessMessage] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState(false)
  const [confirmingRequest, setConfirmingRequest] = useState(false)
  const [announcingRequest, setAnnouncingRequest] = useState(false)
  const [announceSuccessMessage, setAnnounceSuccessMessage] = useState(false)
  const [deletingRequest, setDeletingRequest] = useState(false)
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState(false)
  const [statusFilter, setStatusFilter] = useState(null)
  
  /**
   * Filter mode state (Feature: 1-requestor-filter)
   * - "my-requests": Show only requests from logged-in user (default)
   * - "all-requests": Show all requests from all users
   * 
   * When filterMode changes:
   * 1. API calls include/exclude requestorEmail parameter
   * 2. Pagination resets to page 1
   * 3. Items array is cleared and reloaded
   * 4. useEffect dependencies trigger fresh data load
   */
  const [filterMode, setFilterMode] = useState('my-requests')  // NEW: Filter between "my-requests" and "all-requests"
  const [attachments, setAttachments] = useState([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const cancelReasonRef = React.useRef(null)
  const loadMoreRef = React.useRef(null)
  const { accounts } = useMsal()
  const userRoles = useRoles()
  
  // Extract logged-in user's email from MSAL authentication context
  // Used for filtering "My Requests" in filterMode state
  const userEmail = accounts && accounts.length > 0 ? accounts[0].username : ''

  /**
   * Load initial data with filter support (Feature: 1-requestor-filter)
   * 
   * Behavior:
   * - Resets pagination to page 1
   * - Builds query params with page, pageSize
   * - Conditionally adds requestorEmail param when filterMode="my-requests"
   * - Clears items array before loading
   * 
   * Triggers on:
   * - Initial component mount
   * - refreshTrigger changes (external refresh)
   * - filterMode changes (user toggles between My/All Requests)
   * - userEmail changes (user logs in/out)
   */
  // Load initial data
  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setPage(1)
      setHasMore(true)
      try {
        // Build query params
        const params = new URLSearchParams({ page: '1', pageSize: '20' })
        
        // Add requestorEmail filter for "my-requests" mode
        if (filterMode === 'my-requests' && userEmail) {
          params.append('requestorEmail', userEmail)
        }
        
        const res = await fetch(`/api/meetingrequests?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        
        if (!cancelled) {
          // Handle new paginated response format
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items)
            setCount(data.totalCount)
            setHasMore(data.hasMore)
            setPage(2) // Next page to load
          } else {
            // Fallback for old format (backwards compatibility)
            const list = Array.isArray(data) ? data : (data.value || data)
            setItems(list)
            setCount(Array.isArray(list) ? list.length : 0)
            setHasMore(false)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshTrigger, filterMode, userEmail])

  // Load more data for infinite scroll
  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    
    setLoadingMore(true)
    try {
      // Build query params
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      
      // Add requestorEmail filter for "my-requests" mode
      if (filterMode === 'my-requests' && userEmail) {
        params.append('requestorEmail', userEmail)
      }
      
      const res = await fetch(`/api/meetingrequests?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      if (data.items && Array.isArray(data.items)) {
        setItems(prev => [...prev, ...data.items])
        setCount(data.totalCount)
        setHasMore(data.hasMore)
        setPage(prevPage => prevPage + 1)
      }
    } catch (err) {
      console.error('Failed to load more:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [page, hasMore, loading, loadingMore, filterMode, userEmail])

  // Intersection Observer for infinite scroll
  React.useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadMore, loading, hasMore, loadingMore])

  // Fetch detailed data including audit logs when an item is selected
  React.useEffect(() => {
    if (!selectedItem) {
      setSelectedItemDetails(null)
      setShowLifecycle(true)
      setShowUpdateHistory(false)
      setShowChangeHistory(false)
      setShowAttachments(true)
      setCancelSuccessMessage(false)
      setAttachments([])
      return
    }
    
    // Reset collapse states and messages for new item
    setShowLifecycle(true)
    setShowUpdateHistory(false)
    setShowChangeHistory(false)
    setShowAttachments(true)
    setCancelSuccessMessage(false)
    
    let cancelled = false
    async function fetchDetails() {
      setLoadingDetails(true)
      try {
        const res = await fetch(`/api/meetingrequests/${selectedItem}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setSelectedItemDetails(data)
        }
      } catch (err) {
        console.error('Error fetching details:', err)
        if (!cancelled) {
          // Fall back to data from list
          const fallbackItem = items.find(it => it.id === selectedItem)
          setSelectedItemDetails(fallbackItem ? { meetingRequest: fallbackItem, auditLogs: [] } : null)
        }
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    }
    fetchDetails()
    return () => { cancelled = true }
  }, [selectedItem, items])

  // T061: Fetch attachments when loading request details
  React.useEffect(() => {
    if (!selectedItem) {
      setAttachments([])
      return
    }
    
    let cancelled = false
    async function fetchAttachments() {
      setLoadingAttachments(true)
      try {
        const res = await fetch(`/api/meetingrequests/${selectedItem}/attachments`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setAttachments(data || [])
        }
      } catch (err) {
        console.error('Error fetching attachments:', err)
        if (!cancelled) {
          setAttachments([])
        }
      } finally {
        if (!cancelled) setLoadingAttachments(false)
      }
    }
    fetchAttachments()
    return () => { cancelled = true }
  }, [selectedItem])

  // Focus cancel reason textarea when dialog opens
  React.useEffect(() => {
    if (showCancelDialog && cancelReasonRef.current) {
      cancelReasonRef.current.focus()
    }
  }, [showCancelDialog])

  // Check if user can approve
  const canApprove = hasAnyRole(userRoles, ['SECADmin']) || (userEmail && userEmail.toLowerCase() === 'secadmin@arathylgmail.onmicrosoft.com')

  // Check if user can confirm
  const canConfirm = hasAnyRole(userRoles, ['EdOffice', 'SecAdmin', 'ManagementOffice']) || 
    (userEmail && (
      userEmail.toLowerCase() === 'edoffice@arathylgmail.onmicrosoft.com' || 
      userEmail.toLowerCase() === 'managementoffice@arathylgmail.onmicrosoft.com' || 
      userEmail.toLowerCase() === 'secadmin@arathylgmail.onmicrosoft.com'
    ))

  // Check if user can announce
  const canAnnounce = hasAnyRole(userRoles, ['SecAdmin']) || (userEmail && userEmail.toLowerCase() === 'secadmin@arathylgmail.onmicrosoft.com')

  // T060: Download attachment function with blob handling
  const downloadAttachment = async (attachmentId, fileName) => {
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}/attachments/${attachmentId}`)
      if (!res.ok) throw new Error('Failed to download file')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading attachment:', err)
      alert('Failed to download file')
    }
  }

  // Handle cancel request
  const handleCancelRequest = () => {
    setShowCancelDialog(true)
    setCancelReason('')
  }

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!canApprove) {
      alert('You do not have permission to approve requests')
      return
    }

    setApprovingRequest(true)
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to approve request')
      }

      // Refresh the details
      const detailsRes = await fetch(`/api/meetingrequests/${selectedItem}`)
      if (detailsRes.ok) {
        const data = await detailsRes.json()
        setSelectedItemDetails(data)
      }

      // Refresh the list
      const listRes = await fetch('/api/meetingrequests')
      if (listRes.ok) {
        const data = await listRes.json()
        const list = Array.isArray(data) ? data : (data.value || data)
        setItems(list)
      }

      // Show success message
      setApproveSuccessMessage(true)
      setTimeout(() => setApproveSuccessMessage(false), 5000)
    } catch (err) {
      alert(err.message || 'Failed to approve request')
    } finally {
      setApprovingRequest(false)
    }
  }

  // Handle confirm request
  const handleConfirmRequest = async () => {
    if (!canConfirm) {
      alert('You do not have permission to confirm requests')
      return
    }

    setConfirmingRequest(true)
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to confirm request')
      }

      // Refresh the details
      const detailsRes = await fetch(`/api/meetingrequests/${selectedItem}`)
      if (detailsRes.ok) {
        const data = await detailsRes.json()
        setSelectedItemDetails(data)
      }

      // Refresh the list
      const listRes = await fetch('/api/meetingrequests')
      if (listRes.ok) {
        const data = await listRes.json()
        const list = Array.isArray(data) ? data : (data.value || data)
        setItems(list)
      }

      // Show success message
      setConfirmSuccessMessage(true)
      setTimeout(() => setConfirmSuccessMessage(false), 5000)
    } catch (err) {
      alert(err.message || 'Failed to confirm request')
    } finally {
      setConfirmingRequest(false)
    }
  }

  // Handle announce request
  const handleAnnounceRequest = async () => {
    if (!canAnnounce) {
      alert('You do not have permission to announce requests')
      return
    }

    setAnnouncingRequest(true)
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to announce request')
      }

      // Refresh the details
      const detailsRes = await fetch(`/api/meetingrequests/${selectedItem}`)
      if (detailsRes.ok) {
        const data = await detailsRes.json()
        setSelectedItemDetails(data)
      }

      // Refresh the list
      const listRes = await fetch('/api/meetingrequests')
      if (listRes.ok) {
        const data = await listRes.json()
        const list = Array.isArray(data) ? data : (data.value || data)
        setItems(list)
      }

      // Show success message
      setAnnounceSuccessMessage(true)
      setTimeout(() => setAnnounceSuccessMessage(false), 5000)
    } catch (err) {
      alert(err.message || 'Failed to announce request')
    } finally {
      setAnnouncingRequest(false)
    }
  }

  const handleDeleteRequest = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setDeletingRequest(true)
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to delete request')
      }

      // Close dialogs and drawer
      setShowDeleteDialog(false)
      setSelectedItem(null)
      setSelectedItemDetails(null)

      // Refresh the list
      const listRes = await fetch('/api/meetingrequests')
      if (listRes.ok) {
        const data = await listRes.json()
        const list = Array.isArray(data) ? data : (data.value || data)
        setItems(list)
      }

      // Show success message
      setDeleteSuccessMessage(true)
      setTimeout(() => setDeleteSuccessMessage(false), 5000)
    } catch (err) {
      alert(err.message || 'Failed to delete request')
    } finally {
      setDeletingRequest(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancelling the request')
      cancelReasonRef.current?.focus();
      return
    }

    setCancellingRequest(true)
    try {
      const res = await fetch(`/api/meetingrequests/${selectedItem}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      })
      
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to cancel request')
      }

      // Refresh the details
      const detailsRes = await fetch(`/api/meetingrequests/${selectedItem}`)
      if (detailsRes.ok) {
        const data = await detailsRes.json()
        setSelectedItemDetails(data)
      }

      // Refresh the list
      const listRes = await fetch('/api/meetingrequests')
      if (listRes.ok) {
        const listData = await listRes.json()
        const list = Array.isArray(listData) ? listData : (listData.value || listData)
        setItems(list)
      }

      setShowCancelDialog(false)
      setCancelReason('')
      setCancelSuccessMessage(true)
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setCancelSuccessMessage(false)
      }, 5000)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setCancellingRequest(false)
    }
  }

  if (loading) return <div className="p-4">Loading meeting requests…</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  if (!items || items.length === 0) {
    return <div className="p-4">No meeting requests found.</div>
  }

  // Filter items based on search term
  const searchFilteredItems = items.filter(item => matchesSearch(item, searchTerm))
  
  // Apply status filter on top of search filter
  const filteredItems = statusFilter 
    ? searchFilteredItems.filter(item => {
        const itemStatus = (item.status ?? item.Status ?? 'Draft').toLowerCase()
        return itemStatus === statusFilter
      })
    : searchFilteredItems

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
      
      {/* Filter Mode Toggle */}
      <div className="mb-4 bg-white rounded-lg shadow p-4" data-testid="filter-toggle">
        <Pivot
          aria-label="Filter by requestor"
          selectedKey={filterMode}
          onTabSelect={(event, data) => {
            setFilterMode(data.value)
            setPage(1)
            setItems([])
          }}
        >
          <PivotItem 
            headerText="My Requests" 
            itemKey="my-requests"
            value="my-requests"
            data-testid="filter-my-requests"
          />
          <PivotItem 
            headerText="All Requests" 
            itemKey="all-requests"
            value="all-requests"
            data-testid="filter-all-requests"
          />
        </Pivot>
      </div>
      
      {/* Status Summary */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Status Summary</h3>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {(() => {
            const statusCounts = {
              draft: 0,
              pending: 0,
              approved: 0,
              confirmed: 0,
              cancelled: 0,
              announced: 0
            }
            
            searchFilteredItems.forEach(item => {
              const status = (item.status ?? item.Status ?? 'Draft').toLowerCase()
              if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++
              }
            })
            
            const statusConfig = [
              { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-300' },
              { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
              { key: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 border-green-300' },
              { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-300' },
              { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
              { key: 'announced', label: 'Announced', color: 'bg-purple-100 text-purple-800 border-purple-300' }
            ]
            
            return statusConfig.map(({ key, label, color }) => {
              const isActive = statusFilter === key
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(isActive ? null : key)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
                    isActive ? color + ' ring-2 ring-offset-2 ring-indigo-600 shadow-lg' : color + ' hover:shadow-md'
                  }`}
                  aria-label={`Filter by ${label} status`}
                  aria-pressed={isActive}
                >
                  <div className="text-2xl font-bold">{statusCounts[key]}</div>
                  <div className="text-xs font-medium mt-1">{label}</div>
                </button>
              )
            })
          })()}
        </div>
      </div>
      
      <div className="mb-3 text-sm text-gray-600">
        Showing {filteredItems.length} of {count ?? items.length} meeting request(s)
      </div>
      
      {/* Table View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#6264A7]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Reference
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Requestor
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Meeting Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  data-testid="meeting-request-card"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" data-testid="reference-number">
                      {item.referenceNumber ?? item.ReferenceNumber ?? 'No ref'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {item.title ?? item.meetingTitle ?? 'Untitled'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.requestorName ?? item.requestor ?? '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.requestType ?? item.type ?? '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.meetingDate ?? item.boardDate ?? item.MeetingDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const status = (item.status ?? item.Status ?? 'Draft').toLowerCase()
                      const statusColors = {
                        'draft': 'bg-gray-100 text-gray-800',
                        'pending': 'bg-yellow-100 text-yellow-800',
                        'approved': 'bg-green-100 text-green-800',
                        'confirmed': 'bg-blue-100 text-blue-800',
                        'cancelled': 'bg-red-100 text-red-800',
                        'announced': 'bg-purple-100 text-purple-800'
                      }
                      const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                          {item.status ?? item.Status ?? 'Draft'}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />
          
          {/* Loading indicator */}
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Spinner size="medium" label="Loading more requests..." />
            </div>
          )}
          
          {/* End of results message */}
          {!hasMore && items.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
              No more requests to load
            </div>
          )}
        </div>
      </div>
      
      {/* Drawer for detail view */}
      <Drawer 
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title="Meeting Request Details"
        onEdit={onEdit ? () => {
          const item = items.find(it => it.id === selectedItem)
          if (item) {
            setSelectedItem(null) // Close details drawer
            onEdit(item) // Open edit drawer
          }
        } : null}
        onCancel={selectedItemDetails?.meetingRequest && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'cancelled' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'draft' ? handleCancelRequest : null}
        onApprove={canApprove && selectedItemDetails?.meetingRequest && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'approved' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'confirmed' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'cancelled' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'announced' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'draft' ? handleApproveRequest : null}
        onConfirm={canConfirm && selectedItemDetails?.meetingRequest && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'confirmed' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'cancelled' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'announced' && selectedItemDetails.meetingRequest.status?.toLowerCase() !== 'draft' ? handleConfirmRequest : null}
        onAnnounce={canAnnounce && selectedItemDetails?.meetingRequest && selectedItemDetails.meetingRequest.status?.toLowerCase() === 'confirmed' ? handleAnnounceRequest : null}
        onDelete={selectedItemDetails?.meetingRequest && selectedItemDetails.meetingRequest.status?.toLowerCase() === 'draft' ? handleDeleteRequest : null}
      >
        {selectedItem && (() => {
          if (loadingDetails) return <div className="p-4">Loading details...</div>
          if (!selectedItemDetails) return <div className="p-4">Item not found</div>
          
          const item = selectedItemDetails.meetingRequest
          const auditLogs = selectedItemDetails.auditLogs || []
          if (!item) return <div className="p-4">Item not found</div>
          
          return (
            <FluentProvider theme={teamsLightTheme}>
              {/* Success Message Banners */}
              {cancelSuccessMessage && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Request Cancelled Successfully</p>
                      <p className="text-xs text-green-700 mt-1">The meeting request has been cancelled and all parties will be notified.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {approveSuccessMessage && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Request Approved Successfully</p>
                      <p className="text-xs text-green-700 mt-1">The meeting request has been approved and moved to the next stage.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {confirmSuccessMessage && (
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Request Confirmed Successfully</p>
                      <p className="text-xs text-blue-700 mt-1">The meeting request has been confirmed and is ready for announcement.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {announceSuccessMessage && (
                <div className="mb-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Request Announced Successfully</p>
                      <p className="text-xs text-purple-700 mt-1">The meeting request has been announced and is now visible to all stakeholders.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {deleteSuccessMessage && (
                <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-amber-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Draft Request Deleted Successfully</p>
                      <p className="text-xs text-amber-700 mt-1">The draft meeting request has been permanently removed.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Request Lifecycle */}
              <div className="mb-6 pb-6 border-b">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                  onClick={() => setShowLifecycle(!showLifecycle)}
                >
                  <h3 className="text-sm font-semibold text-gray-700">Request Lifecycle</h3>
                  {showLifecycle ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                </div>
                
                {showLifecycle && (
                  <div>
                    {/* Show cancelled status if applicable */}
                    {(item.status ?? item.Status ?? '').toLowerCase() === 'cancelled' ? (
                      <div className="flex items-center justify-center p-6 bg-red-50 rounded-lg border-2 border-red-200">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                            <DismissCircle24Regular className="text-red-600 w-10 h-10" />
                          </div>
                          <div className="text-lg font-semibold text-red-900">Request Cancelled</div>
                          <div className="text-sm text-red-700 mt-1">This meeting request has been cancelled</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
                          <div 
                            className="h-full bg-[#6264A7] transition-all duration-300"
                            style={{ 
                              width: (() => {
                                const status = (item.status ?? item.Status ?? 'Pending').toLowerCase()
                                if (status.includes('draft')) return '0%'
                                if (status.includes('pending')) return '25%'
                                if (status.includes('approved')) return '50%'
                                if (status.includes('confirmed')) return '75%'
                                if (status.includes('announced')) return '100%'
                                return '25%' // default to pending
                              })()
                            }}
                          />
                        </div>
                        
                        {/* Stages */}
                        {[
                          { key: 'drafted', label: 'Drafted', icon: DocumentBulletList24Regular },
                          { key: 'pending', label: 'Pending', icon: Clock24Regular },
                          { key: 'approved', label: 'Approved', icon: CheckmarkCircle24Regular },
                          { key: 'confirmed', label: 'Confirmed', icon: CalendarCheckmark24Regular },
                          { key: 'announced', label: 'Announced', icon: Megaphone24Regular }
                        ].map((stage, index) => {
                          const currentStatus = (item.status ?? item.Status ?? 'Pending').toLowerCase()
                          const isActive = currentStatus.includes(stage.key)
                          const isPassed = (() => {
                            const stages = ['drafted', 'pending', 'approved', 'confirmed', 'announced']
                            const currentIndex = stages.findIndex(s => currentStatus.includes(s))
                            return currentIndex > index || (currentIndex === -1 && stage.key === 'pending')
                          })()
                          const Icon = stage.icon
                          
                          return (
                            <div key={stage.key} className="flex flex-col items-center relative" style={{ zIndex: 1 }}>
                              <div 
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                                  isActive 
                                    ? 'bg-[#6264A7] text-white shadow-lg scale-110' 
                                    : isPassed 
                                      ? 'bg-[#6264A7] text-white' 
                                      : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}
                              >
                                <Icon />
                              </div>
                              <span className={`text-xs font-medium text-center ${isActive ? 'text-[#6264A7]' : 'text-gray-600'}`}>
                                {stage.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-5">
                {/* Reference Number */}
                <Field label="Reference Number">
                  <Input 
                    value={item.referenceNumber ?? item.ReferenceNumber ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Status */}
                <Field label="Status">
                  <Input 
                    value={item.status ?? item.Status ?? 'Pending'} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Title */}
                <Field label="Meeting Title">
                  <Input 
                    value={item.title ?? item.meetingTitle ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Date */}
                <Field label="Meeting Date">
                  <Input 
                    type="date"
                    value={item.meetingDate ?? item.MeetingDate ? new Date(item.meetingDate ?? item.MeetingDate).toISOString().slice(0, 10) : ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Alternate Date */}
                <Field label="Alternate Date">
                  <Input 
                    type="date"
                    value={item.alternateDate ?? item.AlternateDate ? new Date(item.alternateDate ?? item.AlternateDate).toISOString().slice(0, 10) : ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Category */}
                <Field label="Meeting Category">
                  <Input 
                    value={item.category ?? item.meetingCategory ?? item.MeetingCategory ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Subcategory */}
                <Field label="Meeting Subcategory">
                  <Input 
                    value={item.subcategory ?? item.meetingSubcategory ?? item.MeetingSubcategory ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Description */}
                <Field label="Meeting Description">
                  <Textarea 
                    value={item.description ?? item.meetingDescription ?? item.MeetingDescription ?? ''} 
                    readOnly 
                    rows={4}
                  />
                </Field>
                
                {/* Comments */}
                <Field label="Comments">
                  <Textarea 
                    value={item.comments ?? item.Comments ?? ''} 
                    readOnly 
                    rows={2}
                  />
                </Field>
                
                {/* Classification */}
                <Field label="Classification of Meeting">
                  <Input 
                    value={item.classification ?? item.Classification ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Request Type */}
                <Field label="Request Type">
                  <Input 
                    value={item.requestType ?? item.type ?? item.RequestType ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Requestor */}
                <Field label="Requestor">
                  <Input 
                    value={item.requestorName ?? item.requestor ?? item.RequestorName ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* T057-T065: Attachments Section */}
                <div className="mt-8 pt-6 border-t">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                    onClick={() => setShowAttachments(!showAttachments)}
                  >
                    <div className="flex items-center gap-2">
                      <Attach20Regular className="text-gray-700" />
                      <h3 className="text-sm font-semibold text-gray-700">Attachments</h3>
                      {attachments.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {attachments.length}
                        </span>
                      )}
                    </div>
                    {showAttachments ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                  </div>
                  
                  {showAttachments && (
                    <div className="space-y-2">
                      {loadingAttachments ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Loading attachments...</div>
                      ) : attachments.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm bg-gray-50 rounded border border-gray-200">
                          No attachments
                        </div>
                      ) : (
                        attachments.map(attachment => (
                          <div 
                            key={attachment.id} 
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Attach20Regular className="text-gray-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {attachment.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.contentType}
                                    {attachment.uploadedAt && (
                                      <> • {new Date(attachment.uploadedAt).toLocaleString()}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
                              className="ml-3 p-2 text-[#6264A7] hover:bg-[#6264A7] hover:text-white rounded transition-colors flex-shrink-0"
                              title="Download file"
                            >
                              <ArrowDownload20Regular />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {/* Audit History */}
                <div className="mt-8 pt-6 border-t">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                    onClick={() => setShowUpdateHistory(!showUpdateHistory)}
                  >
                    <h3 className="text-sm font-semibold text-gray-700">Update History</h3>
                    {showUpdateHistory ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                  </div>
                  
                  {showUpdateHistory && (
                    <div className="space-y-3">
                      {/* Created */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CalendarClock20Regular className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">Created</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {item.createdAt ?? item.CreatedAt ? new Date(item.createdAt ?? item.CreatedAt).toLocaleString() : 'Unknown date'}
                          </div>
                          {(item.createdBy ?? item.CreatedBy ?? item.requestorName ?? item.RequestorName) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Person20Regular />
                              <span>{item.createdBy ?? item.CreatedBy ?? item.requestorName ?? item.RequestorName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Updated (only show if different from created) */}
                      {(item.updatedAt ?? item.UpdatedAt) && (item.updatedAt ?? item.UpdatedAt) !== (item.createdAt ?? item.CreatedAt) && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <CalendarClock20Regular className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">Last Updated</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(item.updatedAt ?? item.UpdatedAt).toLocaleString()}
                            </div>
                            {(item.updatedBy ?? item.UpdatedBy) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                <Person20Regular />
                                <span>{item.updatedBy ?? item.UpdatedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Status Changes Timeline */}
                      {auditLogs && auditLogs.filter(log => log.fieldName === 'Status').length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Status Changes</div>
                          <div className="space-y-2">
                            {auditLogs
                              .filter(log => log.fieldName === 'Status')
                              .map((log, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Clock24Regular className="text-purple-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                      Status: <span className="text-red-600">{log.oldValue || 'None'}</span> → <span className="text-green-600">{log.newValue}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {new Date(log.changedAt).toLocaleString()}
                                    </div>
                                    {log.changedBy && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                        <Person20Regular />
                                        <span>{log.changedBy}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Field-level change history */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-3 hover:bg-gray-50 p-2 rounded -m-2"
                      onClick={() => setShowChangeHistory(!showChangeHistory)}
                    >
                      <h4 className="text-xs font-semibold text-gray-700">Change History {auditLogs && auditLogs.length > 0 && `(${auditLogs.length})`}</h4>
                      {showChangeHistory ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                    </div>
                    
                    {showChangeHistory && (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {auditLogs && auditLogs.length > 0 ? (
                          auditLogs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900">{log.fieldName}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="text-red-600">Old: {log.oldValue || '(empty)'}</span>
                                  {' → '}
                                  <span className="text-green-600">New: {log.newValue || '(empty)'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>{new Date(log.changedAt).toLocaleString()}</span>
                                  {log.changedBy && (
                                    <>
                                      <span>•</span>
                                      <span>{log.changedBy}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic p-2">
                            No changes recorded yet. Changes will appear here after editing this request.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </FluentProvider>
          )
        })()}
      </Drawer>

      {/* Cancel Request Dialog */}
      {showCancelDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !cancellingRequest && setShowCancelDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Request</h3>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                ref={cancelReasonRef}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Please provide a reason for cancelling this request..."
                disabled={cancellingRequest}
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancellingRequest}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={cancellingRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRequest ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showDeleteDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !deletingRequest && setShowDeleteDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Draft Request</h3>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this draft request? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deletingRequest}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingRequest ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}
