import React, { useEffect } from 'react'
import { Dismiss24Regular, Edit24Regular, DismissCircle24Regular, CheckmarkCircle24Regular, CalendarCheckmark24Regular, Megaphone24Regular, Delete24Regular, DocumentBulletList24Regular } from '@fluentui/react-icons'

export default function Drawer({ isOpen, onClose, children, title = 'Details', onEdit, onCancel, onApprove, onConfirm, onAnnounce, onDelete, onViewAgenda }) {
  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <aside 
        className="fixed right-0 top-0 h-full w-full sm:w-[52%] md:w-[35.33%] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Microsoft blue theme */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-[#0078d4] text-white">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            {onViewAgenda && (
              <button 
                onClick={onViewAgenda}
                className="text-white hover:bg-indigo-600 bg-indigo-500 px-3 py-1 rounded transition-colors text-sm font-medium flex items-center gap-1"
                aria-label="View Agenda"
              >
                <DocumentBulletList24Regular />
                View Agenda
              </button>
            )}
            {onApprove && (
              <button 
                onClick={onApprove}
                className="text-white hover:bg-green-600 bg-green-500 px-3 py-1 rounded transition-colors text-sm font-medium flex items-center gap-1"
                aria-label="Approve Request"
              >
                <CheckmarkCircle24Regular />
                Approve Request
              </button>
            )}
            {onConfirm && (
              <button 
                onClick={onConfirm}
                className="text-white hover:bg-blue-600 bg-blue-500 px-3 py-1 rounded transition-colors text-sm font-medium flex items-center gap-1"
                aria-label="Confirm Request"
              >
                <CalendarCheckmark24Regular />
                Confirm Request
              </button>
            )}
            {onAnnounce && (
              <button 
                onClick={onAnnounce}
                className="text-white hover:bg-purple-600 bg-purple-500 px-3 py-1 rounded transition-colors text-sm font-medium flex items-center gap-1"
                aria-label="Announce Request"
              >
                <Megaphone24Regular />
                Announce Request
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="text-white hover:bg-red-700 bg-red-600 px-3 py-1 rounded transition-colors text-sm font-medium flex items-center gap-1"
                aria-label="Delete Draft Request"
              >
                <Delete24Regular />
                Delete Draft
              </button>
            )}
            {onCancel && (
              <button 
                onClick={onCancel}
                className="text-white hover:bg-white/20 px-3 py-1 rounded transition-colors text-sm font-medium"
                aria-label="Cancel Request"
              >
                Cancel Request
              </button>
            )}
            {onEdit && (
              <button 
                onClick={onEdit}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                aria-label="Edit"
              >
                <Edit24Regular />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              aria-label="Close details"
            >
              <Dismiss24Regular />
            </button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4 pb-8">
          {children}
        </div>
      </aside>
    </>
  )
}
