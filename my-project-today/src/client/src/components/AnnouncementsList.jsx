import React, { useState, useEffect } from 'react'
import { Card, Spinner, MessageBar, MessageBarBody, Button } from '@fluentui/react-components'
import { useMsal } from '../auth/useAuth'
import { loginRequest } from '../auth/msalConfig'

/**
 * AnnouncementsList Component
 * Feature: 001-announcements-tab
 * 
 * Displays a list of announced meeting requests (Status="Announced")
 * Features:
 * - Loading state with spinner
 * - Error state with retry button
 * - Empty state message
 * - Client-side date filtering (hides past announcements)
 * - Sorted by meeting date (descending)
 * - Card layout with title, date, category, subcategory
 */
export default function AnnouncementsList({ onAnnouncementClick }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { instance, accounts } = useMsal()

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    setLoading(true)
    setError(null)

    try {
      // Acquire access token for API call
      const account = accounts[0]
      if (!account) {
        throw new Error('No active account. Please sign in.')
      }

      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      })

      const token = tokenResponse.accessToken

      // Fetch announcements with status filter
      const response = await fetch('/api/meetingrequests?status=Announced', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Client-side filtering: Hide past announcements
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset to start of day

      const filteredData = data.filter(item => {
        if (!item.meetingDate) return false // Hide items without dates
        
        const meetingDate = new Date(item.meetingDate)
        meetingDate.setHours(0, 0, 0, 0)
        
        // Only show today and future dates
        return meetingDate.getTime() >= today.getTime()
      })

      // Sort by meeting date descending (newest first)
      const sortedData = filteredData.sort((a, b) => {
        const dateA = new Date(a.meetingDate)
        const dateB = new Date(b.meetingDate)
        return dateB - dateA // Descending order
      })

      setAnnouncements(sortedData)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setError(err.message || 'Unable to load announcements. Please try again.')
      setLoading(false)
    }
  }

  // Initial fetch on component mount
  useEffect(() => {
    fetchAnnouncements()
  }, [])

  // Retry handler
  const handleRetry = () => {
    fetchAnnouncements()
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    
    const date = new Date(dateString)
    const options = { year: 'numeric', month: 'short', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  // Loading State
  if (loading) {
    return (
      <div data-testid="announcements-loading" className="flex justify-center items-center py-12">
        <Spinner size="large" label="Loading Announced Meetings..." />
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div data-testid="announcements-error" className="max-w-2xl mx-auto mt-6">
        <MessageBar intent="error">
          <MessageBarBody>
            <p className="font-semibold">Error loading Announced Meetings</p>
            <p className="text-sm">{error}</p>
          </MessageBarBody>
        </MessageBar>
        <div className="mt-4 text-center">
          <Button 
            data-testid="announcements-retry"
            appearance="primary" 
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Empty State
  if (announcements.length === 0) {
    return (
      <div data-testid="announcements-empty" className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Announced Meetings available</h3>
        <p className="text-gray-500">There are currently no Announced Meetings to display.</p>
      </div>
    )
  }

  // List Display
  return (
    <div data-testid="announcements-list" className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Announced Meetings</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            data-testid="announcement-card"
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onAnnouncementClick && onAnnouncementClick(announcement)}
          >
            <div className="p-4">
              {/* Title */}
              <h3 
                data-testid="announcement-title"
                className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2"
              >
                {announcement.title || 'Untitled Meeting'}
              </h3>

              {/* Date */}
              <div 
                data-testid="announcement-date"
                className="text-sm text-gray-600 mb-2"
              >
                <strong>Date:</strong> {formatDate(announcement.meetingDate)}
              </div>

              {/* Category */}
              <div 
                data-testid="announcement-category"
                className="text-sm text-gray-600 mb-1"
              >
                <strong>Category:</strong> {announcement.category || 'N/A'}
              </div>

              {/* Subcategory (if available) */}
              {announcement.subcategory && (
                <div className="text-sm text-gray-500">
                  <strong>Subcategory:</strong> {announcement.subcategory}
                </div>
              )}

              {/* Reference Number */}
              {announcement.referenceNumber && (
                <div className="text-xs text-gray-400 mt-2">
                  Ref: {announcement.referenceNumber}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
