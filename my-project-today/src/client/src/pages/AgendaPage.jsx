import React, { useState, useEffect } from 'react'
import { useMsal } from '@azure/msal-react'
import { useSearchParams } from 'react-router-dom'
import { useRoles, hasAnyRole } from '../auth/useRoles'
import AppShell from '../components/shell/AppShell'
import jsPDF from 'jspdf'
import {
  FluentProvider,
  Field,
  Input,
  Textarea,
  Button,
  Spinner
} from '@fluentui/react-components'
import { accessibleTheme } from '../theme/accessibleTheme'
import {
  DocumentBulletList24Regular,
  Add24Regular,
  Edit20Regular,
  Save20Regular,
  Dismiss20Regular,
  CalendarLtr24Regular,
  Warning24Regular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
  ArrowDownload20Regular
} from '@fluentui/react-icons'

export default function AgendaPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [agendaData, setAgendaData] = useState({ items: [], notes: '' })
  const [saving, setSaving] = useState(false)
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [newAgendaItem, setNewAgendaItem] = useState({ title: '', description: '', orderIndex: 0 })
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
  const { accounts } = useMsal()
  const userRoles = useRoles()
  const [searchParams] = useSearchParams()
  const meetingIdFromUrl = searchParams.get('meetingId')
  
  // Check if user is SecAdmin
  const userEmail = accounts && accounts.length > 0 ? (accounts[0].username || accounts[0].email || '').toLowerCase() : ''
  const isSecAdmin = hasAnyRole(userRoles, ['SecAdmin']) || userEmail === 'secadmin@arathylgmail.onmicrosoft.com'
  
  // Determine if page should be in read-only mode
  const isReadOnlyMode = !isSecAdmin || !!meetingIdFromUrl

  // Load confirmed meetings (only confirmed meetings can have agendas)
  useEffect(() => {
    // Allow access if SecAdmin OR if viewing specific meeting via URL
    if (!isSecAdmin && !meetingIdFromUrl) {
      setError('Access denied. Only SecAdmin can view this page.')
      setLoading(false)
      return
    }

    // If viewing specific meeting via URL, only load that meeting
    if (meetingIdFromUrl) {
      let cancelled = false
      async function loadSpecificMeeting() {
        setLoading(true)
        try {
          const res = await fetch(`/api/meetingrequests/${meetingIdFromUrl}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          
          if (!cancelled) {
            // Extract meeting from response (API returns { meetingRequest: {...} })
            const meeting = data.meetingRequest || data
            
            // Only show if it's confirmed or announced
            const status = (meeting.status ?? meeting.Status ?? '').toLowerCase()
            if (status === 'confirmed' || status === 'announced') {
              setMeetings([meeting])
              setSelectedMeeting(meeting)
            } else {
              setError('Agenda is only available for confirmed or announced meetings.')
            }
          }
        } catch (err) {
          if (!cancelled) {
            console.error('Error loading meeting:', err)
            setError(err.message || String(err))
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      }
      loadSpecificMeeting()
      return () => { cancelled = true }
    }

    // Otherwise, load all confirmed meetings (SecAdmin only)
    let cancelled = false
    async function loadMeetings() {
      setLoading(true)
      try {
        const res = await fetch('/api/meetingrequests?pageSize=100')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        
        if (!cancelled) {
          // Filter for confirmed and announced meetings only
          const confirmedMeetings = (data.items || []).filter(m => {
            const status = (m.status || '').toLowerCase()
            return status === 'confirmed' || status === 'announced'
          })
          setMeetings(confirmedMeetings)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading meetings:', err)
          setError(err.message || String(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadMeetings()
    return () => { cancelled = true }
  }, [isSecAdmin, meetingIdFromUrl])

  // Load agenda for selected meeting
  useEffect(() => {
    if (!selectedMeeting) {
      setAgendaData({ items: [], notes: '' })
      setSuccessMessage('')
      setErrorMessage('')
      return
    }

    setSuccessMessage('')
    setErrorMessage('')
    
    let cancelled = false
    async function loadAgenda() {
      setLoadingAgenda(true)
      try {
        const res = await fetch(`/api/meetingrequests/${selectedMeeting.id}/agenda`)
        if (res.status === 404) {
          // No agenda exists yet, that's ok
          if (!cancelled) setAgendaData({ items: [], notes: '' })
        } else if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        } else {
          const data = await res.json()
          if (!cancelled) setAgendaData(data)
        }
      } catch (err) {
        console.error('Error loading agenda:', err)
        if (!cancelled) setAgendaData({ items: [], notes: '' })
      } finally {
        if (!cancelled) setLoadingAgenda(false)
      }
    }
    loadAgenda()
    return () => { cancelled = true }
  }, [selectedMeeting])

  const handleAddAgendaItem = () => {
    const item = {
      ...newAgendaItem,
      id: Date.now(), // temporary ID
      orderIndex: agendaData.items.length
    }
    setAgendaData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }))
    setNewAgendaItem({ title: '', description: '', orderIndex: 0 })
  }

  const handleRemoveAgendaItem = (itemId) => {
    setAgendaData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const handleSaveAgenda = async () => {
    if (!selectedMeeting) return

    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
    
    try {
      // Transform data to match backend expectations (Pascal case)
      const payload = {
        Items: agendaData.items.map(item => ({
          Title: item.title,
          Description: item.description
        })),
        Notes: agendaData.notes
      }
      
      console.log('Saving agenda payload:', payload)
      
      const res = await fetch(`/api/meetingrequests/${selectedMeeting.id}/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Save agenda error:', errorText)
        let errorMessage = 'Failed to save agenda'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorText
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      setSuccessMessage('Agenda saved successfully!')
      setErrorMessage('')
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      console.error('Error saving agenda:', err)
      setErrorMessage('Failed to save agenda: ' + err.message)
      setSuccessMessage('')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!selectedMeeting || !agendaData) return

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      let yPosition = margin
      
      // Helper function to add text with word wrap
      const addText = (text, fontSize, isBold = false) => {
        doc.setFontSize(fontSize)
        if (isBold) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin)
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.4) > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * fontSize * 0.4 + 2
      }
      
      // Header
      doc.setFillColor(0, 120, 212) // #0078d4
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Meeting Agenda', margin, 25)
      
      // Reset text color
      doc.setTextColor(0, 0, 0)
      yPosition = 50
      
      // Meeting Details
      addText(`Meeting Title: ${selectedMeeting.title || selectedMeeting.meetingTitle || 'Untitled Meeting'}`, 14, true)
      yPosition += 2
      addText(`Reference: ${selectedMeeting.referenceNumber || selectedMeeting.ReferenceNumber || 'N/A'}`, 11)
      addText(`Date: ${new Date(selectedMeeting.meetingDate || selectedMeeting.MeetingDate).toLocaleDateString()}`, 11)
      addText(`Status: ${selectedMeeting.status || 'Confirmed'}`, 11)
      yPosition += 8
      
      // Agenda Items Section
      if (agendaData.items && agendaData.items.length > 0) {
        addText('Agenda Items', 16, true)
        yPosition += 2
        
        agendaData.items.forEach((item, index) => {
          // Item number and title
          addText(`${index + 1}. ${item.title}`, 12, true)
          
          // Description if exists
          if (item.description && item.description.trim()) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            const descLines = doc.splitTextToSize(item.description, pageWidth - 2 * margin - 10)
            
            // Check if we need a new page
            if (yPosition + (descLines.length * 10 * 0.4) > pageHeight - margin) {
              doc.addPage()
              yPosition = margin
            }
            
            doc.text(descLines, margin + 10, yPosition)
            yPosition += descLines.length * 10 * 0.4 + 2
          }
          
          yPosition += 3
        })
      } else {
        addText('No agenda items', 11)
      }
      
      yPosition += 5
      
      // General Notes Section
      if (agendaData.notes && agendaData.notes.trim()) {
        addText('General Notes', 16, true)
        yPosition += 2
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const notesLines = doc.splitTextToSize(agendaData.notes, pageWidth - 2 * margin)
        
        // Check if we need a new page
        if (yPosition + (notesLines.length * 10 * 0.4) > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        
        doc.text(notesLines, margin, yPosition)
      }
      
      // Footer
      const totalPages = doc.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }
      
      // Generate filename
      const meetingTitle = (selectedMeeting.title || selectedMeeting.meetingTitle || 'Meeting').replace(/[^a-z0-9]/gi, '_')
      const refNumber = (selectedMeeting.referenceNumber || selectedMeeting.ReferenceNumber || 'agenda').replace(/[^a-z0-9]/gi, '_')
      const filename = `${refNumber}_${meetingTitle}_Agenda.pdf`
      
      // Download
      doc.save(filename)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setErrorMessage('Failed to generate PDF: ' + err.message)
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  // Show access denied message if not SecAdmin and no meeting ID in URL
  if (!isSecAdmin && !meetingIdFromUrl) {
    return (
      <AppShell>
        <FluentProvider theme={accessibleTheme}>
          <div className="flex items-center justify-center min-h-96">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <Warning24Regular className="mx-auto mb-4 text-red-600" style={{ width: '48px', height: '48px' }} />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-sm text-gray-600">
                Only SecAdmin users can access the Meeting Agenda page.
              </p>
            </div>
          </div>
        </FluentProvider>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <FluentProvider theme={accessibleTheme}>
        <div className="min-h-screen bg-[#f1fbfb]">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Welcome banner for consistent styling */}
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
                <p className="text-sm uppercase tracking-[0.15em] font-semibold text-[#046f8b]">Agendas</p>
                <h1 className="mt-2 text-2xl font-bold leading-tight">Meeting agendas at a glance</h1>
                <p className="mt-2 text-sm text-[#046f8b] max-w-2xl">
                  Review, edit, and export agendas with the same streamlined experience as your meeting requests.
                </p>
              </div>
            </div>

            {/* Header card */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#e6f2ff] text-[#0078d4]">
                    <CalendarLtr24Regular style={{ width: '28px', height: '28px' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Meeting Agendas</h2>
                    <p className="text-sm text-gray-600">
                      {isReadOnlyMode ? 'View meeting agenda' : 'Manage agendas for confirmed meetings'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-[#0078d4]" />
                  <span>{meetingIdFromUrl ? 'Focused on a single meeting' : `Confirmed/Announced: ${meetings.length || 0}`}</span>
                </div>
              </div>
            </div>

          {/* Read-Only Mode Banner */}
          {isReadOnlyMode && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
              <div className="flex items-center">
                <Warning24Regular className="text-blue-600 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    You are viewing this agenda in read-only mode. {!isSecAdmin && 'Only SecAdmin users can edit agendas.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r">
              <div className="flex items-center">
                <CheckmarkCircle24Regular className="text-green-600 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="text-green-600 hover:text-green-800"
                >
                  <Dismiss20Regular />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
              <div className="flex items-center">
                <DismissCircle24Regular className="text-red-600 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-red-600 hover:text-red-800"
                >
                  <Dismiss20Regular />
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="large" label="Loading meetings..." />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r p-4 mb-6">
              <p className="text-sm font-medium text-red-900">Error: {error}</p>
            </div>
          )}

          {!loading && !error && meetings.length === 0 && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
                <DocumentBulletList24Regular className="mx-auto mb-4 text-gray-400" style={{ width: '48px', height: '48px' }} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Confirmed Meetings</h3>
                <p className="text-sm text-gray-600">
                  There are no confirmed or announced meetings available. Agendas can only be created for confirmed meetings.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && meetings.length > 0 && (
            <div className={`grid grid-cols-1 ${meetingIdFromUrl ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
              {/* Meetings List - only show if not viewing specific meeting */}
              {!meetingIdFromUrl && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DocumentBulletList24Regular />
                      Confirmed Meetings ({meetings.length})
                    </h2>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {meetings.map(meeting => (
                        <button
                          key={meeting.id}
                          onClick={() => setSelectedMeeting(meeting)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedMeeting?.id === meeting.id
                              ? 'border-[#0078d4] bg-[#0078d4]/10'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {meeting.title || meeting.meetingTitle || 'Untitled Meeting'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {meeting.referenceNumber || meeting.ReferenceNumber || 'No ref'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(meeting.meetingDate || meeting.MeetingDate).toLocaleDateString()}
                          </div>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              (meeting.status || '').toLowerCase() === 'announced'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {meeting.status || 'Confirmed'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Agenda Editor */}
              <div className={meetingIdFromUrl ? 'lg:col-span-1' : 'lg:col-span-2'}>
                {selectedMeeting ? (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedMeeting.title || selectedMeeting.meetingTitle || 'Untitled Meeting'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedMeeting.referenceNumber || selectedMeeting.ReferenceNumber} • {new Date(selectedMeeting.meetingDate || selectedMeeting.MeetingDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {(agendaData.items.length > 0 || agendaData.notes) && (
                          <Button
                            appearance="secondary"
                            icon={<ArrowDownload20Regular />}
                            onClick={handleDownloadPDF}
                            disabled={saving || loadingAgenda}
                          >
                            Download PDF
                          </Button>
                        )}
                        {!isReadOnlyMode && (
                          <Button
                            appearance="primary"
                            icon={<Save20Regular />}
                            onClick={handleSaveAgenda}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save Agenda'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {loadingAgenda && (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="medium" label="Loading agenda..." />
                      </div>
                    )}

                    {!loadingAgenda && (
                      <>
                        {/* Agenda Items */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Agenda Items</h3>
                          </div>

                          {!isReadOnlyMode && (
                            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="grid grid-cols-1 gap-3">
                                <Field label="Title" required>
                                  <Input
                                    value={newAgendaItem.title}
                                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g., Opening Remarks, Budget Review"
                                  />
                                </Field>
                                <Field label="Description">
                                  <Textarea
                                    value={newAgendaItem.description}
                                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    placeholder="Optional details about this agenda item..."
                                  />
                                </Field>
                                <div className="flex gap-2">
                                  <Button
                                    appearance="primary"
                                    icon={<Add24Regular />}
                                    onClick={handleAddAgendaItem}
                                    disabled={!newAgendaItem.title.trim()}
                                  >
                                    Add Item
                                  </Button>
                                  <Button
                                    appearance="secondary"
                                    onClick={() => setNewAgendaItem({ title: '', description: '', orderIndex: 0 })}
                                    disabled={!newAgendaItem.title && !newAgendaItem.description}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {agendaData.items.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">No agenda items yet. {isReadOnlyMode ? 'Agenda items will appear here when available.' : 'Use the form above to add the first item.'}</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {agendaData.items.map((item, index) => (
                                <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0078d4] text-white text-xs font-semibold">
                                          {index + 1}
                                        </span>
                                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-gray-600">{item.description}</p>
                                      )}
                                    </div>
                                    {!isReadOnlyMode && (
                                      <button
                                        onClick={() => handleRemoveAgendaItem(item.id)}
                                        className="ml-2 p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                        title="Remove item"
                                      >
                                        <Dismiss20Regular />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* General Notes */}
                        <div>
                          <Field label="General Notes">
                            <Textarea
                              value={agendaData.notes}
                              onChange={(e) => setAgendaData(prev => ({ ...prev, notes: e.target.value }))}
                              readOnly={isReadOnlyMode}
                              disabled={isReadOnlyMode}
                              rows={4}
                              placeholder="Add any general notes or information about this meeting..."
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <CalendarLtr24Regular className="mx-auto mb-4 text-gray-400" style={{ width: '48px', height: '48px' }} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Meeting</h3>
                    <p className="text-sm text-gray-600">
                      Choose a meeting from the list to create or edit its agenda
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </FluentProvider>
    </AppShell>
  )
}
