import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
        <div>© {new Date().getFullYear()} Unified Board Solutions</div>
        <div className="flex gap-4 mt-2 md:mt-0">
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/terms" className="hover:underline">Terms</a>
          <span className="text-gray-400">v0.0.0</span>
        </div>
      </div>
    </footer>
  )
}
