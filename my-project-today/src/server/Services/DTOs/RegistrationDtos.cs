using System;
using System.ComponentModel.DataAnnotations;

namespace VibeCode.Server.Services.DTOs
{
    /// <summary>
    /// Response DTO for registration operations
    /// </summary>
    public class RegistrationResponseDto
    {
        public int Id { get; set; }
        public int MeetingRequestId { get; set; }
        public string UserEmail { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public string Status { get; set; } = string.Empty; // Confirmed, Waitlisted, Cancelled, Attended
        public int? WaitlistPosition { get; set; }
        public DateTime? CancellationDate { get; set; }
        public string? CancellationReason { get; set; }
    }

    /// <summary>
    /// DTO for displaying attendee information
    /// </summary>
    public class AttendeeDto
    {
        public int Id { get; set; }
        public string UserEmail { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public DateTime RegistrationDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? WaitlistPosition { get; set; }
    }

    /// <summary>
    /// DTO for meeting capacity information
    /// </summary>
    public class CapacityInfoDto
    {
        public int? MaxAttendees { get; set; }
        public int ConfirmedCount { get; set; }
        public int WaitlistedCount { get; set; }
        public int AvailableSpots { get; set; }
        public bool IsRegistrationOpen { get; set; }
        public bool IsAtCapacity { get; set; }
        public DateTime? RegistrationDeadline { get; set; }
    }

    /// <summary>
    /// DTO for user's registration dashboard
    /// </summary>
    public class MyRegistrationDto
    {
        public int RegistrationId { get; set; }
        public int MeetingRequestId { get; set; }
        public string MeetingTitle { get; set; } = string.Empty;
        public string? MeetingReferenceNumber { get; set; }
        public DateTime? MeetingDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? WaitlistPosition { get; set; }
        public DateTime RegistrationDate { get; set; }
        public bool CanCancel { get; set; }
        public string MeetingStatus { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request DTO for cancellation
    /// </summary>
    public class CancelRegistrationRequestDto
    {
        [MaxLength(1000)]
        public string? Reason { get; set; }
    }

    /// <summary>
    /// Response DTO for attendee list with capacity
    /// </summary>
    public class AttendeeListResponseDto
    {
        public CapacityInfoDto CapacityInfo { get; set; } = new();
        public List<AttendeeDto> ConfirmedAttendees { get; set; } = new();
        public List<AttendeeDto> WaitlistedAttendees { get; set; } = new();
    }

    /// <summary>
    /// Response DTO for my registrations page
    /// </summary>
    public class MyRegistrationsResponseDto
    {
        public List<MyRegistrationDto> Registrations { get; set; } = new();
        public MyRegistrationsSummaryDto Summary { get; set; } = new();
    }

    /// <summary>
    /// Summary counts for my registrations
    /// </summary>
    public class MyRegistrationsSummaryDto
    {
        public int TotalRegistrations { get; set; }
        public int UpcomingMeetings { get; set; }
        public int PastMeetings { get; set; }
        public int WaitlistedCount { get; set; }
        public int CancelledCount { get; set; }
    }
}
