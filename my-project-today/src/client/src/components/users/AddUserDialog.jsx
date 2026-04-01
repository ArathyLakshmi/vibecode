import React, { useState } from 'react'
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components'
import { Dismiss24Regular } from '@fluentui/react-icons'

/**
 * AddUserDialog - Modal dialog for creating new users (admin-only)
 * Features: Name, Email, Password fields with validation
 * Backend: POST /api/users with PasswordHasher hashing
 */
export default function AddUserDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Clear form after animation completes
      const timer = setTimeout(() => {
        setFormData({ name: '', email: '', password: '' })
        setErrors({})
        setSubmitError(null)
        setSubmitSuccess(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
    // Clear submit error
    if (submitError) {
      setSubmitError(null)
    }
  }

  // Validate form fields
  const validate = () => {
    const newErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Invalid email format'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter'
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 409) {
          // Duplicate email
          setErrors(prev => ({ ...prev, email: errorData.message || 'Email already in use' }))
          setSubmitError('A user with this email already exists')
        } else if (response.status === 400) {
          // Validation error from server
          if (errorData.field) {
            setErrors(prev => ({ ...prev, [errorData.field]: errorData.message }))
          }
          setSubmitError(errorData.message || 'Validation failed')
        } else {
          // Other errors
          setSubmitError(`Failed to create user: ${response.statusText}`)
        }
        return
      }

      // Success
      setSubmitSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error creating user:', error)
      setSubmitError('Network error: Unable to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(e, data) => !isSubmitting && data.open === false && onClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle
              action={
                <Button
                  appearance="subtle"
                  aria-label="close"
                  icon={<Dismiss24Regular />}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                />
              }
            >
              Add New User
            </DialogTitle>
            <DialogContent>
              {submitError && (
                <MessageBar intent="error" className="mb-4">
                  <MessageBarBody>{submitError}</MessageBarBody>
                </MessageBar>
              )}
              {submitSuccess && (
                <MessageBar intent="success" className="mb-4">
                  <MessageBarBody>User created successfully!</MessageBarBody>
                </MessageBar>
              )}

              <div className="space-y-4">
                {/* Name Field */}
                <Field
                  label="Name"
                  required
                  validationState={errors.name ? 'error' : 'none'}
                  validationMessage={errors.name}
                >
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter full name"
                    disabled={isSubmitting || submitSuccess}
                    autoComplete="name"
                  />
                </Field>

                {/* Email Field */}
                <Field
                  label="Email"
                  required
                  validationState={errors.email ? 'error' : 'none'}
                  validationMessage={errors.email}
                >
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="user@example.com"
                    disabled={isSubmitting || submitSuccess}
                    autoComplete="email"
                  />
                </Field>

                {/* Password Field */}
                <Field
                  label="Password"
                  required
                  validationState={errors.password ? 'error' : 'none'}
                  validationMessage={errors.password}
                  hint="At least 8 characters with uppercase, lowercase, and number"
                >
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create a strong password"
                    disabled={isSubmitting || submitSuccess}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button 
                appearance="secondary" 
                onClick={handleCancel}
                disabled={isSubmitting || submitSuccess}
              >
                Cancel
              </Button>
              <Button 
                appearance="primary" 
                type="submit"
                disabled={isSubmitting || submitSuccess}
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
