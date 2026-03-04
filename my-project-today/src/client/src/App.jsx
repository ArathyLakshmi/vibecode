import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import MeetingRequestForm from './components/MeetingRequestForm'
import MeetingRequestsList from './components/MeetingRequestsList'
import MeetingRequestsCalendar from './components/MeetingRequestsCalendar'
import AnnouncementsPage from './components/AnnouncementsPage'
import VotingPlatform from './pages/VotingPlatform'
import AgendaPage from './pages/AgendaPage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import Login from './components/Login'
import RequireAuth from './auth/RequireAuth'
import { useMsal, useIsAuthenticated } from './auth/useAuth'
import { loginRequest } from './auth/msalConfig'
import AppShell from './components/shell/AppShell'
import { Dismiss24Regular, Add24Regular, List24Regular, CalendarLtr24Regular } from '@fluentui/react-icons'
import { Button } from '@fluentui/react-components'

function Home() {
  const [open, setOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState(null)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [createFormKey, setCreateFormKey] = React.useState(0)
  const [inputValue, setInputValue] = React.useState('')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isSearching, setIsSearching] = React.useState(false)
  const [viewMode, setViewMode] = React.useState('list') // 'list' or 'calendar'
  const [filterMode, setFilterMode] = React.useState('all-requests') // 'my-requests' or 'all-requests'
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  // Debounce search input with 300ms delay
  React.useEffect(() => {
    // Set searching state immediately when input changes
    if (inputValue !== searchTerm) {
      setIsSearching(true)
    }

    // Create debounce timer
    const timer = setTimeout(() => {
      setSearchTerm(inputValue)
      setIsSearching(false)
    }, 300)

    // Cleanup function to cancel timer if user types again
    return () => {
      clearTimeout(timer)
    }
  }, [inputValue, searchTerm])

  async function handleLogin() {
    try {
      await instance.initialize()
      await instance.loginPopup(loginRequest)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSearchChange = (term) => {
    setInputValue(term)
  }

  return (
    <AppShell onSearchChange={handleSearchChange} onCreateRequest={() => { setOpen(true); setCreateFormKey(prev => prev + 1) }}>
      {/* Meeting requests view */}
      <div className="mb-6">
        {viewMode === 'list' ? (
          <MeetingRequestsList 
            searchTerm={searchTerm} 
            isSearching={isSearching} 
            refreshTrigger={refreshTrigger}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onEdit={(item) => {
              setEditItem(item)
            }}
          />
        ) : (
          <MeetingRequestsCalendar
            searchTerm={searchTerm}
            refreshTrigger={refreshTrigger}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onEdit={(item) => {
              setEditItem(item)
            }}
          />
        )}
      </div>

      {/* Drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />

      {/* Edit Drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity ${editItem ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setEditItem(null)} />

      {/* Create Drawer panel */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-[52%] md:w-[35.33%] bg-white shadow-lg transform transition-transform flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!open}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-[#0078d4] text-white">
          <h2 className="text-lg font-semibold">Create Meeting Request</h2>
          <button 
            onClick={() => setOpen(false)} 
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            aria-label="Close drawer"
          >
            <Dismiss24Regular />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 pb-8">
          <MeetingRequestForm 
            key={createFormKey}
            onSuccess={() => {
              setOpen(false)
              setRefreshTrigger(prev => prev + 1)
            }}
          />
        </div>
      </aside>

      {/* Edit Drawer */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-[52%] md:w-[35.33%] bg-white shadow-lg transform transition-transform flex flex-col ${editItem ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!editItem}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-[#0078d4] text-white">
          <h2 className="text-lg font-semibold">Edit Meeting Request</h2>
          <button 
            onClick={() => setEditItem(null)} 
            className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            aria-label="Close drawer"
          >
            <Dismiss24Regular />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 pb-8">
          {editItem && (
            <MeetingRequestForm 
              initialData={editItem}
              onSuccess={() => {
                setEditItem(null)
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          )}
        </div>
      </aside>
    </AppShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/announcements" element={<RequireAuth><AnnouncementsPage /></RequireAuth>} />
      <Route path="/voting-platform" element={<RequireAuth><VotingPlatform /></RequireAuth>} />
      <Route path="/agenda" element={<RequireAuth><AgendaPage /></RequireAuth>} />
      <Route path="/my-registrations" element={<RequireAuth><MyRegistrationsPage /></RequireAuth>} />
      {/* fallback to home for any other client-side routes */}
      <Route path="*" element={<RequireAuth><Home /></RequireAuth>} />
    </Routes>
  )
}
