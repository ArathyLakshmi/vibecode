import React, { useState } from 'react'
import Drawer from './Drawer'
import AttendeeListView from './AttendeeListView'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { useRoles, hasAnyRole } from '../auth/useRoles'
import jsPDF from 'jspdf'
import {
  FluentProvider,
  Field,
  Input,
  Textarea,
  Spinner,
  TabList,
  Tab,
  Button
} from '@fluentui/react-components'
import { accessibleTheme } from '../theme/accessibleTheme'
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
  Attach20Regular,
  Eye20Regular,
  Edit20Regular
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

// Normalize status strings to a small set of keys for consistent counting/filtering
function normalizeStatus(rawStatus) {
  const status = String(rawStatus || 'draft').trim().toLowerCase()
  if (status === 'pending approval' || status === 'pending-approval') return 'pending'
  if (status === 'canceled' || status === 'cancelled') return 'cancelled'
  if (status === 'published') return 'announced'
  return status
}

// Shared page size for meeting requests pagination
const PAGE_SIZE = 20

export default function MeetingRequestsList({ searchTerm = '', isSearching = false, refreshTrigger = 0, onEdit = null, filterMode = 'all-requests', onFilterModeChange = null, viewMode = 'list', onViewModeChange = null }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [count, setCount] = React.useState(null)
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(true)
  const [summaryItems, setSummaryItems] = React.useState([])
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
  const [isFiltering, setIsFiltering] = useState(false)
  const [internalRefresh, setInternalRefresh] = useState(0) // Counter to trigger refresh without changing filters
  const [agendaData, setAgendaData] = useState({ items: [], notes: '' })
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  
  // Registration feature state
  const [userRegistration, setUserRegistration] = useState(null)
  const [registeringMeeting, setRegisteringMeeting] = useState(false)
  const [capacityInfo, setCapacityInfo] = useState(null)
  const [loadingCapacity, setLoadingCapacity] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState(null)
  const [showCancelRegistrationDialog, setShowCancelRegistrationDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellingRegistration, setCancellingRegistration] = useState(false)
  const [cancellationError, setCancellationError] = useState(null)
  const [attendeeList, setAttendeeList] = useState(null)
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [attendeesError, setAttendeesError] = useState(null)
  const [showAttendees, setShowAttendees] = useState(true)
  const [drawerTab, setDrawerTab] = useState('details')
  const drawerTabOverride = React.useRef(null)
  
  /**
   * Filter mode is now controlled by parent component (App.jsx)
   * - Accepts filterMode prop ('my-requests' or 'all-requests')
   * - Calls onFilterModeChange when user toggles filter
   * 
   * When filterMode changes:
   * 1. API calls include/exclude requestorEmail parameter
   * 2. Pagination resets to page 1
   * 3. Items array is cleared and reloaded
   * 4. useEffect dependencies trigger fresh data load
   * 
   * Uses Fluent UI v9 TabList component (not Pivot - that's v8)
   */
  const [attachments, setAttachments] = useState([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)
  const cancelReasonRef = React.useRef(null)
  const loadMoreRef = React.useRef(null)
  const navigate = useNavigate()
  const { accounts } = useMsal()
  const userRoles = useRoles()
  
  // Extract logged-in user's name from MSAL authentication context
  // Used for filtering "My Requests" in filterMode state
  // Memoized to prevent unnecessary re-renders when accounts array reference changes
  const userName = React.useMemo(() => {
    return accounts && accounts.length > 0 ? (accounts[0].name || accounts[0].username) : ''
  }, [accounts])

  // Build query params consistently (page, size, and optional requestor filter)
  const buildQueryParams = React.useCallback((pageValue, pageSizeValue) => {
    const params = new URLSearchParams({ page: String(pageValue), pageSize: String(pageSizeValue) })
    if (filterMode === 'my-requests' && userName) {
      params.append('requestor', userName)
    }
    return params
  }, [filterMode, userName])
  
  // Debug: Log user info on component mount and when it changes
  React.useEffect(() => {
    const userEmail = accounts && accounts.length > 0 ? (accounts[0].username || accounts[0].email || '').toLowerCase() : ''
    const isSecAdmin = userEmail === 'secadmin@arathylgmail.onmicrosoft.com'
    const isEdOffice = userEmail === 'edoffice@arathylgmail.onmicrosoft.com'
    const isDevAdmin = userEmail === 'arathy.l@gmail.com'
    console.log('User authentication state:', {
      hasAccounts: accounts && accounts.length > 0,
      userName: userName,
      userEmail: userEmail,
      accountsCount: accounts ? accounts.length : 0,
      userRoles: userRoles,
      isSecAdmin: isSecAdmin,
      isEdOffice: isEdOffice,
      isDevAdmin: isDevAdmin,
      canApprove: hasAnyRole(userRoles, ['SecAdmin']) || isSecAdmin || isDevAdmin,
      canConfirm: hasAnyRole(userRoles, ['EdOffice', 'SecAdmin', 'ManagementOffice']) || isSecAdmin || isEdOffice || isDevAdmin,
      canAnnounce: hasAnyRole(userRoles, ['SecAdmin']) || isSecAdmin || isDevAdmin,
      fullAccount: accounts && accounts.length > 0 ? accounts[0] : null
    })
  }, [accounts, userName, userRoles])

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
  // Fetch remaining pages so status summary can include the entire dataset (not just first page)
  const fetchRemainingForSummary = React.useCallback(async (startingPage, initialItems, cancelRef) => {
    let nextPage = startingPage
    let aggregated = [...initialItems]
    let more = true

    while (more && !cancelRef.cancelled) {
      const params = buildQueryParams(nextPage, PAGE_SIZE)
      const res = await fetch(`/api/meetingrequests?${params}`)
      if (!res.ok) break

      const data = await res.json()
      const pageItems = data.items && Array.isArray(data.items)
        ? data.items
        : (Array.isArray(data) ? data : (Array.isArray(data.value) ? data.value : []))

      aggregated = [...aggregated, ...pageItems]
      more = Boolean(data.hasMore) && pageItems.length > 0
      nextPage += 1
    }

    if (!cancelRef.cancelled) {
      setSummaryItems(aggregated)
      setItems(aggregated)
      setHasMore(false)
      setCount(prev => (typeof prev === 'number' ? prev : aggregated.length))
    }
  }, [buildQueryParams])

  React.useEffect(() => {
    let cancelled = false
    const cancelRef = { cancelled: false }

    async function load() {
      const isInitialLoad = items.length === 0
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setIsFiltering(true)
      }
      setPage(1)
      setHasMore(true)
      setError(null)
      setSummaryItems([])

      try {
        const params = buildQueryParams(1, PAGE_SIZE)
        const url = `/api/meetingrequests?${params}`
        console.log('Fetching:', url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        console.log('Received data:', data)

        if (!cancelled) {
          if (data.items && Array.isArray(data.items)) {
            setItems(data.items)
            setCount(data.totalCount)
            setHasMore(data.hasMore)
            setPage(2)
            setSummaryItems(data.items)

            if (data.hasMore) {
              fetchRemainingForSummary(2, data.items, cancelRef)
            }
          } else {
            const list = Array.isArray(data) ? data : (Array.isArray(data.value) ? data.value : [])
            setItems(list)
            setCount(Array.isArray(list) ? list.length : 0)
            setHasMore(false)
            setSummaryItems(list)
          }
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading meeting requests:', err)
          setError(err.message || String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsFiltering(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
      cancelRef.cancelled = true
    }
  }, [refreshTrigger, filterMode, userName, internalRefresh, buildQueryParams, fetchRemainingForSummary])

  // Load more data for infinite scroll
  const loadMore = React.useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    
    setLoadingMore(true)
    try {
      const params = buildQueryParams(page, PAGE_SIZE)
      const url = `/api/meetingrequests?${params}`
      console.log('Loading more from:', url)
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      if (data.items && Array.isArray(data.items)) {
        setItems(prev => [...prev, ...data.items])
        setCount(data.totalCount)
        setHasMore(data.hasMore)
        setPage(prevPage => prevPage + 1)
        // Keep summary items aligned if we've already loaded everything
        setSummaryItems(prev => prev.length > 0 ? [...prev, ...data.items] : prev)
      }
    } catch (err) {
      console.error('Failed to load more:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [page, hasMore, loading, loadingMore, filterMode, userName])

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
      setAgendaData({ items: [], notes: '' })
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


  React.useEffect(() => {
    if (!selectedItem || !selectedItemDetails?.meetingRequest) {
      setUserRegistration(null)
      setCapacityInfo(null)
      setRegistrationMessage(null)
      setAttendeeList(null)
      setAttendeesError(null)
      return
    }

    const meeting = selectedItemDetails.meetingRequest
    const status = meeting.status || meeting.Status
    
    // Only fetch registration data for Confirmed or Announced meetings
    if (status === 'Confirmed' || status === 'Announced') {
      fetchUserRegistration(selectedItem)
      fetchCapacityInfo(selectedItem)
    } else {
      setUserRegistration(null)
      setCapacityInfo(null)
      setRegistrationMessage(null)
    }
  }, [selectedItem, selectedItemDetails])


  // Reset attendee section visibility and tab on selection change
  React.useEffect(() => {
    setShowAttendees(true)
    // Use override tab if set, otherwise default to 'details'
    if (drawerTabOverride.current) {
      setDrawerTab(drawerTabOverride.current)
      drawerTabOverride.current = null // Clear override after use
    } else {
      setDrawerTab('details')
    }
  }, [selectedItem])

  // Focus cancel reason textarea when dialog opens
  React.useEffect(() => {
    if (showCancelDialog && cancelReasonRef.current) {
      cancelReasonRef.current.focus()
    }
  }, [showCancelDialog])

  // Load agenda data when agenda tab is selected
  React.useEffect(() => {
    if (!selectedItem || drawerTab !== 'agenda') return
    if (agendaData.items.length > 0 || agendaData.notes) return // Already loaded
    
    let cancelled = false
    async function loadAgenda() {
      setLoadingAgenda(true)
      try {
        const res = await fetch(`/api/meetingrequests/${selectedItem}/agenda`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setAgendaData(data)
        }
      } catch (err) {
        console.error('Error loading agenda:', err)
        if (!cancelled) {
          setAgendaData({ items: [], notes: '' })
        }
      } finally {
        if (!cancelled) setLoadingAgenda(false)
      }
    }
    loadAgenda()
    return () => { cancelled = true }
  }, [selectedItem, drawerTab, agendaData.items.length, agendaData.notes])

  // Get user email for permission checks (memoized to prevent unnecessary recalculations)
  const userEmail = React.useMemo(() => {
    return accounts && accounts.length > 0 ? (accounts[0].username || accounts[0].email || '').toLowerCase() : ''
  }, [accounts])
  
  const isSecAdmin = React.useMemo(() => {
    return userEmail === 'secadmin@arathylgmail.onmicrosoft.com'
  }, [userEmail])
  
  const isEdOffice = React.useMemo(() => {
    return userEmail === 'edoffice@arathylgmail.onmicrosoft.com'
  }, [userEmail])
  
  const isDevAdmin = React.useMemo(() => {
    return userEmail === 'arathy.l@gmail.com'
  }, [userEmail])
  // Check if user can view attendee list (requestor or admin roles) and meeting is confirmed/announced

  const canViewAttendeeList = React.useMemo(() => {
    if (!selectedItemDetails?.meetingRequest) {
      console.log('[Attendees Tab] No meeting details available')
      return false
    }
    const meeting = selectedItemDetails.meetingRequest
    const status = (meeting.status || meeting.Status || '').toLowerCase()
    console.log('[Attendees Tab] Meeting status:', status)
    if (status !== 'confirmed' && status !== 'announced') {
      console.log('[Attendees Tab] Status not Confirmed/Announced - tab hidden')
      return false
    }
    const requestor = (meeting.requestorEmail || meeting.RequestorEmail || meeting.requestor || meeting.Requestor || meeting.createdBy || meeting.CreatedBy || '').toLowerCase()
    const isAdminRole = hasAnyRole(userRoles, ['SecAdmin', 'EdOffice', 'ManagementOffice']) || isSecAdmin || isEdOffice || isDevAdmin
    const isRequestor = !!userEmail && userEmail === requestor
    console.log('[Attendees Tab] Access check:', {
      userEmail,
      requestor,
      isAdminRole,
      isRequestor,
      canView: isAdminRole || isRequestor
    })
    return isAdminRole || isRequestor
  }, [selectedItemDetails, userRoles, userEmail, isSecAdmin, isEdOffice, isDevAdmin])
  const fetchAttendees = React.useCallback(async (meetingId) => {
    setLoadingAttendees(true)
    setAttendeesError(null)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/attendees`)
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Failed to load attendees (HTTP ${res.status})`)
      }
      const data = await res.json()
      setAttendeeList(data)
    } catch (err) {
      console.error('Error fetching attendees:', err)
      setAttendeeList(null)
      setAttendeesError(err.message || 'Unable to load attendee list')
    } finally {
      setLoadingAttendees(false)
    }
  }, [])

  // Fetch attendee list when permitted and meeting is eligible
  React.useEffect(() => {
    if (!selectedItem || !selectedItemDetails?.meetingRequest) {
      setAttendeeList(null)
      setAttendeesError(null)
      setLoadingAttendees(false)
      return
    }

    if (!canViewAttendeeList) {
      setAttendeeList(null)
      setAttendeesError(null)
      return
    }

    fetchAttendees(selectedItem)
  }, [selectedItem, selectedItemDetails, canViewAttendeeList, fetchAttendees])
  
  // Check if user can approve (SecAdmin role or specific email)
  const canApprove = React.useMemo(() => {
    return hasAnyRole(userRoles, ['SecAdmin']) || isSecAdmin || isDevAdmin
  }, [userRoles, isSecAdmin, isDevAdmin])

  // Check if user can confirm (EdOffice, SecAdmin, ManagementOffice roles or specific emails)
  const canConfirm = React.useMemo(() => {
    return hasAnyRole(userRoles, ['EdOffice', 'SecAdmin', 'ManagementOffice']) || isSecAdmin || isEdOffice || isDevAdmin
  }, [userRoles, isSecAdmin, isEdOffice, isDevAdmin])

  // Check if user can announce (SecAdmin role or specific email)
  const canAnnounce = React.useMemo(() => {
    return hasAnyRole(userRoles, ['SecAdmin']) || isSecAdmin || isDevAdmin
  }, [userRoles, isSecAdmin, isDevAdmin])


  // Handle PDF download for agenda
  const handleDownloadAgendaPDF = () => {
    if (!selectedItemDetails?.meetingRequest) return
    
    const meeting = selectedItemDetails.meetingRequest
    const doc = new jsPDF()
    
    // Add blue header background
    doc.setFillColor(0, 120, 212) // #0078d4 Microsoft Blue
    doc.rect(0, 0, 210, 40, 'F')
    
    // Header text in white
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text('Meeting Agenda', 20, 20)
    
    doc.setFontSize(11)
    doc.text(`${meeting.title || meeting.meetingTitle || 'Untitled'}`, 20, 30)
    
    // Reset text color to black for body
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Reference: ${meeting.referenceNumber || meeting.ReferenceNumber || 'N/A'}`, 20, 50)
    doc.text(`Date: ${new Date(meeting.meetingDate || meeting.MeetingDate).toLocaleDateString()}`, 20, 56)
    
    let yPos = 70
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Agenda Items:', 20, yPos)
    doc.setFont(undefined, 'normal')
    
    yPos += 10
    doc.setFontSize(11)
    agendaData.items.forEach((item, index) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.setFont(undefined, 'bold')
      doc.text(`${index + 1}. ${item.title}`, 25, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 7
      if (item.description) {
        const lines = doc.splitTextToSize(item.description, 160)
        doc.setFontSize(9)
        lines.forEach(line => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 20
          }
          doc.text(line, 30, yPos)
          yPos += 5
        })
        doc.setFontSize(11)
        yPos += 3
      }
    })
    
    if (agendaData.notes) {
      yPos += 10
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('General Notes:', 20, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 7
      doc.setFontSize(10)
      const noteLines = doc.splitTextToSize(agendaData.notes, 170)
      noteLines.forEach(line => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.text(line, 20, yPos)
        yPos += 5
      })
    }
    
    doc.save(`agenda-${meeting.referenceNumber || 'meeting'}.pdf`)
  }

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

  // Preview attachment function - opens in new tab for previewable files
  const previewAttachment = async (attachmentId, fileName, contentType) => {
    try {
      // Check if file type is previewable in browser
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
      
      if (!isPreviewable) {
        // Fall back to download for non-previewable files
        await downloadAttachment(attachmentId, fileName)
        return
      }
      
      const res = await fetch(`/api/meetingrequests/${selectedItem}/attachments/${attachmentId}`)
      if (!res.ok) throw new Error('Failed to load file')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Open in new tab
      window.open(url, '_blank')
      
      // Clean up after a delay (user might still be viewing)
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 60000) // 60 seconds
    } catch (err) {
      console.error('Error previewing attachment:', err)
      alert('Failed to preview file')
    }
  }

  // Fetch user registration status for a meeting
  const fetchUserRegistration = async (meetingId) => {
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/my-registration`)
      if (res.ok) {
        const data = await res.json()
        setUserRegistration(data.registered === false ? null : data)
      } else {
        setUserRegistration(null)
      }
    } catch (err) {
      console.error('Error fetching registration:', err)
      setUserRegistration(null)
    }
  }

  // Fetch capacity information for a meeting
  const fetchCapacityInfo = async (meetingId) => {
    setLoadingCapacity(true)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/capacity`)
      if (res.ok) {
        const data = await res.json()
        setCapacityInfo(data)
      } else {
        setCapacityInfo(null)
      }
    } catch (err) {
      console.error('Error fetching capacity:', err)
      setCapacityInfo(null)
    } finally {
      setLoadingCapacity(false)
    }
  }

  // Handle meeting registration
  const handleRegister = async (meetingId) => {
    setRegisteringMeeting(true)
    setRegistrationMessage(null)
    try {
      // Get current user info from MSAL
      const currentUserEmail = accounts && accounts.length > 0 ? (accounts[0].username || accounts[0].email || '').toLowerCase() : ''
      const currentUserName = accounts && accounts.length > 0 ? (accounts[0].name || accounts[0].username || 'User') : 'User'
      
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUserEmail,
          'X-User-Name': currentUserName
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUserRegistration(data)
        const statusText = data.status === 'Confirmed' 
          ? 'Successfully registered!' 
          : `Added to waitlist (Position: ${data.waitlistPosition})`
        setRegistrationMessage({ type: 'success', text: statusText })
        await fetchCapacityInfo(meetingId)
        // Refresh attendee list if user can view it
        if (canViewAttendeeList) {
          await fetchAttendees(meetingId)
        }
        // Clear message after 5 seconds
        setTimeout(() => setRegistrationMessage(null), 5000)
      } else {
        const error = await res.json()
        console.error('Registration failed:', { status: res.status, error })
        setRegistrationMessage({ type: 'error', text: error.error || 'Registration failed' })
        setTimeout(() => setRegistrationMessage(null), 5000)
      }
    } catch (err) {
      console.error('Registration error:', err)
      setRegistrationMessage({ type: 'error', text: 'Network error during registration' })
      setTimeout(() => setRegistrationMessage(null), 5000)
    } finally {
      setRegisteringMeeting(false)
    }
  }

  // Handle cancel registration button click
  const handleCancelRegistration = () => {
    setShowCancelRegistrationDialog(true)
    setCancellationReason('')
    setCancellationError(null)
  }

  // Confirm registration cancellation
  const confirmCancelRegistration = async () => {
    if (!cancellationReason.trim()) {
      setCancellationError('Please provide a reason for cancelling your registration')
      return
    }

    setCancellingRegistration(true)
    setCancellationError(null)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${selectedItem}/cancel`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Reason: cancellationReason })
      })
      if (res.ok) {
        setUserRegistration(null)
        setShowCancelRegistrationDialog(false)
        setRegistrationMessage({ type: 'success', text: 'Registration cancelled successfully' })
        await fetchCapacityInfo(selectedItem)
        // Refresh attendee list if user can view it
        if (canViewAttendeeList) {
          await fetchAttendees(selectedItem)
        }
        setTimeout(() => setRegistrationMessage(null), 5000)
      } else {
        const error = await res.json()
        setCancellationError(error.error || 'Cancellation failed')
      }
    } catch (err) {
      console.error('Cancellation error:', err)
      setCancellationError('Network error during cancellation')
    } finally {
      setCancellingRegistration(false)
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

      // Trigger refresh without changing filters
      setInternalRefresh(prev => prev + 1)

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

      // Trigger refresh without changing filters
      setInternalRefresh(prev => prev + 1)

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

      // Trigger refresh without changing filters
      setInternalRefresh(prev => prev + 1)

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

      // Trigger refresh without changing filters
      setInternalRefresh(prev => prev + 1)

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

      // Trigger refresh without changing filters
      setInternalRefresh(prev => prev + 1)

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

  // Filter items based on search term
  const summarySourceItems = summaryItems.length > 0 ? summaryItems : items
  const summaryFilteredItems = summarySourceItems.filter(item => matchesSearch(item, searchTerm))
  const tableBaseItems = summaryItems.length > 0 ? summaryFilteredItems : items.filter(item => matchesSearch(item, searchTerm))
  
  // Apply status filter on top of search filter using the most complete dataset available
  const filteredItems = statusFilter 
    ? tableBaseItems.filter(item => {
        const itemStatus = normalizeStatus(item.status ?? item.Status ?? 'Draft')
        return itemStatus === statusFilter
      })
    : tableBaseItems

  const totalDisplayCount = count ?? (summaryItems.length > 0 ? summaryItems.length : items.length)

  return (
    <FluentProvider theme={accessibleTheme}>
    <div className="p-4 bg-[#f1fbfb]" data-testid="meeting-requests-list">
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
      
      {/* Welcome banner */}
      <div
        className="mb-6 relative overflow-hidden rounded-xl border border-gray-200 shadow-md"
        style={{
          backgroundImage: 'url("/banner-welcome.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-white/25" aria-hidden="true" />
        <div className="relative px-6 py-8 text-[#035c73]">
          <p className="text-sm uppercase tracking-[0.15em] font-semibold text-[#046f8b]">Welcome</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight">Meeting Requests Management</h2>
          <p className="mt-2 text-sm text-[#046f8b] max-w-2xl">View and manage your meeting requests in list or calendar format. Use filters to find what you need.</p>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          appearance={viewMode === 'list' ? 'primary' : 'subtle'}
          icon={<DocumentBulletList24Regular />}
          onClick={() => onViewModeChange && onViewModeChange('list')}
        >
          List View
        </Button>
        <Button
          appearance={viewMode === 'calendar' ? 'primary' : 'subtle'}
          icon={<CalendarCheckmark24Regular />}
          onClick={() => onViewModeChange && onViewModeChange('calendar')}
        >
          Calendar View
        </Button>
      </div>

      {loading && <div className="text-center py-8">Loading meeting requests…</div>}
      {error && <div className="text-red-600 text-center py-8">Error: {error}</div>}
      {!loading && !error && (!items || items.length === 0) && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
            <DocumentBulletList24Regular className="mx-auto mb-4 text-gray-400" style={{ width: '48px', height: '48px' }} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filterMode === 'my-requests' ? 'No requests from you yet' : 'No meeting requests found'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {filterMode === 'my-requests' 
                ? 'You haven\'t created any meeting requests yet. Click "Create Request" to get started.'
                : 'There are no meeting requests in the system yet.'}
            </p>
            {filterMode === 'my-requests' && userName && (
              <p className="text-xs text-gray-500 mt-2 px-4 py-2 bg-gray-50 rounded border border-gray-200">
                Filtering by: {userName}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Status Summary - Always show when items exist */}
      {!loading && !error && items && items.length > 0 && (
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">Status Overview</h3>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="text-sm text-[#0078d4] hover:text-[#106ebe] font-medium transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-3" data-testid="filter-toggle">
            <span className="text-xs font-semibold text-gray-600">Show</span>
            <TabList
              selectedValue={filterMode}
              onTabSelect={(event, data) => {
                console.log('Filter mode changed:', data.value)
                if (onFilterModeChange) {
                  onFilterModeChange(data.value)
                }
              }}
              size="medium"
              appearance="subtle"
            >
              <Tab 
                value="my-requests"
                data-testid="filter-my-requests"
                icon={<Person20Regular />}
              >
                My Requests
              </Tab>
              <Tab 
                value="all-requests"
                data-testid="filter-all-requests"
                icon={<DocumentBulletList24Regular />}
              >
                All Requests
              </Tab>
            </TabList>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-[#e6f2ff] border border-[#0078d4] rounded-lg">
          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#0078d4]"></div>
          <span className="text-xs text-[#0078d4] font-semibold">
            {filterMode === 'my-requests' 
              ? (userName 
                ? `Showing your requests (${userName})` 
                : 'Sign in to view your requests')
              : 'Showing all team requests'}
          </span>
          {isFiltering && (
            <div className="ml-auto flex items-center gap-1 text-xs text-[#0078d4]">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </div>
          )}
        </div>
        {filterMode === 'my-requests' && !userName && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-800">
              ⚠️ You are not signed in. Showing all requests instead.
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {(() => {
            const statusCounts = {
              draft: 0,
              pending: 0,
              approved: 0,
              confirmed: 0,
              cancelled: 0,
              announced: 0
            }
            
            summaryFilteredItems.forEach(item => {
              const status = normalizeStatus(item.status ?? item.Status ?? 'Draft')
              if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++
              }
            })
            
            const statusConfig = [
              { key: 'draft', label: 'Draft', accent: '#6b7280', Icon: DocumentBulletList24Regular },
              { key: 'pending', label: 'Pending', accent: '#d97706', Icon: Clock24Regular },
              { key: 'approved', label: 'Approved', accent: '#15803d', Icon: CheckmarkCircle24Regular },
              { key: 'confirmed', label: 'Confirmed', accent: '#0078d4', Icon: CalendarCheckmark24Regular },
              { key: 'cancelled', label: 'Cancelled', accent: '#b91c1c', Icon: DismissCircle24Regular },
              { key: 'announced', label: 'Announced', accent: '#7c3aed', Icon: Megaphone24Regular }
            ]
            
            return statusConfig.map(({ key, label, accent, Icon }) => {
              const isActive = statusFilter === key
              const subtleAccent = `${accent}33`
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(isActive ? null : key)}
                  className="group flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 bg-white transition-all shadow-sm hover:shadow-md"
                  style={isActive ? { borderColor: accent, boxShadow: `0 8px 18px ${accent}26` } : {}}
                  aria-label={`Filter by ${label} status`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center justify-between w-full mb-2 gap-3">
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-full border"
                      style={{ color: accent, borderColor: accent, backgroundColor: subtleAccent }}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-3xl font-semibold leading-none" style={{ color: accent }}>
                        {statusCounts[key]}
                      </span>
                      <span className="text-xs font-medium" style={{ color: isActive ? accent : '#475569' }}>
                        {label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full" style={{ backgroundColor: isActive ? accent : subtleAccent }} />
                </button>
              )
            })
          })()}
        </div>
      </div>
      )}
      
      {/* No results message for search */}
      {!loading && !error && items && items.length > 0 && filteredItems.length === 0 && searchTerm && !statusFilter && (
        <div className="text-center py-8 text-gray-500" data-testid="no-results-message">
          No results found for "{searchTerm}"
        </div>
      )}
      
      {/* No results message for status filter */}
      {!loading && !error && items && items.length > 0 && filteredItems.length === 0 && statusFilter && (
        <div className="text-center py-8 text-gray-500" data-testid="no-results-message">
          No {statusFilter} items found. Click "Clear Filter" above to see all items.
        </div>
      )}
      
      {/* Table and results - Only show when there are filtered items */}
      {!loading && !error && filteredItems.length > 0 && (
      <>
      <div className="mb-3 text-sm text-gray-600">
        Showing {filteredItems.length} of {totalDisplayCount} meeting request(s)
      </div>
      
      {/* Table View */}
      <div className={`bg-white rounded-lg shadow overflow-hidden transition-opacity duration-300 ${isFiltering ? 'opacity-60' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Reference
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Requestor
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Meeting Date
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Quick Actions
                </th>
                {onEdit && (
                  <th scope="col" className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {(() => {
                      const status = (item.status ?? item.Status ?? '').toLowerCase();
                      const isEligible = status === 'confirmed' || status === 'announced';
                      const requestorEmail = (item.requestorEmail ?? item.RequestorEmail ?? '').toLowerCase();
                      const canViewAttendees = userEmail && (requestorEmail === userEmail || isSecAdmin || isEdOffice || hasAnyRole(userRoles, ['SecAdmin', 'EdOffice', 'ManagementOffice']));
                      
                      if (!isEligible) {
                        return <span className="text-gray-400 text-xs">—</span>;
                      }
                      
                      return (
                        <div className="flex items-center justify-center gap-2">
                          {canViewAttendees && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                drawerTabOverride.current = 'attendees'
                                setSelectedItem(item.id)
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[#0078d4] hover:bg-[#0078d4] hover:text-white rounded transition-colors text-xs font-medium"
                              title="View attendees"
                              aria-label="View attendees"
                            >
                              <Person20Regular />
                              <span>Attendees</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              drawerTabOverride.current = 'agenda'
                              setSelectedItem(item.id)
                            }}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[#0078d4] hover:bg-[#0078d4] hover:text-white rounded transition-colors text-xs font-medium"
                            title="View agenda"
                            aria-label="View agenda"
                          >
                            <CalendarClock20Regular />
                            <span>Agenda</span>
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  {onEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(item)
                        }}
                        className="inline-flex items-center justify-center p-2 text-[#0078d4] hover:bg-[#0078d4] hover:text-white rounded-lg transition-colors"
                        title="Edit request"
                        aria-label="Edit request"
                      >
                        <Edit20Regular />
                      </button>
                    </td>
                  )}
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
      {selectedItem && (() => {
        const status = (selectedItemDetails?.meetingRequest?.status ?? selectedItemDetails?.meetingRequest?.Status ?? '').toLowerCase()
        const showApprove = canApprove && selectedItemDetails?.meetingRequest && status !== 'approved' && status !== 'confirmed' && status !== 'cancelled' && status !== 'announced' && status !== 'draft'
        const showConfirm = canConfirm && selectedItemDetails?.meetingRequest && status !== 'confirmed' && status !== 'cancelled' && status !== 'announced' && status !== 'draft'
        const showAnnounce = canAnnounce && selectedItemDetails?.meetingRequest && status === 'confirmed'
        const showViewAgenda = selectedItemDetails?.meetingRequest && (status === 'confirmed' || status === 'announced')
        
        console.log('Button visibility debug:', {
          status,
          rawStatus: selectedItemDetails?.meetingRequest?.status,
          rawStatusUpper: selectedItemDetails?.meetingRequest?.Status,
          canApprove,
          canConfirm,
          canAnnounce,
          showApprove,
          showConfirm,
          showAnnounce,
          showViewAgenda
        })
        
        return null // This is just for debugging
      })()}
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
          
          const canViewAgenda = (item.status ?? item.Status ?? '').toLowerCase() === 'confirmed' || (item.status ?? item.Status ?? '').toLowerCase() === 'announced'
          
          return (
            <FluentProvider theme={accessibleTheme}>
              {/* Drawer Tabs */}
              <div className="mb-6 border-b border-gray-200">
                <TabList
                  selectedValue={drawerTab}
                  onTabSelect={(event, data) => setDrawerTab(data.value)}
                  size="large"
                >
                  <Tab value="details">Details</Tab>
                  {canViewAttendeeList && <Tab value="attendees">Attendees</Tab>}
                  {canViewAgenda && <Tab value="agenda">Agenda</Tab>}
                </TabList>
              </div>

              {/* Tab Content */}
              {drawerTab === 'details' && (
              <>
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
                <div className="mb-4 p-4 bg-[#e6f2ff] border-l-4 border-[#0078d4] rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-[#0078d4] mr-3" />
                    <div>
                      <p className="text-sm font-medium text-[#0078d4]">Request Confirmed Successfully</p>
                      <p className="text-xs text-[#106ebe] mt-1">The meeting request has been confirmed and is ready for announcement.</p>
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
              
              {/* Registration Message Banner */}
              {registrationMessage && (
                <div className={`mb-4 p-4 border-l-4 rounded-r ${
                  registrationMessage.type === 'success' 
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className={`${
                      registrationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                    } mr-3`} />
                    <div>
                      <p className={`text-sm font-medium ${
                        registrationMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {registrationMessage.text}
                      </p>
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
                            className="h-full bg-[#0078d4] transition-all duration-300"
                            style={{ 
                              width: (() => {
                                const status = (item.status ?? item.Status ?? 'Draft').toLowerCase()
                                if (status === 'draft') return '0%'
                                if (status === 'pending') return '25%'
                                if (status === 'approved') return '50%'
                                if (status === 'confirmed') return '75%'
                                if (status === 'announced') return '100%'
                                return '0%' // default to draft
                              })()
                            }}
                          />
                        </div>
                        
                        {/* Stages */}
                        {[
                          { key: 'draft', label: 'Draft', icon: DocumentBulletList24Regular },
                          { key: 'pending', label: 'Pending', icon: Clock24Regular },
                          { key: 'approved', label: 'Approved', icon: CheckmarkCircle24Regular },
                          { key: 'confirmed', label: 'Confirmed', icon: CalendarCheckmark24Regular },
                          { key: 'announced', label: 'Announced', icon: Megaphone24Regular }
                        ].map((stage, index) => {
                          const currentStatus = (item.status ?? item.Status ?? 'Draft').toLowerCase()
                          const isActive = currentStatus === stage.key
                          const isPassed = (() => {
                            const stages = ['draft', 'pending', 'approved', 'confirmed', 'announced']
                            const currentIndex = stages.indexOf(currentStatus)
                            return currentIndex > index
                          })()
                          const Icon = stage.icon
                          
                          return (
                            <div key={stage.key} className="flex flex-col items-center relative" style={{ zIndex: 1 }}>
                              <div 
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                                  isActive 
                                    ? 'bg-[#0078d4] text-white shadow-lg scale-110' 
                                    : isPassed 
                                      ? 'bg-[#0078d4] text-white' 
                                      : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}
                              >
                                <Icon />
                              </div>
                              <span className={`text-xs font-medium text-center ${isActive ? 'text-[#0078d4]' : 'text-gray-600'}`}>
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

                {/* Registration */}
                {(() => {
                  const status = (item.status ?? item.Status ?? '').toLowerCase();
                  return status === 'confirmed' || status === 'announced';
                })() && (
                  <div className="mt-8 pt-6 border-t space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Registration</p>
                        <p className="text-xs text-gray-500">Manage your seat for this meeting</p>
                      </div>
                      {loadingCapacity && <Spinner size="tiny" />}
                    </div>

                    {capacityInfo && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Capacity</span>
                          <span className="text-gray-800">
                            {(capacityInfo.registeredCount ?? capacityInfo.RegisteredCount ?? 0)}
                            {capacityInfo.maxAttendees ?? capacityInfo.MaxAttendees ? ` / ${capacityInfo.maxAttendees ?? capacityInfo.MaxAttendees}` : ' registered'}
                          </span>
                        </div>
                        {(capacityInfo.waitlistedCount ?? capacityInfo.WaitlistedCount ?? 0) > 0 && (
                          <div className="text-xs text-gray-600">
                            Waitlist: {capacityInfo.waitlistedCount ?? capacityInfo.WaitlistedCount}
                          </div>
                        )}
                        {(capacityInfo.registrationDeadline ?? capacityInfo.RegistrationDeadline) && (
                          <div className="text-xs text-gray-600">
                            Registration closes {formatDate(capacityInfo.registrationDeadline ?? capacityInfo.RegistrationDeadline)}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      {(() => {
                        const registrationStatus = userRegistration?.status ?? userRegistration?.Status;
                        const waitlistPosition = userRegistration?.waitlistPosition ?? userRegistration?.WaitlistPosition;
                        if (userRegistration) {
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between bg-[#e6f2ff] border border-[#0078d4] text-sm text-[#0078d4] rounded-lg px-3 py-2">
                                <span className="font-semibold">
                                  {registrationStatus?.toLowerCase() === 'waitlisted'
                                    ? `Waitlisted${waitlistPosition ? ` (Position ${waitlistPosition})` : ''}`
                                    : 'Registered'}
                                </span>
                                <CheckmarkCircle24Regular />
                              </div>
                              <button
                                onClick={handleCancelRegistration}
                                disabled={cancellingRegistration}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                                {cancellingRegistration ? 'Cancelling...' : 'Cancel Registration'}
                              </button>
                            </div>
                          );
                        }

                        if (capacityInfo?.isRegistrationOpen ?? capacityInfo?.IsRegistrationOpen ?? true) {
                          return (
                            <button
                              onClick={() => handleRegister(selectedItem)}
                              disabled={registeringMeeting}
                              className="w-full px-4 py-3 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center gap-2">
                              {registeringMeeting ? (
                                <>
                                  <Spinner size="tiny" />
                                  <span>Registering...</span>
                                </>
                              ) : (
                                <>
                                  <CalendarCheckmark24Regular />
                                  <span>Register for Meeting</span>
                                </>
                              )}
                            </button>
                          );
                        }

                        return (
                          <div className="p-3 bg-gray-100 rounded-lg text-center">
                            <p className="text-sm text-gray-600">Registration is currently closed</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                {/* T057-T065: Attachments Section */}
                <div className="mt-8 pt-6 border-t">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                    onClick={() => setShowAttachments(!showAttachments)}
                  >
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Attach20Regular />
                      Attachments
                      {attachments.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#0078d4] text-white text-xs rounded-full">
                          {attachments.length}
                        </span>
                      )}
                    </h3>
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
                            <div className="flex gap-1 ml-3 flex-shrink-0">
                              <button
                                onClick={() => previewAttachment(attachment.id, attachment.fileName, attachment.contentType)}
                                className="p-2 text-[#0078d4] hover:bg-[#0078d4] hover:text-white rounded transition-colors"
                                title="Preview file"
                              >
                                <Eye20Regular />
                              </button>
                              <button
                                onClick={() => downloadAttachment(attachment.id, attachment.fileName)}
                                className="p-2 text-[#0078d4] hover:bg-[#0078d4] hover:text-white rounded transition-colors"
                                title="Download file"
                              >
                                <ArrowDownload20Regular />
                              </button>
                            </div>
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
                        <div className="flex items-start gap-3 p-3 bg-[#e6f2ff] rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#cce5ff] flex items-center justify-center">
                            <CalendarClock20Regular className="text-[#0078d4]" />
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
              </> 
              )}

              {/* Attendees Tab */}
              {drawerTab === 'attendees' && canViewAttendeeList && (
                <div>
                  <AttendeeListView
                    data={attendeeList}
                    loading={loadingAttendees}
                    error={attendeesError}
                    onRefresh={() => selectedItem && fetchAttendees(selectedItem)}
                  />
                </div>
              )}

              {/* Agenda Tab */}
              {drawerTab === 'agenda' && canViewAgenda && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {item.title || item.meetingTitle || 'Meeting Agenda'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.referenceNumber || item.ReferenceNumber} • {new Date(item.meetingDate || item.MeetingDate).toLocaleDateString()}
                      </p>
                    </div>
                    {!loadingAgenda && (agendaData.items.length > 0 || agendaData.notes) && (
                      <button
                        onClick={handleDownloadAgendaPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0078d4] text-white rounded hover:bg-[#106ebe] transition-colors text-sm font-medium"
                      >
                        <ArrowDownload20Regular />
                        Download PDF
                      </button>
                    )}
                  </div>

                  {loadingAgenda ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner size="medium" label="Loading agenda..." />
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agenda Items</h3>
                        {agendaData.items.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600">No agenda items yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {agendaData.items.map((agendaItem, index) => (
                              <div key={agendaItem.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-3">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0078d4] text-white text-xs font-semibold flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{agendaItem.title}</h4>
                                    {agendaItem.description && (
                                      <p className="text-sm text-gray-600 mt-1">{agendaItem.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {agendaData.notes && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">General Notes</h3>
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{agendaData.notes}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
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

      {/* Cancel Registration Dialog */}
      {showCancelRegistrationDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !cancellingRegistration && setShowCancelRegistrationDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Meeting Registration</h3>
              
              {cancellationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {cancellationError}
                </div>
              )}
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Please provide a reason for cancelling your registration..."
                disabled={cancellingRegistration}
                autoFocus
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCancelRegistrationDialog(false)}
                  disabled={cancellingRegistration}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
                <button
                  onClick={confirmCancelRegistration}
                  disabled={cancellingRegistration || !cancellationReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRegistration ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </FluentProvider>
  )
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}
