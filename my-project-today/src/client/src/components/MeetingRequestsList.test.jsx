import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MeetingRequestsList from './MeetingRequestsList'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'

// Mock MSAL configuration
const msalConfig = {
  auth: {
    clientId: 'test-client-id',
    authority: 'https://login.microsoftonline.com/test-tenant-id',
    redirectUri: 'http://localhost'
  }
}

const pca = new PublicClientApplication(msalConfig)

// Mock user account
const mockAccount = {
  homeAccountId: 'test-home-account-id',
  environment: 'login.windows.net',
  tenantId: 'test-tenant-id',
  username: 'john.doe@example.com',
  localAccountId: 'test-local-account-id',
  name: 'John Doe'
}

// Mock fetch responses
const mockMyRequestsResponse = {
  items: [
    { id: 1, referenceNumber: 'REQ-001', title: 'My Request 1', requestorName: 'John Doe', requestorEmail: 'john.doe@example.com', status: 'Pending' },
    { id: 2, referenceNumber: 'REQ-002', title: 'My Request 2', requestorName: 'John Doe', requestorEmail: 'john.doe@example.com', status: 'Approved' }
  ],
  totalCount: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasMore: false
}

const mockAllRequestsResponse = {
  items: [
    { id: 1, referenceNumber: 'REQ-001', title: 'My Request 1', requestorName: 'John Doe', requestorEmail: 'john.doe@example.com', status: 'Pending' },
    { id: 2, referenceNumber: 'REQ-002', title: 'My Request 2', requestorName: 'John Doe', requestorEmail: 'john.doe@example.com', status: 'Approved' },
    { id: 3, referenceNumber: 'REQ-003', title: 'Other Request', requestorName: 'Jane Smith', requestorEmail: 'jane.smith@example.com', status: 'Pending' }
  ],
  totalCount: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasMore: false
}

// Helper to render component with MSAL context
function renderWithMsal(component) {
  // Mock MSAL methods
  pca.getAllAccounts = vi.fn().mockReturnValue([mockAccount])
  pca.getActiveAccount = vi.fn().mockReturnValue(mockAccount)
  
  return render(
    <MsalProvider instance={pca}>
      {component}
    </MsalProvider>
  )
}

describe('MeetingRequestsList - Requestor Filter', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  /**
   * T044: Test that component renders with "My Requests" as default filter
   */
  it('renders with "My Requests" as default filter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMyRequestsResponse
    })

    renderWithMsal(<MeetingRequestsList />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('My Requests')).toBeInTheDocument()
    })

    // Verify "My Requests" pivot item exists
    const myRequestsTab = screen.getByText('My Requests')
    expect(myRequestsTab).toBeInTheDocument()

    // Verify API was called with requestorEmail parameter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('requestorEmail=john.doe@example.com')
      )
    })
  })

  /**
   * T045: Test that toggle changes filter mode when clicked
   */
  it('toggle changes filter mode when clicked', async () => {
    // First call for "My Requests" (default)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMyRequestsResponse
    })

    renderWithMsal(<MeetingRequestsList />)

    await waitFor(() => {
      expect(screen.getByText('My Requests')).toBeInTheDocument()
    })

    // Click "All Requests" tab
    const allRequestsTab = screen.getByText('All Requests')
    
    // Second call for "All Requests"
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAllRequestsResponse
    })

    fireEvent.click(allRequestsTab)

    // Verify new API call was made without requestorEmail
    await waitFor(() => {
      const calls = global.fetch.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).not.toContain('requestorEmail')
    })
  })

  /**
   * T046: Test that API includes requestorEmail parameter for "My Requests" mode
   */
  it('includes requestorEmail parameter for "My Requests" mode', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMyRequestsResponse
    })

    renderWithMsal(<MeetingRequestsList />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('requestorEmail=john.doe@example.com')
      )
    })

    // Verify the URL includes both pagination and filter params
    const fetchUrl = global.fetch.mock.calls[0][0]
    expect(fetchUrl).toContain('page=1')
    expect(fetchUrl).toContain('pageSize=20')
    expect(fetchUrl).toContain('requestorEmail=john.doe@example.com')
  })

  /**
   * T047: Test that API omits requestorEmail parameter for "All Requests" mode
   */
  it('omits requestorEmail parameter for "All Requests" mode', async () => {
    // First load with "My Requests"
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMyRequestsResponse
    })

    renderWithMsal(<MeetingRequestsList />)

    await waitFor(() => {
      expect(screen.getByText('All Requests')).toBeInTheDocument()
    })

    // Switch to "All Requests"
    const allRequestsTab = screen.getByText('All Requests')
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAllRequestsResponse
    })

    fireEvent.click(allRequestsTab)

    await waitFor(() => {
      const calls = global.fetch.mock.calls
      expect(calls.length).toBeGreaterThan(1)
    })

    // Check last API call (should not have requestorEmail)
    const lastCallUrl = global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0]
    expect(lastCallUrl).not.toContain('requestorEmail')
    expect(lastCallUrl).toContain('page=1')
    expect(lastCallUrl).toContain('pageSize=20')
  })

  /**
   * T048: Test that pagination resets when filter changes
   */
  it('resets pagination when filter changes', async () => {
    // First load with "My Requests" on page 1
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockMyRequestsResponse, hasMore: true })
    })

    renderWithMsal(<MeetingRequestsList />)

    await waitFor(() => {
      expect(screen.getByText('My Requests')).toBeInTheDocument()
    })

    // Switch to "All Requests"
    const allRequestsTab = screen.getByText('All Requests')
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAllRequestsResponse
    })

    fireEvent.click(allRequestsTab)

    // Verify new API call starts at page 1
    await waitFor(() => {
      const calls = global.fetch.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall).toContain('page=1')
    })
  })

  /**
   * T049: Test that count display updates when filter changes
   */
  it('updates count display when filter changes', async () => {
    // First load with "My Requests" (2 items)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMyRequestsResponse
    })

    renderWithMsal(<MeetingRequestsList />)

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 2/i)).toBeInTheDocument()
    })

    // Switch to "All Requests" (3 items)
    const allRequestsTab = screen.getByText('All Requests')
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAllRequestsResponse
    })

    fireEvent.click(allRequestsTab)

    // Verify count updated to 3
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3/i)).toBeInTheDocument()
    })
  })
})
