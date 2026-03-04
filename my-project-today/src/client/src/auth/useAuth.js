import { useIsAuthenticated as useMsalIsAuthenticated, useMsal as useMsalReact } from '@azure/msal-react'
import { useTestAuth } from './TestAuthProvider'

export function useIsAuthenticated() {
  // runtime switch driven by Vite env variable
  if (import.meta.env.VITE_TEST_MODE === 'true') {
    const t = useTestAuth()
    return t.isAuthenticated
  }
  return useMsalIsAuthenticated()
}

export function useMsal() {
  if (import.meta.env.VITE_TEST_MODE === 'true') {
    const t = useTestAuth()
    return { instance: t.instance, accounts: t.account ? [t.account] : [] }
  }
  return useMsalReact()
}
