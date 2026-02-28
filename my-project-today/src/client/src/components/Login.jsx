import React, { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '../auth/useAuth'
import { loginRequest } from '../auth/msalConfig'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Login() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state && location.state.from && location.state.from.pathname) || '/'

  useEffect(() => {
    console.debug('Login: useEffect accounts/isAuthenticated', { accounts, isAuthenticated })
    if (accounts && accounts.length > 0) {
      console.debug('Login: setting active account from accounts[0]')
      instance.setActiveAccount(accounts[0])
      navigate(from, { replace: true })
    } else if (isAuthenticated) {
      console.debug('Login: isAuthenticated true, navigating to', from)
      navigate(from, { replace: true })
    }
  }, [accounts, instance, isAuthenticated, navigate, from])

  const handleSignIn = async () => {
    try {
      console.debug('Auth: ensuring MSAL is initialized before loginRedirect')
      // Ensure MSAL is initialized (idempotent operation)
      await instance.initialize()
      console.debug('Auth: calling instance.loginRedirect', { req: loginRequest })
      await instance.loginRedirect(loginRequest)
    } catch (e) {
      console.error('Login redirect failed', e)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Sign in to Unified Board Solutions</h2>
        <p className="mb-4 text-sm text-gray-600">Use your organization account to access board meeting requests and SEC workflows.</p>
        <div className="flex justify-center">
          <button type="button" onClick={handleSignIn} className="px-6 py-3 bg-blue-600 text-white rounded">Sign in with Microsoft</button>
        </div>
      </div>
    </div>
  )
}
