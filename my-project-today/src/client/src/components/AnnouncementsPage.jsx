import React from 'react'
import AnnouncementsList from './AnnouncementsList'
import AnnouncementsErrorBoundary from './AnnouncementsErrorBoundary'
import AppShell from './shell/AppShell'

/**
 * Announcements Page
 * Feature: 001-announcements-tab
 * 
 * Main page for displaying announced meetings
 * Wrapped with error boundary for graceful error handling
 */
export default function AnnouncementsPage() {
  const [selectedAnnouncement, setSelectedAnnouncement] = React.useState(null)

  const handleAnnouncementClick = (announcement) => {
    setSelectedAnnouncement(announcement)
    // TODO: Phase 4 - Open drawer with announcement details
    console.log('Announcement clicked:', announcement)
  }

  return (
    <AppShell>
      <AnnouncementsErrorBoundary>
        <AnnouncementsList onAnnouncementClick={handleAnnouncementClick} />
      </AnnouncementsErrorBoundary>
    </AppShell>
  )
}
