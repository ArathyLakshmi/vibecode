import React, { useState } from 'react'

/**
 * SearchBar Component
 * 
 * A controlled input component for searching meeting requests.
 * Provides real-time search feedback with case-insensitive partial matching.
 * Includes search icon and clear button for better UX.
 * 
 * @param {Object} props
 * @param {function} props.onSearchChange - Callback function that receives the search term
 * @param {string} props.placeholder - Placeholder text for the input (default: "Search meeting requests...")
 */
export default function SearchBar({ onSearchChange, placeholder = "Search meeting requests..." }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // Emit search term to parent component
    if (onSearchChange) {
      onSearchChange(value)
    }
  }

  // Handle clear button click
  const handleClear = () => {
    setSearchTerm('')
    
    // Emit empty string to parent to show all results
    if (onSearchChange) {
      onSearchChange('')
    }
  }

  return (
    <div className="flex-1 max-w-md mx-4 relative">
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" data-testid="search-icon">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Search Input */}
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        data-testid="search-input"
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        aria-label="Search meeting requests"
      />

      {/* Clear Button - only visible when there's text */}
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          data-testid="search-clear-button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
