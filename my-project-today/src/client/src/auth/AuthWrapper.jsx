import React from 'react'
import { MsalProvider } from '@azure/msal-react'
import { pca } from './msalConfig'
import { TestAuthProvider } from './TestAuthProvider'

export function AuthWrapper({ children }) {
  if (import.meta.env.VITE_TEST_MODE === 'true') {
    return <TestAuthProvider>{children}</TestAuthProvider>
  }
  return <MsalProvider instance={pca}>{children}</MsalProvider>
}
