# Quickstart: Pre-registration Feature Implementation

**Feature**: Add Pre-register Button for Announced Requests  
**Branch**: `007-preregister`  
**Date**: 2026-02-14  
**Phase**: Phase 1 Design

---

## Overview

This guide provides step-by-step instructions to implement the pre-registration feature. Follow each phase in order for successful implementation.

**Estimated Total Time**: 12-15 hours  
**Skill Level**: Intermediate (C#, React, Entity Framework Core, MSAL)

---

## Prerequisites

✅ Development environment set up (Visual Studio Code, .NET 8 SDK, Node.js)  
✅ Backend server running on localhost:5000  
✅ Frontend dev server running on localhost:5173  
✅ MSAL authentication configured and working  
✅ SQLite database accessible (meetingrequests.db)  
✅ Git branch created: `git checkout -b 007-preregister`

---

## Phase 1: Database Migration (1 hour)

### Step 1.1: Create Entity Model (15 minutes)

**File**: `src/server/Models/MeetingRequestPreRegistration.cs`

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VibeCode.Server.Models
{
    public class MeetingRequestPreRegistration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MeetingRequestId { get; set; }

        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string UserName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? UserEmail { get; set; }

        [Required]
        public DateTime RegisteredAt { get; set; }

        public DateTime? CancelledAt { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Registered";

        [ForeignKey(nameof(MeetingRequestId))]
        public MeetingRequest? MeetingRequest { get; set; }
    }
}
```

**Verify**: File compiles without errors

---

### Step 1.2: Update MeetingRequest Model (10 minutes)

**File**: `src/server/Models/MeetingRequest.cs`

Add navigation property:

```csharp
public class MeetingRequest
{
    // ... existing properties

    // Add this property
    public ICollection<MeetingRequestPreRegistration> PreRegistrations { get; set; } 
        = new List<MeetingRequestPreRegistration>();
}
```

**Verify**: File compiles without errors

---

### Step 1.3: Update DbContext (15 minutes)

**File**: `src/server/Data/MeetingRequestsDbContext.cs`

Add DbSet and configure entity:

```csharp
public class MeetingRequestsDbContext : DbContext
{
    // ... existing DbSets

    // Add this DbSet
    public DbSet<MeetingRequestPreRegistration> MeetingRequestPreRegistrations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ... existing configurations

        // Add this configuration
        modelBuilder.Entity<MeetingRequestPreRegistration>(entity =>
        {
            entity.ToTable("MeetingRequestPreRegistrations");
            
            entity.HasKey(e => e.Id);
            
            entity.HasOne(p => p.MeetingRequest)
                  .WithMany(m => m.PreRegistrations)
                  .HasForeignKey(p => p.MeetingRequestId)
                  .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasIndex(e => e.MeetingRequestId)
                  .HasDatabaseName("IX_MeetingRequestPreRegistrations_MeetingRequestId");
            
            entity.HasIndex(e => new { e.MeetingRequestId, e.UserId })
                  .HasDatabaseName("IX_MeetingRequestPreRegistrations_MeetingRequestId_UserId");
            
            // Global query filter - excludes cancelled registrations by default
            entity.HasQueryFilter(p => p.CancelledAt == null);
            
            entity.Property(e => e.RegisteredAt)
                  .HasDefaultValueSql("CURRENT_TIMESTAMP");
            
            entity.Property(e => e.Status)
                  .HasDefaultValue("Registered");
        });
    }
}
```

**Verify**: Project builds successfully (`dotnet build`)

---

### Step 1.4: Generate and Apply Migration (20 minutes)

**Terminal Commands**:

```powershell
# Navigate to server directory
cd C:\Users\arath\my-project-today\src\server

# Generate migration
dotnet ef migrations add AddPreRegistration --context MeetingRequestsDbContext

# Review generated migration file (in Migrations/ folder)
# Verify it creates table with correct columns and indexes

# Apply migration to database
dotnet ef database update --context MeetingRequestsDbContext
```

**Verify Migration Success**:

```powershell
# Check table exists
sqlite3 meetingrequests.db ".schema MeetingRequestPreRegistrations"

# Should output:
# CREATE TABLE "MeetingRequestPreRegistrations" (
#   "Id" INTEGER PRIMARY KEY AUTOINCREMENT,
#   "MeetingRequestId" INTEGER NOT NULL,
#   ... etc
# );

# Check indexes
sqlite3 meetingrequests.db ".indexes MeetingRequestPreRegistrations"

# Should output both index names
```

**Checkpoint**: Database table created with correct schema ✅

---

## Phase 2: Backend API Implementation (3 hours)

### Step 2.1: Create DTOs (15 minutes)

**File**: `src/server/Models/DTOs/PreRegistrationDto.cs`

```csharp
namespace VibeCode.Server.Models.DTOs
{
    public class PreRegistrationDto
    {
        public int Id { get; set; }
        public int MeetingRequestId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime RegisteredAt { get; set; }
        public string Status { get; set; } = "Registered";
    }

    public class PreRegistrationListItemDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime RegisteredAt { get; set; }
    }
}
```

---

### Step 2.2: Update MeetingRequestDto (10 minutes)

**File**: `src/server/Models/DTOs/MeetingRequestDto.cs` (or wherever MeetingRequest DTO is defined)

Add property:

```csharp
public class MeetingRequestDto
{
    // ... existing properties

    // Add this property
    public int PreRegistrationCount { get; set; }
}
```

---

### Step 2.3: Create Helper Method for User Identity (15 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Add private helper method:

```csharp
private (string userId, string userName, string userEmail) GetUserIdentity()
{
    var userId = User.FindFirst("oid")?.Value 
        ?? User.FindFirst("sub")?.Value 
        ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? string.Empty;

    var userName = User.FindFirst("name")?.Value 
        ?? User.FindFirst(ClaimTypes.Name)?.Value 
        ?? "Unknown User";

    var userEmail = User.FindFirst("preferred_username")?.Value 
        ?? User.FindFirst("email")?.Value 
        ?? User.FindFirst("upn")?.Value 
        ?? string.Empty;

    return (userId, userName, userEmail);
}
```

---

### Step 2.4: Implement PreRegister Endpoint (45 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Add endpoint method:

```csharp
[HttpPost("{id}/preregister")]
[Authorize]
public async Task<IActionResult> PreRegister(int id)
{
    try
    {
        // Extract user identity from JWT claims
        var (userId, userName, userEmail) = GetUserIdentity();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User identity not found in token." });
        }

        // Check meeting exists and status is Announced
        var meeting = await _context.MeetingRequests
            .FirstOrDefaultAsync(m => m.Id == id);

        if (meeting == null)
        {
            return NotFound(new { message = "Meeting request not found." });
        }

        if (meeting.Status != "Announced")
        {
            return BadRequest(new { 
                message = "Pre-registration is only allowed for announced meetings.",
                currentStatus = meeting.Status 
            });
        }

        // Check for existing active registration (duplicate prevention)
        var existingRegistration = await _context.MeetingRequestPreRegistrations
            .FirstOrDefaultAsync(p => p.MeetingRequestId == id && p.UserId == userId);
            // Note: Global query filter automatically adds "AND CancelledAt IS NULL"

        if (existingRegistration != null)
        {
            return Conflict(new { message = "You are already registered for this meeting." });
        }

        // Create new registration
        var registration = new MeetingRequestPreRegistration
        {
            MeetingRequestId = id,
            UserId = userId,
            UserName = userName,
            UserEmail = userEmail,
            RegisteredAt = DateTime.UtcNow,
            CancelledAt = null,
            Status = "Registered"
        };

        _context.MeetingRequestPreRegistrations.Add(registration);
        await _context.SaveChangesAsync();

        // Map to DTO
        var registrationDto = new PreRegistrationDto
        {
            Id = registration.Id,
            MeetingRequestId = registration.MeetingRequestId,
            UserId = registration.UserId,
            UserName = registration.UserName,
            UserEmail = registration.UserEmail,
            RegisteredAt = registration.RegisteredAt,
            Status = registration.Status
        };

        return CreatedAtAction(nameof(PreRegister), new { id = registration.Id }, registrationDto);
    }
    catch (Exception ex)
    {
        // Log error
        Console.WriteLine($"Error in PreRegister: {ex.Message}");
        return StatusCode(500, new { message = "An error occurred while registering." });
    }
}
```

---

### Step 2.5: Implement CancelPreRegistration Endpoint (30 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Add endpoint method:

```csharp
[HttpDelete("{id}/preregister")]
[Authorize]
public async Task<IActionResult> CancelPreRegistration(int id)
{
    try
    {
        // Extract user ID from JWT claims
        var (userId, _, _) = GetUserIdentity();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User identity not found in token." });
        }

        // Find active registration for this user and meeting
        var registration = await _context.MeetingRequestPreRegistrations
            .FirstOrDefaultAsync(p => p.MeetingRequestId == id && p.UserId == userId);
            // Global query filter ensures only active registrations found

        if (registration == null)
        {
            return NotFound(new { message = "Active registration not found." });
        }

        // Soft-delete: Set CancelledAt and update Status
        registration.CancelledAt = DateTime.UtcNow;
        registration.Status = "Cancelled";

        await _context.SaveChangesAsync();

        return NoContent();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error in CancelPreRegistration: {ex.Message}");
        return StatusCode(500, new { message = "An error occurred while cancelling registration." });
    }
}
```

---

### Step 2.6: Implement GetPreRegistrations Endpoint (30 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Add endpoint method:

```csharp
[HttpGet("{id}/preregistrations")]
[AllowAnonymous] // Public endpoint
public async Task<IActionResult> GetPreRegistrations(int id)
{
    try
    {
        // Verify meeting exists
        var meetingExists = await _context.MeetingRequests.AnyAsync(m => m.Id == id);
        if (!meetingExists)
        {
            return NotFound(new { message = "Meeting request not found." });
        }

        // Get active registrations (global query filter excludes cancelled)
        var registrations = await _context.MeetingRequestPreRegistrations
            .Where(p => p.MeetingRequestId == id)
            .OrderByDescending(p => p.RegisteredAt) // Most recent first
            .Select(p => new PreRegistrationListItemDto
            {
                Id = p.Id,
                UserName = p.UserName,
                UserEmail = p.UserEmail,
                RegisteredAt = p.RegisteredAt
            })
            .ToListAsync();

        return Ok(registrations);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error in GetPreRegistrations: {ex.Message}");
        return StatusCode(500, new { message = "An error occurred while loading registrations." });
    }
}
```

---

### Step 2.7: Update List Endpoint to Include Count (20 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Find the `List` endpoint method and add `PreRegistrationCount` to the DTO projection:

```csharp
[HttpGet]
public async Task<IActionResult> List(/* parameters */)
{
    // ... existing query logic

    var meetings = await query
        .Select(m => new // or MeetingRequestDto
        {
            Id = m.Id,
            Title = m.Title,
            // ... all existing properties
            
            // Add this property
            PreRegistrationCount = m.PreRegistrations.Count()
            // Global query filter automatically counts only active registrations
        })
        .ToListAsync();

    return Ok(meetings);
}
```

---

### Step 2.8: Update GetById Endpoint to Include Count (15 minutes)

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Find the `GetById` endpoint and add count:

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetById(int id)
{
    var meeting = await _context.MeetingRequests
        .Where(m => m.Id == id)
        .Select(m => new // or MeetingRequestDto
        {
            Id = m.Id,
            // ... all existing properties
            
            // Add this property
            PreRegistrationCount = m.PreRegistrations.Count()
        })
        .FirstOrDefaultAsync();

    if (meeting == null)
    {
        return NotFound();
    }

    return Ok(meeting);
}
```

---

### Step 2.9: Test Backend Endpoints (30 minutes)

**Using Postman or similar tool**:

**Test 1: Create Meeting (if needed)**
```http
POST http://localhost:5000/api/meetingrequests
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json

{
  "title": "Test Meeting for Pre-registration",
  "status": "Announced",
  "description": "Testing pre-registration feature"
}
```

**Test 2: Pre-register**
```http
POST http://localhost:5000/api/meetingrequests/1/preregister
Authorization: Bearer <YOUR_TOKEN>
```
Expected: 201 Created with registration object

**Test 3: Pre-register again (duplicate)**
```http
POST http://localhost:5000/api/meetingrequests/1/preregister
Authorization: Bearer <YOUR_TOKEN>
```
Expected: 409 Conflict

**Test 4: Get registrations**
```http
GET http://localhost:5000/api/meetingrequests/1/preregistrations
```
Expected: 200 OK with array containing your registration

**Test 5: Cancel registration**
```http
DELETE http://localhost:5000/api/meetingrequests/1/preregister
Authorization: Bearer <YOUR_TOKEN>
```
Expected: 204 No Content

**Test 6: Verify count in meeting details**
```http
GET http://localhost:5000/api/meetingrequests/1
```
Expected: 200 OK with `preRegistrationCount: 0` (after cancellation)

**Checkpoint**: All backend endpoints working correctly ✅

---

## Phase 3: Frontend Components (4 hours)

### Step 3.1: Create PreRegistrationList Component (1 hour)

**File**: `src/client/src/components/PreRegistrationList.jsx`

```jsx
import { useState, useEffect } from 'react';
import { 
    List, 
    ListItem, 
    Avatar, 
    Text, 
    Spinner,
    makeStyles 
} from '@fluentui/react-components';

const useStyles = makeStyles({
    container: {
        marginTop: '24px'
    },
    header: {
        marginBottom: '12px'
    },
    listContainer: {
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '8px'
    },
    listItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 8px',
        gap: '12px'
    },
    userInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    emptyState: {
        padding: '24px',
        textAlign: 'center',
        color: '#666'
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

export default function PreRegistrationList({ meetingId, count }) {
    const styles = useStyles();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadRegistrations() {
            setLoading(true);
            setError(null);
            
            try {
                const response = await fetch(`/api/meetingrequests/${meetingId}/preregistrations`);
                
                if (!response.ok) {
                    throw new Error('Failed to load registrations');
                }
                
                const data = await response.json();
                setRegistrations(data);
            } catch (err) {
                console.error('Failed to load registrations:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (meetingId) {
            loadRegistrations();
        }
    }, [meetingId, count]); // Reload when count changes

    if (loading) {
        return <Spinner label="Loading registrations..." />;
    }

    if (error) {
        return <Text>Failed to load registrations</Text>;
    }

    if (registrations.length === 0) {
        return (
            <div className={styles.container}>
                <Text weight="semibold" className={styles.header}>
                    Pre-registered Attendees (0)
                </Text>
                <div className={styles.emptyState}>
                    <Text>No registrations yet. Be the first to register!</Text>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Text weight="semibold" className={styles.header}>
                Pre-registered Attendees ({registrations.length})
            </Text>
            <List 
                className={styles.listContainer}
                aria-label="Pre-registered attendees"
            >
                {registrations.map(reg => (
                    <ListItem 
                        key={reg.id} 
                        className={styles.listItem}
                        aria-label={`${reg.userName} registered on ${formatDate(reg.registeredAt)}`}
                    >
                        <Avatar 
                            name={reg.userName} 
                            size={32} 
                            color="colorful"
                        />
                        <div className={styles.userInfo}>
                            <Text weight="semibold">{reg.userName}</Text>
                            <Text size={200} style={{ color: '#666' }}>
                                Registered {formatDate(reg.registeredAt)}
                            </Text>
                        </div>
                    </ListItem>
                ))}
            </List>
        </div>
    );
}
```

---

### Step 3.2: Update MeetingRequestCard Component (30 minutes)

**File**: `src/client/src/components/MeetingRequestCard.jsx`

Add count badge:

```jsx
import { Badge } from '@fluentui/react-components';

function MeetingRequestCard({ meeting, onClick }) {
    return (
        <div onClick={onClick} /* ... existing styles */>
            <h3>{meeting.title}</h3>
            
            {/* Existing status badge */}
            <Badge>{meeting.status}</Badge>
            
            {/* Add pre-registration count badge */}
            {meeting.preRegistrationCount > 0 && (
                <Badge 
                    appearance="filled" 
                    color="informative"
                    aria-label={`${meeting.preRegistrationCount} users pre-registered for this meeting`}
                    style={{ marginLeft: '8px' }}
                >
                    {meeting.preRegistrationCount} pre-registered
                </Badge>
            )}
            
            {/* ... rest of card content */}
        </div>
    );
}
```

**Verify**: Badge appears on cards with registrations

---

### Step 3.3: Update MeetingRequestDetail Component (2.5 hours)

**File**: `src/client/src/components/MeetingRequestDetail.jsx`

Add pre-register functionality:

```jsx
import { useState, useEffect } from 'react';
import { Button, MessageBar, makeStyles } from '@fluentui/react-components';
import { CheckmarkCircle20Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import PreRegistrationList from './PreRegistrationList';

const useStyles = makeStyles({
    preRegisterSection: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    errorMessage: {
        marginTop: '12px'
    }
});

function MeetingRequestDetail({ meeting }) {
    const styles = useStyles();
    const { instance, accounts } = useMsal();
    
    const [isRegistered, setIsRegistered] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationCount, setRegistrationCount] = useState(meeting.preRegistrationCount || 0);
    const [error, setError] = useState(null);
    
    const isAuthenticated = accounts.length > 0;
    const userId = accounts[0]?.localAccountId;

    // Check if current user is registered
    useEffect(() => {
        async function checkRegistrationStatus() {
            if (!userId || !meeting.id) return;
            
            try {
                const response = await fetch(`/api/meetingrequests/${meeting.id}/preregistrations`);
                const registrations = await response.json();
                
                // Check if current user is in the list
                const userRegistration = registrations.find(r => r.userId === userId);
                setIsRegistered(!!userRegistration);
            } catch (err) {
                console.error('Failed to check registration status:', err);
            }
        }
        
        if (meeting.status === 'Announced') {
            checkRegistrationStatus();
        }
    }, [meeting.id, meeting.status, userId]);

    const getAccessToken = async () => {
        try {
            const request = {
                scopes: ["api://your-api-client-id/access_as_user"],
                account: accounts[0]
            };
            const response = await instance.acquireTokenSilent(request);
            return response.accessToken;
        } catch (error) {
            console.error('Failed to acquire token:', error);
            return null;
        }
    };

    const handlePreRegister = async () => {
        setError(null);
        
        // Optimistic update
        setIsRegistered(true);
        setRegistrationCount(prev => prev + 1);
        setIsRegistering(true);
        
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                throw new Error('Failed to get access token');
            }
            
            const response = await fetch(`/api/meetingrequests/${meeting.id}/preregister`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to register');
            }
            
            // Success - UI already updated
        } catch (err) {
            console.error('Pre-registration failed:', err);
            
            // Rollback optimistic update
            setIsRegistered(false);
            setRegistrationCount(prev => prev - 1);
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setIsRegistering(false);
        }
    };

    const handleCancelRegistration = async () => {
        setError(null);
        
        // Optimistic update
        setIsRegistered(false);
        setRegistrationCount(prev => prev - 1);
        setIsRegistering(true);
        
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                throw new Error('Failed to get access token');
            }
            
            const response = await fetch(`/api/meetingrequests/${meeting.id}/preregister`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cancel registration');
            }
            
            // Success - UI already updated
        } catch (err) {
            console.error('Cancel registration failed:', err);
            
            // Rollback optimistic update
            setIsRegistered(true);
            setRegistrationCount(prev => prev + 1);
            setError(err.message || 'Failed to cancel registration. Please try again.');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div>
            {/* Existing meeting details */}
            <h1>{meeting.title}</h1>
            <p>{meeting.description}</p>
            {/* ... other details */}

            {/* Pre-register section - only for Announced meetings */}
            {meeting.status === 'Announced' && (
                <div className={styles.preRegisterSection}>
                    <div className={styles.buttonGroup}>
                        {!isRegistered ? (
                            <Button 
                                appearance="primary"
                                onClick={handlePreRegister}
                                disabled={!isAuthenticated || isRegistering}
                                aria-label="Pre-register for this meeting"
                            >
                                {isRegistering ? 'Registering...' : 'Pre-register'}
                            </Button>
                        ) : (
                            <>
                                <Button 
                                    appearance="outline"
                                    disabled
                                    icon={<CheckmarkCircle20Regular />}
                                    aria-pressed="true"
                                >
                                    Registered
                                </Button>
                                <Button 
                                    appearance="subtle"
                                    onClick={handleCancelRegistration}
                                    disabled={isRegistering}
                                    aria-label="Cancel your registration"
                                >
                                    Cancel Registration
                                </Button>
                            </>
                        )}
                    </div>

                    {error && (
                        <MessageBar 
                            intent="error" 
                            className={styles.errorMessage}
                        >
                            {error}
                        </MessageBar>
                    )}

                    <PreRegistrationList 
                        meetingId={meeting.id} 
                        count={registrationCount}
                    />
                </div>
            )}
        </div>
    );
}

export default MeetingRequestDetail;
```

**Important**: Update the `scopes` array with your actual API client ID from Azure AD app registration.

---

### Step 3.4: Test Frontend Integration (30 minutes)

**Manual Testing Checklist**:

1. **Button Visibility**:
   - ✅ Button shows only for "Announced" meetings
   - ✅ Button hidden for other statuses (Draft, Pending, etc.)

2. **Pre-register Flow**:
   - ✅ Click "Pre-register" button
   - ✅ Button immediately changes to "Registered"
   - ✅ Count increments
   - ✅ Your name appears in registrations list

3. **Cancel Flow**:
   - ✅ Click "Cancel Registration"
   - ✅ Button returns to "Pre-register"
   - ✅ Count decrements
   - ✅ Your name removed from list

4. **Error Handling**:
   - ✅ Disable network → click button → see error message
   - ✅ Error message displayed below button
   - ✅ UI rollback on error

5. **Count Badge**:
   - ✅ Badge shows on meeting cards with registrations
   - ✅ Count updates after registration/cancellation

**Checkpoint**: Frontend working end-to-end ✅

---

## Phase 4: Testing (3-4 hours)

### Step 4.1: Backend Unit Tests (create if needed)

**File**: `src/server/Tests/PreRegistrationControllerTests.cs`

[For brevity, see contracts/README.md for full test examples]

Key tests:
- Pre-register creates registration (201)
- Duplicate registration returns 409
- Cancel registration soft-deletes (204)
- Get registrations returns active only
- Meeting not found returns 404

---

### Step 4.2: Frontend Component Tests (30 minutes)

**File**: `src/client/src/components/PreRegistrationList.test.jsx`

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import PreRegistrationList from './PreRegistrationList';

test('displays registrations list', async () => {
    // Mock API response
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
                { id: 1, userName: 'John Doe', registeredAt: '2026-02-14T10:00:00Z' }
            ])
        })
    );

    render(<PreRegistrationList meetingId={1} count={1} />);

    await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
});
```

---

### Step 4.3: E2E Tests with Playwright (2 hours)

**File**: `src/client/e2e/tests/preregister.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Pre-registration Feature', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/');
        // ... authentication steps
    });

    test('user can pre-register for announced meeting', async ({ page }) => {
        // Navigate to announced meeting
        await page.goto('/meetings');
        await page.click('text=/Announced/');
        await page.click('button:has-text("View Details")');

        // Pre-register
        await page.click('button:has-text("Pre-register")');

        // Verify UI updated
        await expect(page.locator('button:has-text("Registered")')).toBeVisible();
        await expect(page.locator('text=/1 pre-registered/')).toBeVisible();
    });

    test('user can cancel registration', async ({ page }) => {
        // Pre-register first
        await page.goto(`/meetings/${testMeetingId}`);
        await page.click('button:has-text("Pre-register")');
        await expect(page.locator('button:has-text("Registered")')).toBeVisible();

        // Cancel
        await page.click('button:has-text("Cancel Registration")');

        // Verify UI updated
        await expect(page.locator('button:has-text("Pre-register")')).toBeVisible();
    });

    test('button only visible for Announced status', async ({ page }) => {
        // Test Draft meeting
        await page.goto('/meetings?status=Draft');
        await page.click('.meeting-card:first-child');
        await expect(page.locator('button:has-text("Pre-register")')).not.toBeVisible();
    });
});
```

---

## Phase 5: Deployment (1 hour)

### Step 5.1: Pre-deployment Checklist

- ✅ All tests passing (backend + frontend + E2E)
- ✅ Migration file committed to Git
- ✅ Environment variables configured (if any)
- ✅ Database backup created
- ✅ Code reviewed and approved

---

### Step 5.2: Deploy to Staging/Production

**Deploy Backend**:
```powershell
# Apply migration to production database
dotnet ef database update --context MeetingRequestsDbContext --connection "YourProductionConnectionString"

# Deploy updated backend
# (deployment method depends on your infrastructure)
```

**Deploy Frontend**:
```powershell
cd src/client
npm run build
# Deploy build/ folder to hosting service
```

---

### Step 5.3: Smoke Testing

**Post-Deployment Verification**:
1. ✅ Access application URL
2. ✅ Login with test account
3. ✅ Navigate to announced meeting
4. ✅ Pre-register successfully
5. ✅ Verify count updates
6. ✅ Cancel registration
7. ✅ Check database for correct records

---

## Troubleshooting

### Issue: Migration fails with "table already exists"

**Solution**: 
```powershell
# Remove last migration
dotnet ef migrations remove

# Regenerate
dotnet ef migrations add AddPreRegistration
```

---

### Issue: 401 Unauthorized on API calls

**Solution**: 
- Verify JWT token in browser DevTools Network tab
- Check API client ID in MSAL configuration matches Azure AD app
- Verify scopes in `getAccessToken()` method

---

### Issue: Count not updating after registration

**Solution**:
- Check browser console for errors
- Verify `preRegistrationCount` passed to PreRegistrationList component
- Ensure `count` dependency in useEffect is correct

---

### Issue: Duplicate registrations bypass validation

**Solution**:
- Check global query filter is configured in DbContext
- Verify duplicate check query includes userId comparison
- Test with database query to confirm active registrations

---

## Additional Resources

- [Entity Framework Core Documentation](https://docs.microsoft.com/en-us/ef/core/)
- [Fluent UI Components](https://react.fluentui.dev/)
- [MSAL React Guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)
- [Playwright Testing](https://playwright.dev/docs/intro)

---

**Implementation Complete** ✅  
**Estimated Time**: 12-15 hours  
**Branch Ready for**: Code review and merge to main

---

## Quick Reference Commands

```powershell
# Backend
cd src/server
dotnet build
dotnet ef database update
dotnet run

# Frontend
cd src/client
npm install
npm run dev

# Testing
dotnet test                    # Backend tests
npm test                       # Frontend tests
npx playwright test           # E2E tests

# Migration
dotnet ef migrations add AddPreRegistration
dotnet ef database update
dotnet ef migrations remove    # If needed
```
