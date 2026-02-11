import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import MeetingRequestForm from './components/MeetingRequestForm'
import MeetingRequestsList from './components/MeetingRequestsList'
import Login from './components/Login'
import RequireAuth from './auth/RequireAuth'
import { useMsal, useIsAuthenticated } from './auth/useAuth'
import { loginRequest, logoutRequest } from './auth/msalConfig'
import { useNavigate } from 'react-router-dom'
import AppShell from './components/shell/AppShell'

function Home() {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isSearching, setIsSearching] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

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

  async function handleLogout() {
    // Prevent duplicate logout attempts
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    
    // Navigate to login first to avoid RequireAuth redirect flash
    navigate('/login', { replace: true })
    
    // Small delay to ensure navigation completes before redirect
    setTimeout(async () => {
      try {
        // Use logoutRedirect instead of logoutPopup
        // This will redirect to Microsoft logout, then back to /login
        await instance.logoutRedirect(logoutRequest)
      } catch (e) {
        console.error('Logout failed', e)
        
        // Graceful degradation: Clear local session even on error
        try {
          instance.clearCache()
        } catch (clearError) {
          console.error('Failed to clear cache', clearError)
        }
        
        // Re-enable button on error so user can retry
        setIsLoggingOut(false)
      }
    }, 100)
  }

  const handleSearchChange = (term) => {
    setInputValue(term)
  }

  return (
    <AppShell onSearchChange={handleSearchChange}>
      <div className="flex justify-center mb-6 gap-4">
        <button onClick={() => setOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Create Meeting Request</button>
        <div className="ml-4">
          {isAuthenticated ? (
            <button 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className={`px-3 py-2 rounded ${
                isLoggingOut 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          ) : (
            <button onClick={handleLogin} className="px-3 py-2 bg-green-600 text-white rounded">Login</button>
          )}
        </div>
      </div>

      {/* Meeting requests list */}
      <div className="mb-6">
        <MeetingRequestsList searchTerm={searchTerm} isSearching={isSearching} />
      </div>

      {/* Drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />

      {/* Drawer panel */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-1/2 md:w-1/3 bg-white shadow-lg transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!open}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Meeting Request</h2>
          <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900">Close</button>
        </div>
        <div className="p-4 overflow-auto h-full">
          <MeetingRequestForm />
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
      {/* fallback to home for any other client-side routes */}
      <Route path="*" element={<RequireAuth><Home /></RequireAuth>} />
    </Routes>
  )
}
