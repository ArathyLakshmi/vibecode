import React from 'react'
import { MessageBar, MessageBarBody, Button } from '@fluentui/react-components'

/**
 * AnnouncementsErrorBoundary Component
 * Feature: 001-announcements-tab
 * 
 * Catches and handles React errors in the Announcements feature
 * Provides graceful error display with recovery option
 */
class AnnouncementsErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('AnnouncementsErrorBoundary caught error:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })
  }

  handleReset = () => {
    // Reset error state
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="max-w-2xl mx-auto mt-6 p-6">
          <MessageBar intent="error">
            <MessageBarBody>
              <p className="font-semibold">Something went wrong with the Announced Meetings feature</p>
              <p className="text-sm mt-1">
                {this.state.error?.toString() || 'An unexpected error occurred'}
              </p>
            </MessageBarBody>
          </MessageBar>
          
          <div className="mt-4 space-y-3">
            <Button 
              appearance="primary" 
              onClick={this.handleReset}
            >
              Try Again
            </Button>
            
            <Button 
              appearance="subtle" 
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </div>

          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <summary className="cursor-pointer font-semibold">Stack Trace (Dev Only)</summary>
              <pre className="mt-2 overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default AnnouncementsErrorBoundary
