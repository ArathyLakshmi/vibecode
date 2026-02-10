import React from 'react'
import MeetingRequestForm from './components/MeetingRequestForm'
import MeetingRequestsList from './components/MeetingRequestsList'

export default function App() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Unified Board Solutions</h1>

        <div className="flex justify-center mb-6">
          <button onClick={() => setOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Create Meeting Request</button>
        </div>

        {/* Meeting requests list */}
        <div className="mb-6">
          <MeetingRequestsList />
        </div>

        {/* Drawer overlay */}
        <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />

        {/* Drawer panel */}
        <aside className={`fixed right-0 top-0 h-full w-full sm:w-1/2 md:w-1/3 bg-white shadow-lg transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!open}>
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Meeting Request</h2>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-900">Close</button>
          </div>
          <div className="p-4 overflow-auto h-full">
            <MeetingRequestForm />
          </div>
        </aside>
      </div>
    </div>
  )
}
