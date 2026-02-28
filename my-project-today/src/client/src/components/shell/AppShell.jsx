import React from 'react'
import Header from './Header'
import Footer from './Footer'

export default function AppShell({ children, onSearchChange }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onSearchChange={onSearchChange} />
      <main className="flex-1 container mx-auto px-4 py-6" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
