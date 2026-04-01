import React from 'react'
import { 
  Spinner, 
  TabList, 
  Tab,
  FluentProvider,
} from '@fluentui/react-components'
import { 
  CalendarCheckmark24Regular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
  Clock24Regular,
  CalendarLtr24Regular,
  DocumentBulletList24Regular,
  Megaphone24Regular,
  ChevronDown20Regular,
  ChevronUp20Regular,
  ArrowDownload20Regular
} from '@fluentui/react-icons'
import AppShell from '../components/shell/AppShell'
import Drawer from '../components/Drawer'
import AttendeeListView from '../components/AttendeeListView'
import { accessibleTheme } from '../theme/accessibleTheme'
import { useMsal } from '@azure/msal-react'
import { useRoles, hasAnyRole } from '../auth/useRoles'
import jsPDF from 'jspdf'

export default function MyRegistrationsPage() {
  const { accounts } = useMsal()
  const { roles: userRoles } = useRoles()
  
  const [loading, setLoading] = React.useState(true)
  const [registrations, setRegistrations] = React.useState([])
  const [summary, setSummary] = React.useState(null)
  const [filter, setFilter] = React.useState('upcoming')
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [selectedRegistration, setSelectedRegistration] = React.useState(null)
  const [cancellationReason, setCancellationReason] = React.useState('')
  const [cancelling, setCancelling] = React.useState(false)
  const [message, setMessage] = React.useState(null)
  const [selectedMeeting, setSelectedMeeting] = React.useState(null)
  const [meetingDetails, setMeetingDetails] = React.useState(null)
  const [loadingDetails, setLoadingDetails] = React.useState(false)
  const [drawerTab, setDrawerTab] = React.useState('details')
  const [attendeeList, setAttendeeList] = React.useState(null)
  const [loadingAttendees, setLoadingAttendees] = React.useState(false)
  const [attendeesError, setAttendeesError] = React.useState(null)
  const [agendaData, setAgendaData] = React.useState({ items: [], notes: '' })
  const [loadingAgenda, setLoadingAgenda] = React.useState(false)
  const [showLifecycle, setShowLifecycle] = React.useState(true)

  // Get user email and role checks
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

  // Check if user can view attendee list
  const canViewAttendeeList = React.useMemo(() => {
    if (!meetingDetails) return false
    const status = (meetingDetails.status || '').toLowerCase()
    if (status !== 'confirmed' && status !== 'announced') return false
    const requestor = (meetingDetails.requestorEmail || meetingDetails.requestor || meetingDetails.createdBy || '').toLowerCase()
    const isAdminRole = hasAnyRole(userRoles, ['SecAdmin', 'EdOffice', 'ManagementOffice']) || isSecAdmin || isEdOffice || isDevAdmin
    return isAdminRole || (!!userEmail && userEmail === requestor)
  }, [meetingDetails, userRoles, userEmail, isSecAdmin, isEdOffice, isDevAdmin])

  // Check if meeting has agenda (confirmed or announced)
  const canViewAgenda = React.useMemo(() => {
    if (!meetingDetails) return false
    const status = (meetingDetails.status || '').toLowerCase()
    return status === 'confirmed' || status === 'announced'
  }, [meetingDetails])

  // Fetch attendees
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

  // Fetch attendees when meeting changes and user has permission
  React.useEffect(() => {
    if (!selectedMeeting || !meetingDetails) {
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

    fetchAttendees(selectedMeeting)
  }, [selectedMeeting, meetingDetails, canViewAttendeeList, fetchAttendees])

  // Load agenda data when agenda tab is selected
  React.useEffect(() => {
    if (!selectedMeeting || drawerTab !== 'agenda') return
    if (agendaData.items.length > 0 || agendaData.notes) return // Already loaded
    
    let cancelled = false
    async function loadAgenda() {
      setLoadingAgenda(true)
      try {
        const res = await fetch(`/api/meetingrequests/${selectedMeeting}/agenda`)
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
  }, [selectedMeeting, drawerTab, agendaData.items.length, agendaData.notes])

  // Handle PDF download for agenda
  const handleDownloadAgendaPDF = () => {
    if (!meetingDetails) return
    
    const doc = new jsPDF()
    
    // Add blue header background
    doc.setFillColor(0, 120, 212) // #0078d4 Microsoft Blue
    doc.rect(0, 0, 210, 40, 'F')
    
    // Header text in white
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Meeting Agenda', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(meetingDetails.title || 'Meeting', 105, 32, { align: 'center' })
    
    // Reset text color to black for body
    doc.setTextColor(0, 0, 0)
    
    let yPos = 55
    
    // Meeting details box
    doc.setFillColor(240, 240, 240)
    doc.rect(10, yPos - 5, 190, 35, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Reference Number:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(meetingDetails.referenceNumber || 'N/A', 60, yPos)
    
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Date:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    if (meetingDetails.meetingDate) {
      doc.text(new Date(meetingDetails.meetingDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), 60, yPos)
    }
    
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Time:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    if (meetingDetails.meetingDate) {
      doc.text(new Date(meetingDetails.meetingDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }), 60, yPos)
    }
    
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Status:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(meetingDetails.status || 'N/A', 60, yPos)
    
    yPos += 15
    
    // Agenda Items
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Agenda Items', 15, yPos)
    yPos += 10
    
    if (agendaData.items.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text('No agenda items available.', 15, yPos)
      doc.setTextColor(0, 0, 0)
      yPos += 10
    } else {
      agendaData.items.forEach((item, index) => {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${index + 1}. ${item.title || 'Untitled'}`, 15, yPos)
        yPos += 7
        
        if (item.description) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          const lines = doc.splitTextToSize(item.description, 180)
          doc.text(lines, 20, yPos)
          yPos += lines.length * 5 + 5
        }
        
        if (item.duration) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          doc.text(`Duration: ${item.duration} minutes`, 20, yPos)
          yPos += 7
        }
        
        yPos += 3
        
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
      })
    }
    
    // Notes section
    if (agendaData.notes) {
      yPos += 5
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Additional Notes', 15, yPos)
      yPos += 10
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const noteLines = doc.splitTextToSize(agendaData.notes, 180)
      doc.text(noteLines, 15, yPos)
    }
    
    // Save the PDF
    const fileName = `Agenda_${meetingDetails.referenceNumber || 'Meeting'}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  // Fetch registrations
  const fetchRegistrations = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/registrations/my-registrations?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setRegistrations(data.registrations || [])
        setSummary(data.summary || null)
      } else {
        console.error('Failed to fetch registrations')
        setRegistrations([])
        setSummary(null)
      }
    } catch (err) {
      console.error('Error fetching registrations:', err)
      setRegistrations([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [filter])

  React.useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  const handleCancelRegistration = (registration) => {
    setSelectedRegistration(registration)
    setCancellationReason('')
    setShowCancelDialog(true)
  }

  const handleViewMeeting = async (registration) => {
    setSelectedMeeting(registration.meetingRequestId)
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/meetingrequests/${registration.meetingRequestId}`)
      if (res.ok) {
        const data = await res.json()
        setMeetingDetails(data)
      } else {
        console.error('Failed to fetch meeting details')
        setMeetingDetails(null)
      }
    } catch (err) {
      console.error('Error fetching meeting details:', err)
      setMeetingDetails(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseDrawer = () => {
    setSelectedMeeting(null)
    setMeetingDetails(null)
    setDrawerTab('details')
    setAttendeeList(null)
    setAttendeesError(null)
    setAgendaData({ items: [], notes: '' })
    setShowLifecycle(true)
  }

  const confirmCancellation = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    setCancelling(true)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${selectedRegistration.meetingRequestId}/cancel`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Reason: cancellationReason })
      })

      if (res.ok) {
        setShowCancelDialog(false)
        setSelectedRegistration(null)
        setMessage({ type: 'success', text: 'Registration cancelled successfully' })
        setTimeout(() => setMessage(null), 5000)
        // Refresh the list
        fetchRegistrations()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to cancel registration')
      }
    } catch (err) {
      console.error('Error cancelling registration:', err)
      alert('Network error during cancellation')
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      Confirmed: 'bg-green-100 text-green-800 border-green-300',
      Waitlisted: 'bg-amber-100 text-amber-800 border-amber-300',
      Cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
      Attended: 'bg-blue-100 text-blue-800 border-blue-300'
    }
    
    const icons = {
      Confirmed: '✓',
      Waitlisted: '⏳',
      Cancelled: '✕',
      Attended: '✓'
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        <span>{icons[status]}</span>
        <span>{status}</span>
      </span>
    )
  }

  return (
    <AppShell>
      <FluentProvider theme={accessibleTheme}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#0078d4] rounded-lg">
                <CalendarCheckmark24Regular className="text-white" style={{ fontSize: '24px' }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  My Meeting Registrations
                </h1>
                <p className="text-sm text-gray-600 mt-1">View and manage your meeting registrations</p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 shadow-sm ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-center gap-2">
                <CheckmarkCircle24Regular className={message.type === 'success' ? 'text-green-600' : 'text-red-600'} />
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Summary Cards with Integrated Filters */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Upcoming */}
              <button
                onClick={() => setFilter('upcoming')}
                disabled={loading}
                className={`bg-white p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === 'upcoming' 
                    ? 'border-green-500 ring-2 ring-green-100' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    filter === 'upcoming' ? 'bg-green-100' : 'bg-green-50'
                  }`}>
                    <CheckmarkCircle24Regular className="text-green-600" style={{ fontSize: '28px' }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{summary.upcomingMeetings}</p>
                    <p className="text-xs text-gray-600 font-medium">📅 Upcoming</p>
                  </div>
                </div>
              </button>

              {/* Past */}
              <button
                onClick={() => setFilter('past')}
                disabled={loading}
                className={`bg-white p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === 'past' 
                    ? 'border-blue-500 ring-2 ring-blue-100' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    filter === 'past' ? 'bg-blue-100' : 'bg-blue-50'
                  }`}>
                    <CalendarLtr24Regular className="text-blue-600" style={{ fontSize: '28px' }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{summary.pastMeetings}</p>
                    <p className="text-xs text-gray-600 font-medium">📋 Past</p>
                  </div>
                </div>
              </button>

              {/* Waitlisted */}
              <button
                onClick={() => setFilter('waitlisted')}
                disabled={loading}
                className={`bg-white p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === 'waitlisted' 
                    ? 'border-amber-500 ring-2 ring-amber-100' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    filter === 'waitlisted' ? 'bg-amber-100' : 'bg-amber-50'
                  }`}>
                    <Clock24Regular className="text-amber-600" style={{ fontSize: '28px' }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{summary.waitlistedCount}</p>
                    <p className="text-xs text-gray-600 font-medium">⏳ Waitlisted</p>
                  </div>
                </div>
              </button>

              {/* Cancelled */}
              <button
                onClick={() => setFilter('cancelled')}
                disabled={loading}
                className={`bg-white p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  filter === 'cancelled' 
                    ? 'border-gray-500 ring-2 ring-gray-100' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    filter === 'cancelled' ? 'bg-gray-200' : 'bg-gray-50'
                  }`}>
                    <DismissCircle24Regular className="text-gray-600" style={{ fontSize: '28px' }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{summary.cancelledCount}</p>
                    <p className="text-xs text-gray-600 font-medium">❌ Cancelled</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Registrations List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">{loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner size="large" />
              <p className="mt-4 text-sm text-gray-600 font-medium">Loading registrations...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                <CalendarCheckmark24Regular className="text-gray-400" style={{ fontSize: '48px' }} />
              </div>
              <p className="text-lg text-gray-700 font-semibold mb-2">No registrations found</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {filter === 'upcoming' && "You haven't registered for any upcoming meetings yet. Browse available meetings and register to attend."}
                {filter === 'past' && "No past meeting registrations found."}
                {filter === 'waitlisted' && "You don't have any waitlisted registrations. This shows meetings where you're on the waiting list."}
                {filter === 'cancelled' && "You haven't cancelled any registrations."}
                {filter === 'all' && "You haven't registered for any meetings yet. Start by browsing available meetings."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {registrations.map((reg) => (
                <div 
                  key={reg.id} 
                  className="p-6 hover:bg-blue-50 transition-all cursor-pointer"
                  onClick={() => handleViewMeeting(reg)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          {reg.meetingTitle}
                        </h3>
                        {getStatusBadge(reg.status)}
                        {reg.status === 'Waitlisted' && reg.waitlistPosition > 0 && (
                          <span className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full border border-amber-200">
                            Position: #{reg.waitlistPosition}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <CalendarLtr24Regular className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-700 font-medium">
                              {new Date(reg.meetingDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(reg.meetingDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CheckmarkCircle24Regular className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-600">
                            Registered on: <span className="font-medium">{new Date(reg.registrationDate).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {reg.status === 'Cancelled' && reg.cancellationDate && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 font-medium">
                              Cancelled on: {new Date(reg.cancellationDate).toLocaleDateString()}
                            </p>
                            {reg.cancellationReason && (
                              <p className="text-xs text-gray-600 mt-1">
                                <span className="font-medium">Reason:</span> {reg.cancellationReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {reg.canCancel && reg.status !== 'Cancelled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelRegistration(reg)
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors flex-shrink-0"
                      >
                        Cancel Registration
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meeting Details Drawer */}
      <Drawer
        isOpen={selectedMeeting !== null}
        onClose={handleCloseDrawer}
        title="Meeting Details"
      >
        {(() => {
          if (loadingDetails) {
            return (
              <div className="flex flex-col items-center justify-center py-16">
                <Spinner size="large" />
                <p className="mt-4 text-sm text-gray-600 font-medium">Loading meeting details...</p>
              </div>
            )
          }

          if (!meetingDetails) {
            return (
              <div className="text-center py-16 px-4">
                <p className="text-gray-600">Failed to load meeting details</p>
              </div>
            )
          }

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

              {/* Details Tab */}
              {drawerTab === 'details' && (
                <>
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
                        {(meetingDetails.status || '').toLowerCase() === 'cancelled' ? (
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
                                    const status = (meetingDetails.status || 'Draft').toLowerCase()
                                    if (status === 'draft') return '0%'
                                    if (status === 'pending') return '25%'
                                    if (status === 'approved') return '50%'
                                    if (status === 'confirmed') return '75%'
                                    if (status === 'announced') return '100%'
                                    return '0%'
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
                              const currentStatus = (meetingDetails.status || 'Draft').toLowerCase()
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
                    {/* Title */}
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{meetingDetails.title}</h3>
                      {meetingDetails.referenceNumber && (
                        <p className="text-sm text-gray-500">Ref: {meetingDetails.referenceNumber}</p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                        meetingDetails.status?.toLowerCase() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        meetingDetails.status?.toLowerCase() === 'announced' ? 'bg-purple-100 text-purple-800' :
                        meetingDetails.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                        meetingDetails.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-800' :
                        meetingDetails.status?.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {meetingDetails.status}
                      </span>
                    </div>

                    {/* Meeting Date */}
                    {meetingDetails.meetingDate && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600 font-medium mb-1">Meeting Date & Time</p>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(meetingDetails.meetingDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(meetingDetails.meetingDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Requestor */}
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-1">Requested By</p>
                      <p className="text-base text-gray-900">{meetingDetails.requestorName}</p>
                      {meetingDetails.requestorEmail && (
                        <p className="text-sm text-gray-500">{meetingDetails.requestorEmail}</p>
                      )}
                    </div>

                    {/* Description */}
                    {meetingDetails.description && (
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-2">Description</p>
                        <p className="text-base text-gray-700 whitespace-pre-wrap">{meetingDetails.description}</p>
                      </div>
                    )}

                    {/* Request Type & Category */}
                    <div className="grid grid-cols-2 gap-4">
                      {meetingDetails.requestType && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Request Type</p>
                          <p className="text-base text-gray-900">{meetingDetails.requestType}</p>
                        </div>
                      )}
                      {meetingDetails.category && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Category</p>
                          <p className="text-base text-gray-900">{meetingDetails.category}</p>
                        </div>
                      )}
                    </div>

                    {/* Country */}
                    {meetingDetails.country && (
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-1">Country</p>
                        <p className="text-base text-gray-900">{meetingDetails.country}</p>
                      </div>
                    )}

                    {/* Comments */}
                    {meetingDetails.comments && (
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-2">Comments</p>
                        <p className="text-base text-gray-700 whitespace-pre-wrap">{meetingDetails.comments}</p>
                      </div>
                    )}

                    {/* Classification */}
                    {meetingDetails.classification && (
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-1">Classification</p>
                        <p className="text-base text-gray-900">{meetingDetails.classification}</p>
                      </div>
                    )}
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
                    onRefresh={() => selectedMeeting && fetchAttendees(selectedMeeting)}
                  />
                </div>
              )}

              {/* Agenda Tab */}
              {drawerTab === 'agenda' && canViewAgenda && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {meetingDetails.title || 'Meeting Agenda'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {meetingDetails.referenceNumber} • {new Date(meetingDetails.meetingDate).toLocaleDateString()}
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

      {/* Cancel Registration Dialog */}
      {showCancelDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !cancelling && setShowCancelDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DismissCircle24Regular className="text-red-600" style={{ fontSize: '24px' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Cancel Meeting Registration</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Meeting:</span> {selectedRegistration?.meetingTitle}
                </p>
              </div>
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:border-transparent resize-none"
                rows={4}
                placeholder="Please provide a detailed reason for cancelling your registration..."
                disabled={cancelling}
                autoFocus
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelling}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Keep Registration
                </button>
                <button
                  onClick={confirmCancellation}
                  disabled={cancelling || !cancellationReason.trim()}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </FluentProvider>
    </AppShell>
  )
}
