import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '../src/index.css'
import { AuthWrapper } from './auth/AuthWrapper'
import { pca } from './auth/msalConfig'
import { BrowserRouter } from 'react-router-dom'

// Ensure redirect responses from Azure AD are processed before rendering the app.
// This lets MSAL populate account state so `useIsAuthenticated` is accurate
// immediately after a redirect sign-in. In test mode the TestAuthProvider
// is used which does not require redirect handling.
const renderApp = () => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthWrapper>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthWrapper>
    </React.StrictMode>
  )
}

if (import.meta.env.VITE_TEST_MODE === 'true') {
  console.debug('Auth: running in TEST_MODE, skipping handleRedirectPromise')
  renderApp()
} else {
  console.debug('Auth: handling redirect promise from MSAL')
  pca.handleRedirectPromise()
    .then((resp) => {
      console.debug('Auth: handleRedirectPromise resolved', { resp })
    })
    .catch((e) => {
      console.error('Auth: handleRedirectPromise error', e)
    })
    .finally(() => {
      try {
        const accounts = pca.getAllAccounts()
        console.debug('Auth: current MSAL accounts', { accounts })
      } catch (e) {
        console.error('Auth: error while reading accounts', e)
      }
      renderApp()
    })
}
