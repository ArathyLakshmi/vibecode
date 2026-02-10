import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '../src/index.css'
import { MsalProvider } from '@azure/msal-react'
import { pca } from './auth/msalConfig'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MsalProvider instance={pca}>
      <App />
    </MsalProvider>
  </React.StrictMode>
)
