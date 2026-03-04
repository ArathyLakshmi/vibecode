import React from 'react'
import Header from './Header'
import TopNav from './TopNav'
import Footer from './Footer'

export default function AppShell({ children, onSearchChange, onCreateRequest }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearchChange={onSearchChange} />
      <TopNav onCreateRequest={onCreateRequest} />
      <main className="flex-1 container mx-auto px-4 py-6" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
