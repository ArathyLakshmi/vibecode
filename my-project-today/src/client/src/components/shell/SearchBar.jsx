import React, { useState } from 'react'

/**
 * SearchBar Component
 * 
 * A controlled input component for searching meeting requests.
 * Provides real-time search feedback with case-insensitive partial matching.
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

  return (
    <div className="flex-1 max-w-md mx-4">
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        data-testid="search-input"
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        aria-label="Search meeting requests"
      />
    </div>
  )
}
