import React from 'react'
import SearchBar from './SearchBar'
import { useMsal, useIsAuthenticated } from '../../auth/useAuth'
import { loginRequest, logoutRequest } from '../../auth/msalConfig'
import { useNavigate } from 'react-router-dom'

export default function Header({ onSearchChange }) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const account = instance.getActiveAccount()
  const userEmail = account?.username || account?.email || 'Account'

  const handleLogout = async () => {
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

  return (
    <header role="banner" className="shadow-md" style={{ backgroundColor: '#0078d4' }}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 bg-white text-[#0078d4] flex items-center justify-center rounded text-xs font-semibold shadow-md">UBS</div>
          <span className="font-semibold text-2xl text-white">Unified Board Solutions</span>
        </a>

        {isAuthenticated && <SearchBar onSearchChange={onSearchChange} />}

        <div className="ml-4 flex items-center gap-3">
          {isAuthenticated && (
            <>
              <div className="text-sm text-white font-medium">{userEmail}</div>
              <button 
                onClick={handleLogout} 
                disabled={isLoggingOut}
                className={`px-4 py-2 rounded text-sm font-medium transition-all shadow-sm ${
                  isLoggingOut 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-white hover:bg-gray-50 text-[#0078d4] hover:shadow-md'
                }`}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
          {!isAuthenticated && (
            <div className="text-sm text-white font-medium">Account</div>
          )}
        </div>
      </div>
    </header>
  )
}
