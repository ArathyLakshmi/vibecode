using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using VibeCode.Server.Services;
using VibeCode.Server.Services.DTOs;

namespace VibeCode.Server.Tests.Services
{
    public class RegistrationServiceTests : IDisposable
    {
        private readonly MeetingRequestsDbContext _context;
        private readonly RegistrationService _service;

        public RegistrationServiceTests()
        {
            // Create in-memory database for testing
            var options = new DbContextOptionsBuilder<MeetingRequestsDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new MeetingRequestsDbContext(options);
            _service = new RegistrationService(_context);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task RegisterForMeetingAsync_SuccessfulRegistration_StatusConfirmed()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 10,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.RegisterForMeetingAsync(1, "test@example.com", "Test User");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("test@example.com", result.UserEmail);
            Assert.Equal("Test User", result.UserName);
            Assert.Equal("Confirmed", result.Status);
            Assert.Null(result.WaitlistPosition);

            var registration = await _context.MeetingRegistrations.FirstAsync();
            Assert.Equal(1, registration.MeetingRequestId);
            Assert.Equal("Confirmed", registration.Status);
        }

        [Fact]
        public async Task RegisterForMeetingAsync_CapacityReached_StatusWaitlisted()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 2,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            // Add two confirmed registrations to reach capacity
            _context.MeetingRegistrations.AddRange(
                new MeetingRegistration
                {
                    MeetingRequestId = 1,
                    UserEmail = "user1@example.com",
                    UserName = "User 1",
                    Status = "Confirmed",
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new MeetingRegistration
                {
                    MeetingRequestId = 1,
                    UserEmail = "user2@example.com",
                    UserName = "User 2",
                    Status = "Confirmed",
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.RegisterForMeetingAsync(1, "test@example.com", "Test User");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Waitlisted", result.Status);
            Assert.Equal(1, result.WaitlistPosition);
        }

        [Fact]
        public async Task RegisterForMeetingAsync_DuplicateRegistration_ThrowsException()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 10,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            _context.MeetingRegistrations.Add(new MeetingRegistration
            {
                MeetingRequestId = 1,
                UserEmail = "test@example.com",
                UserName = "Test User",
                Status = "Confirmed",
                RegistrationDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.RegisterForMeetingAsync(1, "test@example.com", "Test User"));
        }

        [Fact]
        public async Task RegisterForMeetingAsync_InvalidMeetingStatus_ThrowsException()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Draft", // Not Confirmed or Announced
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 10,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);
            await _context.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.RegisterForMeetingAsync(1, "test@example.com", "Test User"));
        }

        [Fact]
        public async Task RegisterForMeetingAsync_DeadlinePassed_ThrowsException()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddMinutes(20), // Meeting in 20 minutes
                MaxAttendees = 10,
                RegistrationDeadlineMinutes = 30 // Deadline 30 minutes before
            };
            _context.MeetingRequests.Add(meeting);
            await _context.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.RegisterForMeetingAsync(1, "test@example.com", "Test User"));
        }

        [Fact]
        public async Task CancelRegistrationAsync_ConfirmedUserCancels_PromotesWaitlist()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 2,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            // Add confirmed user and waitlisted user
            _context.MeetingRegistrations.AddRange(
                new MeetingRegistration
                {
                    Id = 1,
                    MeetingRequestId = 1,
                    UserEmail = "confirmed@example.com",
                    UserName = "Confirmed User",
                    Status = "Confirmed",
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new MeetingRegistration
                {
                    Id = 2,
                    MeetingRequestId = 1,
                    UserEmail = "waitlisted@example.com",
                    UserName = "Waitlisted User",
                    Status = "Waitlisted",
                    WaitlistPosition = 1,
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            // Act
            await _service.CancelRegistrationAsync(1, "confirmed@example.com", "Schedule conflict");

            // Assert
            var cancelledRegistration = await _context.MeetingRegistrations.FindAsync(1);
            Assert.Equal("Cancelled", cancelledRegistration!.Status);
            Assert.Equal("Schedule conflict", cancelledRegistration.CancellationReason);
            Assert.NotNull(cancelledRegistration.CancellationDate);

            var promotedRegistration = await _context.MeetingRegistrations.FindAsync(2);
            Assert.Equal("Confirmed", promotedRegistration!.Status);
            Assert.Null(promotedRegistration.WaitlistPosition);
        }

        [Fact]
        public async Task CancelRegistrationAsync_WaitlistedUserCancels_RecalculatesPositions()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 1,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            // Add confirmed and two waitlisted users
            _context.MeetingRegistrations.AddRange(
                new MeetingRegistration
                {
                    Id = 1,
                    MeetingRequestId = 1,
                    UserEmail = "confirmed@example.com",
                    UserName = "Confirmed User",
                    Status = "Confirmed",
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new MeetingRegistration
                {
                    Id = 2,
                    MeetingRequestId = 1,
                    UserEmail = "waitlist1@example.com",
                    UserName = "Waitlist User 1",
                    Status = "Waitlisted",
                    WaitlistPosition = 1,
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new MeetingRegistration
                {
                    Id = 3,
                    MeetingRequestId = 1,
                    UserEmail = "waitlist2@example.com",
                    UserName = "Waitlist User 2",
                    Status = "Waitlisted",
                    WaitlistPosition = 2,
                    RegistrationDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await _context.SaveChangesAsync();

            // Act
            await _service.CancelRegistrationAsync(1, "waitlist1@example.com", "Can't attend");

            // Assert
            var cancelledRegistration = await _context.MeetingRegistrations.FindAsync(2);
            Assert.Equal("Cancelled", cancelledRegistration!.Status);

            var remainingWaitlisted = await _context.MeetingRegistrations.FindAsync(3);
            Assert.Equal(1, remainingWaitlisted!.WaitlistPosition); // Position should be recalculated to 1
        }

        [Fact]
        public async Task CancelRegistrationAsync_PastMeeting_ThrowsException()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(-1), // Meeting in the past
                MaxAttendees = 10,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            _context.MeetingRegistrations.Add(new MeetingRegistration
            {
                MeetingRequestId = 1,
                UserEmail = "test@example.com",
                UserName = "Test User",
                Status = "Confirmed",
                RegistrationDate = DateTime.UtcNow.AddDays(-5),
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            });
            await _context.SaveChangesAsync();

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _service.CancelRegistrationAsync(1, "test@example.com", "Too late"));
        }

        [Fact]
        public async Task WaitlistPromotion_FIFOOrder_PromptsCorrectly()
        {
            // Arrange
            var meeting = new MeetingRequest
            {
                Id = 1,
                Title = "Board Meeting",
                Status = "Confirmed",
                MeetingDate = DateTime.UtcNow.AddDays(7),
                MaxAttendees = 1,
                RegistrationDeadlineMinutes = 30
            };
            _context.MeetingRequests.Add(meeting);

            // Add confirmed and three waitlisted users with different registration times
            _context.MeetingRegistrations.AddRange(
                new MeetingRegistration
                {
                    Id = 1,
                    MeetingRequestId = 1,
                    UserEmail = "confirmed@example.com",
                    UserName = "Confirmed User",
                    Status = "Confirmed",
                    RegistrationDate = DateTime.UtcNow.AddHours(-10),
                    CreatedAt = DateTime.UtcNow.AddHours(-10),
                    UpdatedAt = DateTime.UtcNow.AddHours(-10)
                },
                new MeetingRegistration
                {
                    Id = 2,
                    MeetingRequestId = 1,
                    UserEmail = "waitlist1@example.com",
                    UserName = "Waitlist User 1",
                    Status = "Waitlisted",
                    WaitlistPosition = 1,
                    RegistrationDate = DateTime.UtcNow.AddHours(-8), // First in waitlist
                    CreatedAt = DateTime.UtcNow.AddHours(-8),
                    UpdatedAt = DateTime.UtcNow.AddHours(-8)
                },
                new MeetingRegistration
                {
                    Id = 3,
                    MeetingRequestId = 1,
                    UserEmail = "waitlist2@example.com",
                    UserName = "Waitlist User 2",
                    Status = "Waitlisted",
                    WaitlistPosition = 2,
                    RegistrationDate = DateTime.UtcNow.AddHours(-6), // Second in waitlist
                    CreatedAt = DateTime.UtcNow.AddHours(-6),
                    UpdatedAt = DateTime.UtcNow.AddHours(-6)
                }
            );
            await _context.SaveChangesAsync();

            // Act
            await _service.CancelRegistrationAsync(1, "confirmed@example.com", "Cancelled");

            // Assert
            var promotedUser = await _context.MeetingRegistrations.FindAsync(2);
            Assert.Equal("Confirmed", promotedUser!.Status);
            Assert.Null(promotedUser.WaitlistPosition);

            var remainingWaitlisted = await _context.MeetingRegistrations.FindAsync(3);
            Assert.Equal("Waitlisted", remainingWaitlisted!.Status);
            Assert.Equal(1, remainingWaitlisted.WaitlistPosition); // Should be recalculated to position 1
        }
    }
}
