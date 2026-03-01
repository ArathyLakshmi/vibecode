using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Services.DTOs;

namespace VibeCode.Server.Services
{
    /// <summary>
    /// Service for managing meeting registrations
    /// </summary>
    public class RegistrationService : IRegistrationService
    {
        private readonly MeetingRequestsDbContext _context;

        public RegistrationService(MeetingRequestsDbContext context)
        {
            _context = context;
        }

        public async Task<RegistrationResponseDto> RegisterForMeetingAsync(int meetingId, string userEmail, string userName)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Get meeting and validate
                var meeting = await _context.MeetingRequests.FindAsync(meetingId);
                if (meeting == null)
                {
                    throw new InvalidOperationException("Meeting not found");
                }

                // 2. Check meeting status
                if (meeting.Status != "Confirmed" && meeting.Status != "Announced")
                {
                    throw new InvalidOperationException($"Meeting status must be Confirmed or Announced. Current status: {meeting.Status}");
                }

                // 3. Check registration deadline
                if (meeting.MeetingDate.HasValue && meeting.RegistrationDeadlineMinutes.HasValue)
                {
                    var deadline = meeting.MeetingDate.Value.AddMinutes(-meeting.RegistrationDeadlineMinutes.Value);
                    if (DateTime.UtcNow > deadline)
                    {
                        throw new InvalidOperationException($"Registration deadline has passed. Deadline was {deadline:g}");
                    }
                }

                // 4. Check for duplicate registration
                var existingRegistration = await _context.MeetingRegistrations
                    .FirstOrDefaultAsync(r => r.MeetingRequestId == meetingId && 
                                            r.UserEmail == userEmail && 
                                            r.Status != "Cancelled");
                
                if (existingRegistration != null)
                {
                    throw new InvalidOperationException("You are already registered for this meeting");
                }

                // 5. Count current confirmed registrations
                var confirmedCount = await _context.MeetingRegistrations
                    .CountAsync(r => r.MeetingRequestId == meetingId && r.Status == "Confirmed");

                // 6. Determine status (Confirmed vs Waitlisted)
                var status = "Confirmed";
                int? waitlistPosition = null;

                if (meeting.MaxAttendees.HasValue && confirmedCount >= meeting.MaxAttendees.Value)
                {
                    // Capacity reached, put on waitlist
                    status = "Waitlisted";
                    
                    // Calculate waitlist position
                    var maxWaitlistPosition = await _context.MeetingRegistrations
                        .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted")
                        .MaxAsync(r => (int?)r.WaitlistPosition) ?? 0;
                    
                    waitlistPosition = maxWaitlistPosition + 1;
                }

                // 7. Create registration
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

                // 8. Return response
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

        public async Task<RegistrationResponseDto> CancelRegistrationAsync(int meetingId, string userEmail, string? reason)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Get meeting
                var meeting = await _context.MeetingRequests.FindAsync(meetingId);
                if (meeting == null)
                {
                    throw new InvalidOperationException("Meeting not found");
                }

                // 2. Check if meeting date has passed
                if (meeting.MeetingDate.HasValue && meeting.MeetingDate.Value < DateTime.UtcNow)
                {
                    throw new InvalidOperationException("Cannot cancel registration for past meetings");
                }

                // 3. Find user's registration
                var registration = await _context.MeetingRegistrations
                    .FirstOrDefaultAsync(r => r.MeetingRequestId == meetingId && 
                                            r.UserEmail == userEmail && 
                                            r.Status != "Cancelled");
                
                if (registration == null)
                {
                    throw new InvalidOperationException("No active registration found for this meeting");
                }

                var wasConfirmed = registration.Status == "Confirmed";

                // 4. Update registration to Cancelled
                registration.Status = "Cancelled";
                registration.CancellationDate = DateTime.UtcNow;
                registration.CancellationReason = reason;
                registration.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // 5. If confirmed user cancelled, promote from waitlist
                if (wasConfirmed)
                {
                    await PromoteFromWaitlistAsync(meetingId);
                }
                else if (registration.WaitlistPosition.HasValue)
                {
                    // If waitlisted user cancelled, recalculate remaining waitlist positions
                    await RecalculateWaitlistPositionsAsync(meetingId);
                }

                await transaction.CommitAsync();

                // 6. Return response
                return new RegistrationResponseDto
                {
                    Id = registration.Id,
                    MeetingRequestId = registration.MeetingRequestId,
                    UserEmail = registration.UserEmail,
                    UserName = registration.UserName,
                    RegistrationDate = registration.RegistrationDate,
                    Status = registration.Status,
                    WaitlistPosition = null,
                    CancellationDate = registration.CancellationDate,
                    CancellationReason = registration.CancellationReason
                };
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
            if (meeting == null)
            {
                throw new InvalidOperationException("Meeting not found");
            }

            var confirmedCount = await _context.MeetingRegistrations
                .CountAsync(r => r.MeetingRequestId == meetingId && r.Status == "Confirmed");

            var waitlistedCount = await _context.MeetingRegistrations
                .CountAsync(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted");

            var availableSpots = 0;
            var isAtCapacity = false;

            if (meeting.MaxAttendees.HasValue)
            {
                availableSpots = Math.Max(0, meeting.MaxAttendees.Value - confirmedCount);
                isAtCapacity = confirmedCount >= meeting.MaxAttendees.Value;
            }

            var isRegistrationOpen = meeting.Status == "Confirmed" || meeting.Status == "Announced";
            DateTime? registrationDeadline = null;

            if (meeting.MeetingDate.HasValue && meeting.RegistrationDeadlineMinutes.HasValue)
            {
                registrationDeadline = meeting.MeetingDate.Value.AddMinutes(-meeting.RegistrationDeadlineMinutes.Value);
                if (DateTime.UtcNow > registrationDeadline)
                {
                    isRegistrationOpen = false;
                }
            }

            return new CapacityInfoDto
            {
                MaxAttendees = meeting.MaxAttendees,
                ConfirmedCount = confirmedCount,
                WaitlistedCount = waitlistedCount,
                AvailableSpots = availableSpots,
                IsRegistrationOpen = isRegistrationOpen,
                IsAtCapacity = isAtCapacity,
                RegistrationDeadline = registrationDeadline
            };
        }

        public async Task<AttendeeListResponseDto> GetAttendeesAsync(int meetingId, string? statusFilter = null)
        {
            var query = _context.MeetingRegistrations
                .Where(r => r.MeetingRequestId == meetingId);

            if (!string.IsNullOrEmpty(statusFilter))
            {
                query = query.Where(r => r.Status == statusFilter);
            }

            var registrations = await query
                .OrderBy(r => r.Status == "Confirmed" ? 0 : 1) // Confirmed first
                .ThenBy(r => r.WaitlistPosition)
                .ThenBy(r => r.RegistrationDate)
                .ToListAsync();

            var confirmedAttendees = registrations
                .Where(r => r.Status == "Confirmed")
                .Select(r => new AttendeeDto
                {
                    Id = r.Id,
                    UserEmail = r.UserEmail,
                    UserName = r.UserName,
                    RegistrationDate = r.RegistrationDate,
                    Status = r.Status,
                    WaitlistPosition = null
                })
                .ToList();

            var waitlistedAttendees = registrations
                .Where(r => r.Status == "Waitlisted")
                .Select(r => new AttendeeDto
                {
                    Id = r.Id,
                    UserEmail = r.UserEmail,
                    UserName = r.UserName,
                    RegistrationDate = r.RegistrationDate,
                    Status = r.Status,
                    WaitlistPosition = r.WaitlistPosition
                })
                .ToList();

            var capacityInfo = await GetCapacityInfoAsync(meetingId);

            return new AttendeeListResponseDto
            {
                CapacityInfo = capacityInfo,
                ConfirmedAttendees = confirmedAttendees,
                WaitlistedAttendees = waitlistedAttendees
            };
        }

        public async Task<MyRegistrationsResponseDto> GetMyRegistrationsAsync(string userEmail, string filter = "all")
        {
            var query = _context.MeetingRegistrations
                .Include(r => r.MeetingRequest)
                .Where(r => r.UserEmail == userEmail);

            var now = DateTime.UtcNow;

            // Apply filter
            switch (filter.ToLower())
            {
                case "upcoming":
                    query = query.Where(r => r.Status != "Cancelled" && 
                                           (r.MeetingRequest!.MeetingDate == null || r.MeetingRequest.MeetingDate >= now));
                    break;
                case "past":
                    query = query.Where(r => r.Status != "Cancelled" && 
                                           r.MeetingRequest!.MeetingDate != null && 
                                           r.MeetingRequest.MeetingDate < now);
                    break;
                case "cancelled":
                    query = query.Where(r => r.Status == "Cancelled");
                    break;
                // "all" - no additional filter
            }

            var registrations = await query
                .OrderByDescending(r => r.MeetingRequest!.MeetingDate ?? DateTime.MaxValue)
                .ThenByDescending(r => r.RegistrationDate)
                .ToListAsync();

            var dtos = registrations.Select(r => new MyRegistrationDto
            {
                RegistrationId = r.Id,
                MeetingRequestId = r.MeetingRequestId,
                MeetingTitle = r.MeetingRequest?.Title ?? "Unknown",
                MeetingReferenceNumber = r.MeetingRequest?.ReferenceNumber,
                MeetingDate = r.MeetingRequest?.MeetingDate,
                Status = r.Status,
                WaitlistPosition = r.WaitlistPosition,
                RegistrationDate = r.RegistrationDate,
                CanCancel = r.Status != "Cancelled" && 
                           (r.MeetingRequest?.MeetingDate == null || r.MeetingRequest.MeetingDate >= now),
                MeetingStatus = r.MeetingRequest?.Status ?? "Unknown"
            }).ToList();

            // Calculate summary
            var allRegistrations = await _context.MeetingRegistrations
                .Include(r => r.MeetingRequest)
                .Where(r => r.UserEmail == userEmail)
                .ToListAsync();

            var summary = new MyRegistrationsSummaryDto
            {
                TotalRegistrations = allRegistrations.Count(r => r.Status != "Cancelled"),
                UpcomingMeetings = allRegistrations.Count(r => r.Status != "Cancelled" && 
                                                              (r.MeetingRequest!.MeetingDate == null || r.MeetingRequest.MeetingDate >= now)),
                PastMeetings = allRegistrations.Count(r => r.Status != "Cancelled" && 
                                                         r.MeetingRequest!.MeetingDate != null && 
                                                         r.MeetingRequest.MeetingDate < now),
                WaitlistedCount = allRegistrations.Count(r => r.Status == "Waitlisted"),
                CancelledCount = allRegistrations.Count(r => r.Status == "Cancelled")
            };

            return new MyRegistrationsResponseDto
            {
                Registrations = dtos,
                Summary = summary
            };
        }

        /// <summary>
        /// Promote first waitlisted user to confirmed status
        /// </summary>
        private async Task PromoteFromWaitlistAsync(int meetingId)
        {
            var firstWaitlisted = await _context.MeetingRegistrations
                .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted")
                .OrderBy(r => r.WaitlistPosition)
                .ThenBy(r => r.RegistrationDate) // FIFO tie-breaker
                .FirstOrDefaultAsync();

            if (firstWaitlisted != null)
            {
                firstWaitlisted.Status = "Confirmed";
                firstWaitlisted.WaitlistPosition = null;
                firstWaitlisted.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Recalculate remaining waitlist positions
                await RecalculateWaitlistPositionsAsync(meetingId);
            }
        }

        /// <summary>
        /// Recalculate waitlist positions after a change
        /// </summary>
        private async Task RecalculateWaitlistPositionsAsync(int meetingId)
        {
            var waitlistedRegistrations = await _context.MeetingRegistrations
                .Where(r => r.MeetingRequestId == meetingId && r.Status == "Waitlisted")
                .OrderBy(r => r.RegistrationDate) // FIFO order
                .ToListAsync();

            for (int i = 0; i < waitlistedRegistrations.Count; i++)
            {
                waitlistedRegistrations[i].WaitlistPosition = i + 1;
                waitlistedRegistrations[i].UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}
