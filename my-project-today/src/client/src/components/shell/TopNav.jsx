import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { useIsAuthenticated } from '../../auth/useAuth'
import { useRoles, hasAnyRole } from '../../auth/useRoles'
import { Add24Regular, PersonAdd24Regular } from '@fluentui/react-icons'
import AddUserDialog from '../users/AddUserDialog'

const links = [
  { label: 'Home', href: '/', requiredRoles: [] },
  { label: 'My Registrations', href: '/my-registrations', requiredRoles: [] },
  { label: 'Dashboard', href: '/dashboard', requiredRoles: [] },
  { label: 'Meetings', href: '/meetings', requiredRoles: [] },
  { label: 'Voting Platform', href: '/voting-platform', requiredRoles: ['voting', 'admin', 'SECADmin'] },
  { label: 'Meeting Agenda', href: '/agenda', requiredRoles: ['SecAdmin', 'SECADmin'] },
  { label: 'Settings', href: '/settings', requiredRoles: [] },
]

export default function TopNav({ onCreateRequest }) {
  const [open, setOpen] = useState(false)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const isAuthenticated = useIsAuthenticated()
  const userRoles = useRoles()
  const location = useLocation()
  const { accounts } = useMsal()
  
  // Get current user email
  const userEmail = accounts && accounts.length > 0 ? accounts[0].username : ''

  // Debug logging
  console.log('User email:', userEmail)
  console.log('User roles:', userRoles)
  console.log('Has SECADmin?', hasAnyRole(userRoles, ['SECADmin']))

  // Only show navigation when authenticated
  if (!isAuthenticated) return null

  // Filter links based on user roles - shows link only if:
  // 1. No roles required (requiredRoles is empty array), OR
  // 2. User has at least one of the required roles (OR logic via hasAnyRole), OR
  // 3. Special case: SecAdmin-only pages for secadmin@arathylgmail.onmicrosoft.com
  const visibleLinks = links.filter(link => {
    if (link.requiredRoles.length === 0) return true
    
    // Special case for SecAdmin-only pages and specific user
    if ((link.href === '/voting-platform' || link.href === '/agenda') && userEmail === 'secadmin@arathylgmail.onmicrosoft.com') {
      return true
    }
    
    return hasAnyRole(userRoles, link.requiredRoles)
  })

  console.log('Visible links:', visibleLinks.map(l => l.label))

  // Helper to check if link is active - compares current pathname with link href
  const isActive = (href) => location.pathname === href

  // Check if user is admin
  const isAdmin = hasAnyRole(userRoles, ['secadmin', 'SECADmin'])

  return (
    <div className="bg-gray-100 border-b border-gray-200">
      <nav aria-label="Primary" className="container mx-auto px-4 py-3">
        {/* desktop */}
        <div className="hidden md:flex items-center justify-between">
          <ul className="flex gap-6">
          {visibleLinks.map(l => (
            <li key={l.href}>
              <Link 
                to={l.href} 
                className={`${
                  isActive(l.href) 
                    ? 'text-[#0078d4] border-b-2 border-[#0078d4] font-semibold' 
                    : 'text-gray-700 hover:text-[#106ebe]'
                }`}
                aria-current={isActive(l.href) ? 'page' : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
          </ul>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setShowAddUserDialog(true)} 
                className="px-4 py-2 bg-emerald-600 text-white rounded flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                aria-label="Add new user"
              >
                <PersonAdd24Regular />
                Add User
              </button>
            )}
            {onCreateRequest && (
              <button 
                onClick={onCreateRequest} 
                className="px-4 py-2 bg-[#0078d4] text-white rounded flex items-center gap-2 hover:bg-[#106ebe] transition-colors"
                aria-label="Create new meeting request"
              >
                <Add24Regular />
                Create Meeting Request
              </button>
            )}
          </div>
        </div>

        {/* mobile */}
        <div className="md:hidden flex items-center justify-between">
          <button
            aria-controls="primary-mobile"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded hover:bg-gray-200"
          >
            <svg width="24" height="24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {onCreateRequest && (
            <button 
              onClick={onCreateRequest} 
              className="px-3 py-1.5 bg-[#0078d4] text-white rounded flex items-center gap-1.5 hover:bg-[#106ebe] transition-colors text-sm"
              aria-label="Create new meeting request"
            >
              <Add24Regular className="w-5 h-5" />
              <span className="hidden sm:inline">Create Request</span>
            </button>
          )}

          <div id="primary-mobile" className={`absolute right-4 mt-2 w-48 bg-white border shadow z-50 ${open ? 'block' : 'hidden'}`}>
            <ul className="flex flex-col p-2 gap-2">
              {visibleLinks.map(l => (
                <li key={l.href}>
                  <Link 
                    to={l.href} 
                    className={`block px-2 py-1 ${
                      isActive(l.href)
                        ? 'bg-[#e6f2ff] text-[#0078d4] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={isActive(l.href) ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
      
      {/* Add User Dialog */}
      {isAdmin && (
        <AddUserDialog 
          open={showAddUserDialog} 
          onClose={() => setShowAddUserDialog(false)} 
        />
      )}
    </div>
  )
}
