      }, 60000) // 60 seconds
    } catch (err) {
      console.error('Error previewing attachment:', err)
      alert('Failed to preview file')
    }
  }

  // Fetch user registration status for a meeting
  const fetchUserRegistration = async (meetingId) => {
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/my-registration`)
      if (res.ok) {
        const data = await res.json()
        setUserRegistration(data.registered === false ? null : data)
      } else {
        setUserRegistration(null)
      }
    } catch (err) {
      console.error('Error fetching registration:', err)
      setUserRegistration(null)
    }
  }

  // Fetch capacity information for a meeting
  const fetchCapacityInfo = async (meetingId) => {
    setLoadingCapacity(true)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/capacity`)
      if (res.ok) {
        const data = await res.json()
        setCapacityInfo(data)
      } else {
        setCapacityInfo(null)
      }
    } catch (err) {
      console.error('Error fetching capacity:', err)
      setCapacityInfo(null)
    } finally {
      setLoadingCapacity(false)
    }
  }

  // Fetch attendee list for a meeting
  const fetchAttendees = React.useCallback(async (meetingId) => {
    setLoadingAttendees(true)
    setAttendeesError(null)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/attendees`)
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Failed to load attendees (HTTP ${res.status})`)
      }
      const data = await res.json()
      setAttendeeList(data)
    } catch (err) {
      console.error('Error fetching attendees:', err)
      setAttendeeList(null)
      setAttendeesError(err.message || 'Unable to load attendee list')
    } finally {
      setLoadingAttendees(false)
    }
  }, [])

  // Handle meeting registration
  const handleRegister = async (meetingId) => {
    setRegisteringMeeting(true)
    setRegistrationMessage(null)
    try {
      const res = await fetch(`/api/registrations/meetingrequests/${meetingId}/register`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setUserRegistration(data)
        const statusText = data.status === 'Confirmed' 
          ? 'Successfully registered!' 
          : `Added to waitlist (Position: ${data.waitlistPosition})`
        setRegistrationMessage({ type: 'success', text: statusText })
        await fetchCapacityInfo(meetingId)
        // Clear message after 5 seconds
