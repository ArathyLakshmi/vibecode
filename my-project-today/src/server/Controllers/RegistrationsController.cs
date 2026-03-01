using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Services;
using VibeCode.Server.Services.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace VibeCode.Server.Controllers
{
    /// <summary>
    /// Controller for managing meeting registrations
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize] // Uncomment when authentication is fully configured
    public class RegistrationsController : ControllerBase
    {
        private readonly IRegistrationService _registrationService;
        private readonly MeetingRequestsDbContext _context;

        public RegistrationsController(
            IRegistrationService registrationService,
            MeetingRequestsDbContext context)
        {
            _registrationService = registrationService;
            _context = context;
        }

        /// <summary>
        /// Register current user for a meeting
        /// POST /api/registrations/meetingrequests/{meetingId}/register
        /// </summary>
        [HttpPost("meetingrequests/{meetingId}/register")]
        public async Task<IActionResult> RegisterForMeeting(int meetingId)
        {
            try
            {
                // Extract user info from claims
                var userEmail = GetUserEmail();
                var userName = GetUserName();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return Unauthorized(new { error = "User email could not be determined from authentication token" });
                }

                var result = await _registrationService.RegisterForMeetingAsync(meetingId, userEmail, userName ?? "Unknown User");
                
                return CreatedAtAction(
                    nameof(GetMyRegistrations), 
                    new { }, 
                    result);
            }
            catch (InvalidOperationException ex)
            {
                // Business rule violations
                if (ex.Message.Contains("not found"))
                    return NotFound(new { error = ex.Message });
                if (ex.Message.Contains("already registered"))
                    return Conflict(new { error = ex.Message });
                
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while processing your registration", details = ex.Message });
            }
        }

        /// <summary>
        /// Cancel current user's registration for a meeting
        /// DELETE /api/registrations/meetingrequests/{meetingId}/cancel
        /// </summary>
        [HttpDelete("meetingrequests/{meetingId}/cancel")]
        public async Task<IActionResult> CancelRegistration(int meetingId, [FromBody] CancelRegistrationRequestDto? request)
        {
            try
            {
                var userEmail = GetUserEmail();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return Unauthorized(new { error = "User email could not be determined" });
                }

                var result = await _registrationService.CancelRegistrationAsync(
                    meetingId, 
                    userEmail, 
                    request?.Reason);
                
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                if (ex.Message.Contains("not found") || ex.Message.Contains("No active registration"))
                    return NotFound(new { error = ex.Message });
                
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while cancelling your registration", details = ex.Message });
            }
        }

        /// <summary>
        /// Get attendee list for a meeting (requestor and admin only)
        /// GET /api/registrations/meetingrequests/{meetingId}/attendees
        /// </summary>
        [HttpGet("meetingrequests/{meetingId}/attendees")]
        public async Task<IActionResult> GetAttendees(int meetingId, [FromQuery] string? status = null)
        {
            try
            {
                // Authorization check: only requestor or admin roles can view attendees
                var meeting = await _context.MeetingRequests.FindAsync(meetingId);
                if (meeting == null)
                {
                    return NotFound(new { error = "Meeting not found" });
                }

                var userEmail = GetUserEmail();
                var isRequestor = meeting.RequestorEmail == userEmail;
                var isAdmin = User.IsInRole("SecAdmin") || User.IsInRole("EdOffice") || User.IsInRole("ManagementOffice");

                if (!isRequestor && !isAdmin)
                {
                    return Forbid();
                }

                var result = await _registrationService.GetAttendeesAsync(meetingId, status);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while retrieving attendees", details = ex.Message });
            }
        }

        /// <summary>
        /// Get current user's registrations with optional filter
        /// GET /api/registrations/my-registrations?filter={filter}
        /// </summary>
        [HttpGet("my-registrations")]
        public async Task<IActionResult> GetMyRegistrations([FromQuery] string filter = "all")
        {
            try
            {
                var userEmail = GetUserEmail();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return Unauthorized(new { error = "User email could not be determined" });
                }

                var result = await _registrationService.GetMyRegistrationsAsync(userEmail, filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while retrieving your registrations", details = ex.Message });
            }
        }

        /// <summary>
        /// Get capacity information for a meeting
        /// GET /api/registrations/meetingrequests/{meetingId}/capacity
        /// </summary>
        [HttpGet("meetingrequests/{meetingId}/capacity")]
        public async Task<IActionResult> GetCapacityInfo(int meetingId)
        {
            try
            {
                var result = await _registrationService.GetCapacityInfoAsync(meetingId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while retrieving capacity information", details = ex.Message });
            }
        }

        /// <summary>
        /// Get current user's registration status for a specific meeting
        /// GET /api/registrations/meetingrequests/{meetingId}/my-registration
        /// </summary>
        [HttpGet("meetingrequests/{meetingId}/my-registration")]
        public async Task<IActionResult> GetMyRegistrationForMeeting(int meetingId)
        {
            try
            {
                var userEmail = GetUserEmail();

                if (string.IsNullOrEmpty(userEmail))
                {
                    return Unauthorized(new { error = "User email could not be determined" });
                }

                var registration = await _context.MeetingRegistrations
                    .FirstOrDefaultAsync(r => r.MeetingRequestId == meetingId && 
                                            r.UserEmail == userEmail && 
                                            r.Status != "Cancelled");

                if (registration == null)
                {
                    return Ok(new { registered = false });
                }

                return Ok(new RegistrationResponseDto
                {
                    Id = registration.Id,
                    MeetingRequestId = registration.MeetingRequestId,
                    UserEmail = registration.UserEmail,
                    UserName = registration.UserName,
                    RegistrationDate = registration.RegistrationDate,
                    Status = registration.Status,
                    WaitlistPosition = registration.WaitlistPosition
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while checking registration status", details = ex.Message });
            }
        }

        /// <summary>
        /// Helper method to extract user email from claims
        /// </summary>
        private string? GetUserEmail()
        {
            if (User?.Identity?.IsAuthenticated != true)
            {
                // For development without authentication, use a default email
                return "dev@example.com";
            }

            return User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.FindFirst("upn")?.Value;
        }

        /// <summary>
        /// Helper method to extract user name from claims
        /// </summary>
        private string? GetUserName()
        {
            if (User?.Identity?.IsAuthenticated != true)
            {
                // For development without authentication
                return "Dev User";
            }

            return User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.Identity?.Name;
        }
    }
}
