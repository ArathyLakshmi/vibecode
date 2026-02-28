import { useMsal } from '@azure/msal-react'

// Hook to read roles from the signed-in account's id token claims
export function useRoles() {
  const { accounts } = useMsal()
  const account = accounts && accounts.length > 0 ? accounts[0] : null

  const raw = account?.idTokenClaims?.roles ?? account?.idTokenClaims?.role ?? []
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

export function hasAnyRole(roles, expected) {
  if (!roles || roles.length === 0) return false
  if (!expected) return false
  const want = Array.isArray(expected) ? expected : [expected]
  return want.some(r => roles.includes(r))
}
