import React from 'react'

const TestAuthContext = React.createContext(null)

export function TestAuthProvider({ children }) {
  // Default to an authenticated test user so E2E tests don't need to
  // perform an explicit login. Tests can still call loginPopup/loginRedirect
  // to simulate interactive sign-in flows if desired.
  const defaultAccount = { username: 'test.user@local', name: 'Test User' }
  const [isAuthenticated, setIsAuthenticated] = React.useState(true)
  const [account, setAccount] = React.useState(defaultAccount)

  const loginPopup = async () => {
    console.debug('TestAuthProvider: loginPopup invoked')
    // simulate user signing in
    const acct = defaultAccount
    console.debug('TestAuthProvider: setting account', acct)
    setAccount(acct)
    setIsAuthenticated(true)
    console.debug('TestAuthProvider: loginPopup completed, isAuthenticated=true')
    return { account: acct }
  }

  const loginRedirect = async () => {
    console.debug('TestAuthProvider: loginRedirect invoked')
    // simulate redirect sign-in by setting state and returning a resolved promise
    const acct = defaultAccount
    console.debug('TestAuthProvider: setting account', acct)
    setAccount(acct)
    setIsAuthenticated(true)
    console.debug('TestAuthProvider: loginRedirect completed, isAuthenticated=true')
    return { account: acct }
  }

  const logoutPopup = async () => {
    console.debug('TestAuthProvider: logoutPopup invoked')
    setAccount(null)
    setIsAuthenticated(false)
    console.debug('TestAuthProvider: logoutPopup completed, isAuthenticated=false')
    return {}
  }

  const value = {
    isAuthenticated,
    account,
    instance: { loginPopup, loginRedirect, logoutPopup, setActiveAccount: (acct) => {
      console.debug('TestAuthProvider: setActiveAccount called', acct)
      setAccount(acct)
    } }
  }

  return <TestAuthContext.Provider value={value}>{children}</TestAuthContext.Provider>
}

export function useTestAuth() {
  const ctx = React.useContext(TestAuthContext)
  if (!ctx) throw new Error('useTestAuth must be used within TestAuthProvider')
  return ctx
}
