import React from 'react'
import TopNav from './TopNav'
import SearchBar from './SearchBar'
import { useMsal, useIsAuthenticated } from '../../auth/useAuth'

export default function Header({ onSearchChange }) {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = instance.getActiveAccount()
  const userEmail = account?.username || account?.email || 'Account'

  return (
    <header role="banner" className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center rounded text-xs">UBS</div>
          <span className="font-semibold text-lg">Unified Board Solutions</span>
        </a>

        {isAuthenticated && <SearchBar onSearchChange={onSearchChange} />}

        <TopNav />

        <div className="ml-4">
          <div className="text-sm text-gray-600">{isAuthenticated ? userEmail : 'Account'}</div>
        </div>
      </div>
    </header>
  )
}
