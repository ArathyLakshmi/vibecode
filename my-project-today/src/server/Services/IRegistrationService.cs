using System.Threading.Tasks;
using VibeCode.Server.Services.DTOs;

namespace VibeCode.Server.Services
{
    /// <summary>
    /// Service interface for meeting registration operations
    /// </summary>
    public interface IRegistrationService
    {
        /// <summary>
        /// Register a user for a meeting
        /// </summary>
        /// <param name="meetingId">The ID of the meeting to register for</param>
        /// <param name="userEmail">The email of the user registering</param>
        /// <param name="userName">The name of the user registering</param>
        /// <returns>Registration response with status (Confirmed or Waitlisted)</returns>
        /// <exception cref="InvalidOperationException">Thrown when registration rules are violated</exception>
        Task<RegistrationResponseDto> RegisterForMeetingAsync(int meetingId, string userEmail, string userName);

        /// <summary>
        /// Cancel a user's registration for a meeting
        /// </summary>
        /// <param name="meetingId">The ID of the meeting</param>
        /// <param name="userEmail">The email of the user cancelling</param>
        /// <param name="reason">Optional cancellation reason</param>
        /// <returns>Updated registration response</returns>
        /// <exception cref="InvalidOperationException">Thrown when cancellation is not allowed</exception>
        Task<RegistrationResponseDto> CancelRegistrationAsync(int meetingId, string userEmail, string? reason);

        /// <summary>
        /// Get capacity information for a meeting
        /// </summary>
        /// <param name="meetingId">The ID of the meeting</param>
        /// <returns>Capacity information including confirmed count, waitlist count, and available spots</returns>
        Task<CapacityInfoDto> GetCapacityInfoAsync(int meetingId);

        /// <summary>
        /// Get list of attendees for a meeting
        /// </summary>
        /// <param name="meetingId">The ID of the meeting</param>
        /// <param name="statusFilter">Optional filter by status (Confirmed, Waitlisted, Cancelled, Attended)</param>
        /// <returns>Attendee list with capacity information</returns>
        Task<AttendeeListResponseDto> GetAttendeesAsync(int meetingId, string? statusFilter = null);

        /// <summary>
        /// Get all registrations for a specific user
        /// </summary>
        /// <param name="userEmail">The email of the user</param>
        /// <param name="filter">Filter: "upcoming", "past", "cancelled", or "all"</param>
        /// <returns>User's registrations with summary counts</returns>
        Task<MyRegistrationsResponseDto> GetMyRegistrationsAsync(string userEmail, string filter = "all");
    }
}
