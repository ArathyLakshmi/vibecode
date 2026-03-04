import React from 'react'
import { useIsAuthenticated } from '../auth/useAuth'
import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login, preserve original location in state
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
