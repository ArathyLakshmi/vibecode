# Quick Start Guide: Meeting Registration & Attendance

**Feature**: 009-meeting-registration  
**Audience**: Developers implementing this feature  
**Last Updated**: February 28, 2026

## Overview

This guide provides step-by-step instructions to implement the meeting registration feature from scratch. Follow these steps in order for fastest path to working feature.

## Prerequisites

### Environment Setup
```bash
# Verify tools installed
dotnet --version  # Should be 8.0 or higher
node --version    # Should be 18.0 or higher
npm --version     # Should be 9.0 or higher

# Verify project builds
cd src/server
dotnet build
cd ../client
npm install
npm run build
```

### Knowledge Requirements
- ✅ C# and Entity Framework Core basics
- ✅ React and React Hooks
- ✅ REST API concepts
- ✅ SQL and database migrations
- ✅ Fluent UI component library

## Step-by-Step Implementation

### Step 1: Create Database Entities (15 minutes)

**Backend - Create Model**

```bash
cd src/server/Models
```

Create `MeetingRegistration.cs`:

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VibeCode.Server.Models
{
    public class MeetingRegistration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MeetingRequestId { get; set; }

        [Required]
        [MaxLength(255)]
        public string UserEmail { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        public DateTime RegistrationDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Confirmed";

        public int? WaitlistPosition { get; set; }
        public DateTime? CancellationDate { get; set; }

        [MaxLength(1000)]
        public string? CancellationReason { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [ForeignKey(nameof(MeetingRequestId))]
        public virtual MeetingRequest? MeetingRequest { get; set; }
    }
}
```

**Update MeetingRequest Model**

Open `src/server/Models/MeetingRequest.cs`, add properties:

```csharp
// Add to existing MeetingRequest class
public int? MaxAttendees { get; set; }
public int? RegistrationDeadlineMinutes { get; set; } = 30;
public virtual ICollection<MeetingRegistration> Registrations { get; set; } 
    = new List<MeetingRegistration>();
```

---

### Step 2: Update Database Context (10 minutes)

Open `src/server/Data/AppDbContext.cs`, add:

```csharp
public DbSet<MeetingRegistration> MeetingRegistrations { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Existing configurations...
    
    // Add MeetingRegistration configuration
    modelBuilder.Entity<MeetingRegistration>(entity =>
    {
        entity.ToTable("MeetingRegistrations");
        
        entity.HasIndex(e => new { e.MeetingRequestId, e.UserEmail })
              .IsUnique();
        
        entity.HasOne(e => e.MeetingRequest)
              .WithMany(m => m.Registrations)
              .HasForeignKey(e => e.MeetingRequestId)
              .OnDelete(DeleteBehavior.Cascade);
        
        entity.HasIndex(e => e.MeetingRequestId);
        entity.HasIndex(e => e.UserEmail);
        entity.HasIndex(e => e.Status);
    });
}
```

---

### Step 3: Create and Apply Migration (10 minutes)

```bash
cd src/server
dotnet ef migrations add AddMeetingRegistrations
dotnet ef database update
```

**Verify migration**:
- Check `Migrations/` folder for new migration file
- Open SQLite database and verify `MeetingRegistrations` table exists
- Verify indexes created

---

### Step 4: Create DTOs (15 minutes)

Create `src/server/Services/DTOs/RegistrationDtos.cs`:

```csharp
using System;

namespace VibeCode.Server.Services.DTOs
{
    public class RegistrationResponseDto
    {
        public int Id { get; set; }
        public int MeetingRequestId { get; set; }
        public string UserEmail { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? WaitlistPosition { get; set; }
    }

    public class AttendeeDto
    {
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? WaitlistPosition { get; set; }
    }

    public class CapacityInfoDto
    {
        public int? MaxAttendees { get; set; }
        public int RegisteredCount { get; set; }
        public int WaitlistedCount { get; set; }
        public int AvailableSpots => MaxAttendees.HasValue 
            ? Math.Max(0, MaxAttendees.Value - RegisteredCount) 
            : int.MaxValue;
        public bool IsCapacityReached => MaxAttendees.HasValue 
            && RegisteredCount >= MaxAttendees.Value;
    }
}
```

---

### Step 5: Create Registration Service (45 minutes)

Create `src/server/Services/IRegistrationService.cs`:

```csharp
using System.Threading.Tasks;
using VibeCode.Server.Services.DTOs;

namespace VibeCode.Server.Services
{
    public interface IRegistrationService
    {
        Task<RegistrationResponseDto> RegisterForMeetingAsync(int meetingId, string userEmail, string userName);
        Task<bool> CancelRegistrationAsync(int meetingId, string userEmail, string? reason);
        Task<CapacityInfoDto> GetCapacityInfoAsync(int meetingId);
    }
}
```

Create `src/server/Services/RegistrationService.cs`:

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Data;
using VibeCode.Server.Models;
using VibeCode.Server.Services.DTOs;

namespace VibeCode.Server.Services
{
    public class RegistrationService : IRegistrationService
    {
        private readonly AppDbContext _context;

        public RegistrationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<RegistrationResponseDto> RegisterForMeetingAsync(
            int meetingId, string userEmail, string userName)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validate meeting
                var meeting = await _context.MeetingRequests.FindAsync(meetingId);
                if (meeting == null) throw new InvalidOperationException("Meeting not found");
                if (meeting.Status != "Confirmed" && meeting.Status != "Announced")
                    throw new InvalidOperationException("Registration not available for this meeting");

                // Check deadline
                var deadline = meeting.MeetingDate.AddMinutes(-(meeting.RegistrationDeadlineMinutes ?? 30));
                if (DateTime.UtcNow >= deadline)
                    throw new InvalidOperationException("Registration deadline has passed");

                // Check duplicate
                var exists = await _context.MeetingRegistrations
                    .AnyAsync(r => r.MeetingRequestId == meetingId && r.UserEmail == userEmail
                                && (r.Status == "Confirmed" || r.Status == "Waitlisted"));
                if (exists) throw new InvalidOperationException("Already registered");

                // Check capacity
                var confirmedCount = await _context.MeetingRegistrations
                    .CountAsync(r => r.MeetingRequestId == meetingId && r.Status == "Confirmed");

                var status = "Confirmed";
                int? waitlistPosition = null;

                if (meeting.MaxAttendees.HasValue && confirmedCount >= meeting.MaxAttendees.Value)
                {
                    status = "Waitlisted";
                    var maxPosition = await _context.MeetingRegistrations
                        .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted")
                        .MaxAsync(r => (int?)r.WaitlistPosition) ?? 0;
                    waitlistPosition = maxPosition + 1;
                }

                // Create registration
                var registration = new MeetingRegistration
                {
                    MeetingRequestId = meetingId,
                    UserEmail = userEmail,
                    UserName = userName,
                    RegistrationDate = DateTime.UtcNow,
                    Status = status,
                    WaitlistPosition = waitlistPosition,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.MeetingRegistrations.Add(registration);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RegistrationResponseDto
                {
                    Id = registration.Id,
                    MeetingRequestId = registration.MeetingRequestId,
                    UserEmail = registration.UserEmail,
                    UserName = registration.UserName,
                    RegistrationDate = registration.RegistrationDate,
                    Status = registration.Status,
                    WaitlistPosition = registration.WaitlistPosition
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> CancelRegistrationAsync(int meetingId, string userEmail, string? reason)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var registration = await _context.MeetingRegistrations
                    .FirstOrDefaultAsync(r => r.MeetingRequestId == meetingId 
                        && r.UserEmail == userEmail
                        && (r.Status == "Confirmed" || r.Status == "Waitlisted"));

                if (registration == null) return false;

                var meeting = await _context.MeetingRequests.FindAsync(meetingId);
                if (meeting != null && meeting.MeetingDate <= DateTime.UtcNow)
                    throw new InvalidOperationException("Cannot cancel past meeting");

                var wasConfirmed = registration.Status == "Confirmed";
                
                registration.Status = "Cancelled";
                registration.CancellationDate = DateTime.UtcNow;
                registration.CancellationReason = reason;
                registration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Promote from waitlist if confirmed registration was cancelled
                if (wasConfirmed)
                {
                    var nextWaitlisted = await _context.MeetingRegistrations
                        .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitl isted")
                        .OrderBy(r => r.WaitlistPosition)
                        .FirstOrDefaultAsync();

                    if (nextWaitlisted != null)
                    {
                        nextWaitlisted.Status = "Confirmed";
                        nextWaitlisted.WaitlistPosition = null;
                        nextWaitlisted.UpdatedAt = DateTime.UtcNow;

                        // Recalculate remaining positions
                        var remainingWaitlisted = await _context.MeetingRegistrations
                            .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted")
                            .ToListAsync();

                        foreach (var w in remainingWaitlisted.OrderBy(r => r.WaitlistPosition))
                        {
                            w.WaitlistPosition = remainingWaitlisted.IndexOf(w) + 1;
                            w.UpdatedAt = DateTime.UtcNow;
                        }

                        await _context.SaveChangesAsync();
                    }
                }

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<CapacityInfoDto> GetCapacityInfoAsync(int meetingId)
        {
            var meeting = await _context.MeetingRequests.FindAsync(meetingId);
            if (meeting == null) throw new InvalidOperationException("Meeting not found");

            var registrations = await _context.MeetingRegistrations
                .Where(r => r.MeetingRequestId == meetingId)
                .ToListAsync();

            return new CapacityInfoDto
            {
                MaxAttendees = meeting.MaxAttendees,
                RegisteredCount = registrations.Count(r => r.Status == "Confirmed"),
                WaitlistedCount = registrations.Count(r => r.Status == "Waitlisted")
            };
        }
    }
}
```

**Register service in Program.cs**:

```csharp
builder.Services.AddScoped<IRegistrationService, RegistrationService>();
```

---

### Step 6: Create API Controller (30 minutes)

Create `src/server/Controllers/RegistrationsController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using VibeCode.Server.Services;

namespace VibeCode.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/meetingrequests/{meetingId}/registrations")]
    public class RegistrationsController : ControllerBase
    {
        private readonly IRegistrationService _registrationService;

        public RegistrationsController(IRegistrationService registrationService)
        {
            _registrationService = registrationService;
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromRoute] int meetingId)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                ?? User.FindFirst(ClaimTypes.Email)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? userEmail;

                if (string.IsNullOrEmpty(userEmail))
                    return Unauthorized(new { error = "User email not found" });

                var result = await _registrationService.RegisterForMeetingAsync(
                    meetingId, userEmail, userName);

                return Created($"/api/meetingrequests/{meetingId}/registrations", result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("current")]
        public async Task<IActionResult> CancelRegistration([FromRoute] int meetingId, 
            [FromBody] CancelRequest? request)
        {
            try
            {
                var userEmail = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                ?? User.FindFirst(ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(userEmail))
                    return Unauthorized(new { error = "User email not found" });

                var success = await _registrationService.CancelRegistrationAsync(
                    meetingId, userEmail, request?.Reason);

                if (!success)
                    return NotFound(new { error = "Registration not found" });

                return Ok(new { message = "Registration cancelled successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("capacity")]
        public async Task<IActionResult> GetCapacity([FromRoute] int meetingId)
        {
            try
            {
                var capacity = await _registrationService.GetCapacityInfoAsync(meetingId);
                return Ok(capacity);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
        }
    }

    public class CancelRequest
    {
        public string? Reason { get; set; }
    }
}
```

---

### Step 7: Test Backend (20 minutes)

**Start backend server**:
```bash
cd src/server
dotnet run
```

**Test with curl or Postman**:

```bash
# Register for meeting (replace token and meetingId)
curl -X POST http://localhost:5000/api/meetingrequests/1/registrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get capacity
curl http://localhost:5000/api/meetingrequests/1/registrations/capacity \
  -H "Authorization: Bearer YOUR_TOKEN"

# Cancel registration
curl -X DELETE http://localhost:5000/api/meetingrequests/1/registrations/current \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Schedule conflict"}'
```

---

### Step 8: Add Frontend Registration Button (45 minutes)

Open `src/client/src/components/MeetingRequestsList.jsx`, add:

```javascript
// Add to state declarations
const [userRegistration, setUserRegistration] = useState(null)
const [registeringMeeting, setRegisteringMeeting] = useState(false)

// Add registration handler
const handleRegister = async (meetingId) => {
  setRegisteringMeeting(true)
  try {
    const res = await fetch(`/api/meetingrequests/${meetingId}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Registration failed')
    }
    
    const registration = await res.json()
    setUserRegistration(registration)
    alert(`Successfully registered! Status: ${registration.status}`)
    
    // Refresh meeting details
    const detailsRes = await fetch(`/api/meetingrequests/${meetingId}`)
    if (detailsRes.ok) {
      const data = await detailsRes.json()
      setSelectedItemDetails(data)
    }
  } catch (err) {
    alert('Registration failed: ' + err.message)
  } finally {
    setRegisteringMeeting(false)
  }
}

// In Drawer component, add registration button
// After existing action buttons (Approve, Confirm, etc.), add:

{selectedItemDetails?.meetingRequest && 
 (selectedItemDetails.meetingRequest.status === 'Confirmed' || 
  selectedItemDetails.meetingRequest.status === 'Announced') && (
  <button
    onClick={() => handleRegister(selectedItem)}
    disabled={registeringMeeting}
    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
  >
    {registeringMeeting ? 'Registering...' : 'Register to Attend'}
  </button>
)}
```

---

### Step 9: Test Full Flow (15 minutes)

1. **Start both servers**:
   ```bash
   # Terminal 1 - Backend
   cd src/server
   dotnet run

   # Terminal 2 - Frontend
   cd src/client
   npm run dev
   ```

2. **Test registration flow**:
   - Navigate to http://localhost:5173
   - Login with Azure AD
   - Find a meeting with status "Confirmed" or "Announced"
   - Click meeting to open drawer
   - Click "Register to Attend" button
   - Verify success message
   - Verify registration status appears

3. **Test waitlist** (optional):
   - Set MaxAttendees for a meeting to 1 (in database or add UI)
   - Register first user → Should get "Confirmed"
   - Register second user → Should get "Waitlisted"

---

## Quick Reference

### Common Commands

```bash
# Backend
cd src/server
dotnet build                                    # Build
dotnet run                                      # Run
dotnet ef migrations add MigrationName          # Create migration
dotnet ef database update                       # Apply migrations
dotnet test                                     # Run tests

# Frontend
cd src/client
npm install                                     # Install dependencies
npm run dev                                     # Development server
npm run build                                   # Production build
npm test                                        # Run tests
```

### Key Files

| File | Purpose |
|------|---------|
| `Models/MeetingRegistration.cs` | Entity model |
| `Services/RegistrationService.cs` | Business logic |
| `Controllers/RegistrationsController.cs` | API endpoints |
| `components/MeetingRequestsList.jsx` | Registration UI |
| `Migrations/AddMeetingRegistrations.cs` | Database schema |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meetingrequests/{id}/registrations` | Register for meeting |
| DELETE | `/api/meetingrequests/{id}/registrations/current` | Cancel registration |
| GET | `/api/meetingrequests/{id}/registrations/capacity` | Get capacity info |

## Troubleshooting

### "Migration already applied"
```bash
dotnet ef database update 0                    # Revert all migrations
dotnet ef migrations remove                    # Remove migration
dotnet ef migrations add AddMeetingRegistrations  # Re-create
dotnet ef database update                      # Apply
```

### "User email not found"
- Check MSAL configuration in `Program.cs`
- Verify ClaimTypes.NameIdentifier or ClaimTypes.Email in token
- Add logging: `Console.WriteLine(User.FindFirst(ClaimTypes.NameIdentifier)?.Value)`

### "Registration failed"
- Check meeting status is Confirmed or Announced
- Verify registration deadline not passed
- Check for duplicate registration in database
- Review server logs for exceptions

## Next Steps

After completing this quickstart:

1. ✅ Add cancellation functionality
2. ✅ Implement attendee list view
3. ✅ Create My Registrations page
4. ✅ Add capacity indicators to meeting cards
5. ✅ Write unit tests
6. ✅ Add E2E tests
7. ✅ Deploy to production

See [plan.md](plan.md) for complete implementation roadmap.

