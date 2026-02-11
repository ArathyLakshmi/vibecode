import React from 'react'
import { useIsAuthenticated } from '@azure/msal-react'
import { useRoles, hasAnyRole } from '../auth/useRoles'

function AdminWidget() {
  return (
    <div className="p-4 bg-red-50 border rounded">
      <h3 className="font-semibold">Admin Panel</h3>
      <p className="text-sm text-gray-600">Admin controls and reports.</p>
    </div>
  )
}

function RequestorWidget() {
  return (
    <div className="p-4 bg-green-50 border rounded">
      <h3 className="font-semibold">Create / Submit</h3>
      <p className="text-sm text-gray-600">Quick actions for requestors.</p>
    </div>
  )
}

function ReviewWidget() {
  return (
    <div className="p-4 bg-blue-50 border rounded">
      <h3 className="font-semibold">Review Queue</h3>
      <p className="text-sm text-gray-600">Review items assigned to your office.</p>
    </div>
  )
}

export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated()
  const roles = useRoles()

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-white rounded shadow">Please sign in to view the dashboard.</div>
    )
  }

  return (
    <div className="p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {/* Admin widget: secadmin */}
      {hasAnyRole(roles, 'secadmin') && <AdminWidget />}

      {/* Requestor widget: requestor */}
      {hasAnyRole(roles, 'requestor') && <RequestorWidget />}

      {/* EdOffice / ManagementOffice review widgets */}
      {hasAnyRole(roles, ['EdOffice', 'ManagementOffice']) && <ReviewWidget />}

      {/* Fallback: if user has no recognized role, show a limited overview */}
      {!hasAnyRole(roles, ['secadmin','requestor','EdOffice','ManagementOffice']) && (
        <div className="p-4 border rounded bg-gray-50">
          <p className="text-sm text-gray-700">You are signed in. No special dashboard widgets are available for your account.</p>
        </div>
      )}
    </div>
  )
}
