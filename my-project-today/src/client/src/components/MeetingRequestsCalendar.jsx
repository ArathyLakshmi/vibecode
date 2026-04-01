import React, { useState, useEffect, useMemo } from 'react'
import { useMsal } from '@azure/msal-react'
import { useRoles, hasAnyRole } from '../auth/useRoles'
import useAdvancedSearch from '../hooks/useAdvancedSearch'
import AdvancedSearchPanel from './search/AdvancedSearchPanel'
import FilterChip from './search/FilterChip'
import { getAuthHeaders } from '../services/authService'
import {
  FluentProvider,
  Button,
  Spinner,
  Badge,
  TabList,
  Tab
} from '@fluentui/react-components'
import { accessibleTheme } from '../theme/accessibleTheme'
import { 
  ChevronLeft24Regular, 
  ChevronRight24Regular,
  DocumentBulletList24Regular, 
  Clock24Regular, 
  CheckmarkCircle24Regular, 
  CalendarCheckmark24Regular, 
  Megaphone24Regular,
  DismissCircle24Regular,
  Person20Regular,
  Filter24Regular
} from '@fluentui/react-icons'

// Status badge helper
function getStatusBadge(status) {
  const normalizedStatus = String(status || 'draft').toLowerCase()
  
  const statusConfig = {
    draft: { icon: DocumentBulletList24Regular, color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Draft' },
    pending: { icon: Clock24Regular, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pending' },
    approved: { icon: CheckmarkCircle24Regular, color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Approved' },
    confirmed: { icon: CalendarCheckmark24Regular, color: 'bg-green-100 text-green-700 border-green-300', label: 'Confirmed' },
    announced: { icon: Megaphone24Regular, color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Announced' },
    cancelled: { icon: DismissCircle24Regular, color: 'bg-red-100 text-red-700 border-red-300', label: 'Cancelled' }
  }
  
  const config = statusConfig[normalizedStatus] || statusConfig.draft
  const Icon = config.icon
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  )
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'No date'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateString
  }
}

// Get days in month
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Get first day of month (0 = Sunday, 6 = Saturday)
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

// Normalize status strings
function normalizeStatus(rawStatus) {
  const status = String(rawStatus || 'draft').trim().toLowerCase()
  if (status === 'pending approval' || status === 'pending-approval') return 'pending'
  if (status === 'canceled' || status === 'cancelled') return 'cancelled'
  if (status === 'published') return 'announced'
  return status
}

export default function MeetingRequestsCalendar({ searchTerm = '', refreshTrigger = 0, onEdit = null, filterMode = 'all-requests', onFilterModeChange = null, viewMode = 'calendar', onViewModeChange = null }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const { accounts } = useMsal()
  const userRoles = useRoles()
  
  // Advanced search hook
  const advancedSearch = useAdvancedSearch({
    initialFilters: {},
    autoSearch: false,
  })
  
  const userName = useMemo(() => {
    return accounts && accounts.length > 0 ? (accounts[0].name || accounts[0].username) : ''
  }, [accounts])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  
  // Month and year display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  
  // Fetch all meetings for the calendar
  useEffect(() => {
    let cancelled = false
    
    async function fetchMeetings() {
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '1000' })
        if (filterMode === 'my-requests' && userName) {
          params.append('requestor', userName)
        }
        
        // Add advanced search filters
        if (advancedSearch.filters.category) params.append('category', advancedSearch.filters.category)
        if (advancedSearch.filters.subcategory) params.append('subcategory', advancedSearch.filters.subcategory)
        if (advancedSearch.filters.status) params.append('status', advancedSearch.filters.status)
        if (advancedSearch.filters.classification) params.append('classification', advancedSearch.filters.classification)
        if (advancedSearch.filters.requestor) params.append('requestor', advancedSearch.filters.requestor)
        if (advancedSearch.filters.startDate) params.append('startDate', advancedSearch.filters.startDate)
        if (advancedSearch.filters.endDate) params.append('endDate', advancedSearch.filters.endDate)
        if (advancedSearch.filters.query) params.append('query', advancedSearch.filters.query)
        
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/meetingrequests?${params}`, { headers })
        if (!response.ok) throw new Error('Failed to fetch meetings')
        
        const data = await response.json()
        const items = data.results || data.items || data.value || (Array.isArray(data) ? data : [])
        
        if (!cancelled) {
          setMeetings(items)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchMeetings()
    
    return () => {
      cancelled = true
    }
  }, [refreshTrigger, filterMode, userName, advancedSearch.filters])
  
  // Filter meetings by status
  const filteredMeetings = useMemo(() => {
    if (!statusFilter) return meetings
    return meetings.filter(meeting => {
      const itemStatus = normalizeStatus(meeting.status || meeting.Status)
      return itemStatus === statusFilter
    })
  }, [meetings, statusFilter])
  
  // Count meetings by status for summary
  const statusCounts = useMemo(() => {
    const counts = {
      draft: 0,
      pending: 0,
      approved: 0,
      confirmed: 0,
      announced: 0,
      cancelled: 0
    }
    
    filteredMeetings.forEach(meeting => {
      const status = normalizeStatus(meeting.status || meeting.Status)
      if (counts.hasOwnProperty(status)) {
        counts[status]++
      }
    })
    
    return counts
  }, [filteredMeetings])
  
  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map = new Map()
    
    filteredMeetings.forEach(meeting => {
      const dateStr = meeting.meetingDate || meeting.MeetingDate
      if (!dateStr) return
      
      // Check if meeting matches search term
      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const searchableFields = [
          meeting.referenceNumber,
          meeting.requestorName,
          meeting.title,
          meeting.country,
          meeting.requestType
        ]
        
        const matches = searchableFields.some(field => 
          String(field || '').toLowerCase().includes(query)
        )
        
        if (!matches) return
      }
      
      try {
        const date = new Date(dateStr)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key).push(meeting)
      } catch (err) {
        console.error('Invalid date:', dateStr)
      }
    })
    
    return map
  }, [filteredMeetings, searchTerm])
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days = []
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ isEmpty: true, key: `empty-${i}` })
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${currentMonth}-${day}`
      const dayMeetings = meetingsByDate.get(dateKey) || []
      
      days.push({
        day,
        date: new Date(currentYear, currentMonth, day),
        meetings: dayMeetings,
        key: dateKey
      })
    }
    
    return days
  }, [currentYear, currentMonth, meetingsByDate])
  
  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner label="Loading calendar..." />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading calendar</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }
  
  return (
    <FluentProvider theme={accessibleTheme}>
      {/* Welcome banner */}
      <div
        className="mb-6 relative overflow-hidden rounded-xl border border-gray-200 shadow-md"
        style={{
          backgroundImage: 'url("/banner-welcome.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-white/25" aria-hidden="true" />
        <div className="relative px-6 py-8 text-[#035c73]">
          <p className="text-sm uppercase tracking-[0.15em] font-semibold text-[#046f8b]">Welcome</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight">Meeting Requests Management</h2>
          <p className="mt-2 text-sm text-[#046f8b] max-w-2xl">View and manage your meeting requests in list or calendar format. Use filters to find what you need.</p>
        </div>
      </div>

      {/* View mode toggle and Advanced Search button */}
      <div className="mb-4 flex justify-between items-center">
        <Button
          appearance="outline"
          icon={<Filter24Regular />}
          onClick={advancedSearch.openSearchPanel}
          data-testid="advanced-search-button"
        >
          Advanced Search
        </Button>
        
        <div className="flex gap-2">
          <Button
            appearance={viewMode === 'list' ? 'primary' : 'subtle'}
            icon={<DocumentBulletList24Regular />}
            onClick={() => onViewModeChange && onViewModeChange('list')}
          >
            List View
          </Button>
          <Button
            appearance={viewMode === 'calendar' ? 'primary' : 'subtle'}
            icon={<CalendarCheckmark24Regular />}
            onClick={() => onViewModeChange && onViewModeChange('calendar')}
          >
            Calendar View
          </Button>
        </div>
      </div>

      {/* Advanced Search Panel */}
      <AdvancedSearchPanel
        isOpen={advancedSearch.isSearchPanelOpen}
        onDismiss={advancedSearch.closeSearchPanel}
        onApplyFilters={advancedSearch.applyFilters}
        initialFilters={advancedSearch.filters}
      />

      {/* Active Filter Chips */}
      {advancedSearch.hasActiveFilters() && (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Active Filters</h3>
            <Button
              appearance="subtle"
              size="small"
              onClick={advancedSearch.clearFilters}
              data-testid="clear-all-filters-button"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {advancedSearch.filters.category && (
              <FilterChip
                label="Category"
                value={advancedSearch.filters.category}
                onRemove={() => advancedSearch.removeFilter('category')}
                testId="filter-chip-category"
              />
            )}
            {advancedSearch.filters.subcategory && (
              <FilterChip
                label="Subcategory"
                value={advancedSearch.filters.subcategory}
                onRemove={() => advancedSearch.removeFilter('subcategory')}
                testId="filter-chip-subcategory"
              />
            )}
            {advancedSearch.filters.status && (
              <FilterChip
                label="Status"
                value={advancedSearch.filters.status}
                onRemove={() => advancedSearch.removeFilter('status')}
                testId="filter-chip-status"
              />
            )}
            {advancedSearch.filters.classification && (
              <FilterChip
                label="Classification"
                value={advancedSearch.filters.classification}
                onRemove={() => advancedSearch.removeFilter('classification')}
                testId="filter-chip-classification"
              />
            )}
            {advancedSearch.filters.requestor && (
              <FilterChip
                label="Requestor"
                value={advancedSearch.filters.requestor}
                onRemove={() => advancedSearch.removeFilter('requestor')}
                testId="filter-chip-requestor"
              />
            )}
            {advancedSearch.filters.startDate && (
              <FilterChip
                label="Start Date"
                value={new Date(advancedSearch.filters.startDate).toLocaleDateString()}
                onRemove={() => advancedSearch.removeFilter('startDate')}
                testId="filter-chip-startDate"
              />
            )}
            {advancedSearch.filters.endDate && (
              <FilterChip
                label="End Date"
                value={new Date(advancedSearch.filters.endDate).toLocaleDateString()}
                onRemove={() => advancedSearch.removeFilter('endDate')}
                testId="filter-chip-endDate"
              />
            )}
            {advancedSearch.filters.query && (
              <FilterChip
                label="Query"
                value={advancedSearch.filters.query}
                onRemove={() => advancedSearch.removeFilter('query')}
                testId="filter-chip-query"
              />
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Filter Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900">Filters</h3>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="text-sm text-[#0078d4] hover:text-[#106ebe] font-medium transition-colors"
                >
                  Clear status filter
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">Show</span>
              <TabList
                selectedValue={filterMode}
                onTabSelect={(event, data) => {
                  if (onFilterModeChange) {
                    onFilterModeChange(data.value)
                  }
                }}
                size="medium"
                appearance="subtle"
              >
                <Tab 
                  value="my-requests"
                  icon={<Person20Regular />}
                >
                  My Requests
                </Tab>
                <Tab 
                  value="all-requests"
                  icon={<DocumentBulletList24Regular />}
                >
                  All Requests
                </Tab>
              </TabList>
            </div>
          </div>
          
          {/* Status filter badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([key, count]) => {
              const statusConfig = {
                draft: { icon: DocumentBulletList24Regular, color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Draft' },
                pending: { icon: Clock24Regular, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pending' },
                approved: { icon: CheckmarkCircle24Regular, color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Approved' },
                confirmed: { icon: CalendarCheckmark24Regular, color: 'bg-green-100 text-green-700 border-green-300', label: 'Confirmed' },
                announced: { icon: Megaphone24Regular, color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Announced' },
                cancelled: { icon: DismissCircle24Regular, color: 'bg-red-100 text-red-700 border-red-300', label: 'Cancelled' }
              }
              
              const config = statusConfig[key]
              const Icon = config.icon
              const isActive = statusFilter === key
              
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(isActive ? null : key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${
                    isActive 
                      ? 'ring-2 ring-[#0078d4] ring-offset-1 ' + config.color 
                      : 'hover:shadow-sm ' + config.color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs font-bold">{count}</span>
                </button>
              )
            })}
          </div>
          
          {/* Info banner showing current filter mode */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#e6f2ff] border border-[#0078d4] rounded-lg">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#0078d4]"></div>
            <span className="text-xs text-[#0078d4] font-semibold">
              {filterMode === 'my-requests' 
                ? (userName 
                  ? `Showing your requests (${userName})` 
                  : 'Sign in to view your requests')
                : 'Showing all team requests'}
            </span>
          </div>
        </div>
        
        {/* Calendar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <Button 
              appearance="subtle" 
              size="small"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              appearance="subtle" 
              icon={<ChevronLeft24Regular />}
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            />
            <Button 
              appearance="subtle" 
              icon={<ChevronRight24Regular />}
              onClick={goToNextMonth}
              aria-label="Next month"
            />
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(dayData => {
              if (dayData.isEmpty) {
                return <div key={dayData.key} className="aspect-square" />
              }
              
              const isTodayDate = isToday(dayData.date)
              
              return (
                <div 
                  key={dayData.key}
                  className={`aspect-square border rounded-lg p-2 overflow-hidden hover:bg-gray-50 transition-colors ${
                    isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isTodayDate ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {dayData.day}
                  </div>
                  
                  {dayData.meetings.length > 0 && (
                    <div className="space-y-1">
                      {dayData.meetings.slice(0, 3).map((meeting, idx) => (
                        <div
                          key={meeting.id || idx}
                          onClick={() => onEdit && onEdit(meeting)}
                          className="text-xs bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-indigo-200 transition-colors"
                          title={`${meeting.title || 'Untitled'} - ${meeting.requestorName || 'Unknown'}`}
                        >
                          {meeting.title || 'Untitled'}
                        </div>
                      ))}
                      
                      {dayData.meetings.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayData.meetings.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-50"></div>
              <span className="text-gray-700">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-100"></div>
              <span className="text-gray-700">Has meetings</span>
            </div>
          </div>
        </div>
      </div>
    </FluentProvider>
  )
}
