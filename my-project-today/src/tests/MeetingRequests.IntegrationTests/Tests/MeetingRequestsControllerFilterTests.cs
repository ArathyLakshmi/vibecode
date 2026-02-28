using Xunit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MeetingRequests.IntegrationTests
{
    public class MeetingRequestsControllerFilterTests : IDisposable
    {
        private readonly MeetingRequestsDbContext _context;
        private readonly MeetingRequestsController _controller;

        public MeetingRequestsControllerFilterTests()
        {
            // Setup in-memory database with unique name for test isolation
            var options = new DbContextOptionsBuilder<MeetingRequestsDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            
            _context = new MeetingRequestsDbContext(options);
            _controller = new MeetingRequestsController(_context, null, null);
            
            // Seed test data
            SeedTestData();
        }

        private void SeedTestData()
        {
            _context.MeetingRequests.AddRange(
                new MeetingRequest
                {
                    Id = 1,
                    Title = "John's Request 1",
                    RequestorEmail = "john.doe@example.com",
                    RequestorName = "John Doe",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    Category = "Test",
                    Classification = "Regular"
                },
                new MeetingRequest
                {
                    Id = 2,
                    Title = "John's Request 2",
                    RequestorEmail = "john.doe@example.com",
                    RequestorName = "John Doe",
                    Status = "Approved",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                    Category = "Test",
                    Classification = "Regular"
                },
                new MeetingRequest
                {
                    Id = 3,
                    Title = "Jane's Request",
                    RequestorEmail = "jane.smith@example.com",
                    RequestorName = "Jane Smith",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                    Category = "Test",
                    Classification = "Regular"
                }
            );
            _context.SaveChanges();
        }

        [Fact]
        public async Task List_WithRequestorEmail_ReturnsOnlyMatchingRequests()
        {
            // Arrange
            var requestorEmail = "john.doe@example.com";

            // Act
            var result = await _controller.List(
                classification: null,
                category: null,
                status: null,
                startDate: null,
                endDate: null,
                page: 1,
                pageSize: 20,
                requestorEmail: requestorEmail);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            
            // Use reflection to get the anonymous type properties
            var itemsProperty = value?.GetType().GetProperty("items");
            var totalCountProperty = value?.GetType().GetProperty("totalCount");
            
            Assert.NotNull(itemsProperty);
            Assert.NotNull(totalCountProperty);
            
            var items = itemsProperty.GetValue(value) as System.Collections.IEnumerable;
            var totalCount = (int)totalCountProperty.GetValue(value);
            
            Assert.Equal(2, totalCount); // John has 2 requests
            Assert.NotNull(items);
            Assert.Equal(2, items.Cast<object>().Count());
        }

        [Fact]
        public async Task List_WithoutRequestorEmail_ReturnsAllRequests()
        {
            // Arrange & Act
            var result = await _controller.List(
                classification: null,
                category: null,
                status: null,
                startDate: null,
                endDate: null,
                page: 1,
                pageSize: 20,
                requestorEmail: null); // No filter

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            
            var totalCountProperty = value?.GetType().GetProperty("totalCount");
            Assert.NotNull(totalCountProperty);
            
            var totalCount = (int)totalCountProperty.GetValue(value);
           Assert.Equal(3, totalCount); // All 3 requests
        }

        [Fact]
        public async Task List_WithRequestorEmail_UpdatesTotalCount()
        {
            // Arrange
            var requestorEmail = "jane.smith@example.com";

            // Act
            var result = await _controller.List(
                classification: null,
                category: null,
                status: null,
                startDate: null,
                endDate: null,
                page: 1,
                pageSize: 20,
                requestorEmail: requestorEmail);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            
            var totalCountProperty = value?.GetType().GetProperty("totalCount");
            var totalPagesProperty = value?.GetType().GetProperty("totalPages");
            var hasMoreProperty = value?.GetType().GetProperty("hasMore");
            
            Assert.NotNull(totalCountProperty);
            Assert.NotNull(totalPagesProperty);
            Assert.NotNull(hasMoreProperty);
            
            var totalCount = (int)totalCountProperty.GetValue(value);
            var totalPages = (int)totalPagesProperty.GetValue(value);
            var hasMore = (bool)hasMoreProperty.GetValue(value);
            
            Assert.Equal(1, totalCount); // Jane has 1 request
            Assert.Equal(1, totalPages);
            Assert.False(hasMore);
        }

        [Fact]
        public async Task List_WithRequestorEmail_WorksWithPagination()
        {
            // Arrange - Add more requests for John to test pagination
            for (int i = 4; i <= 25; i++)
            {
                _context.MeetingRequests.Add(new MeetingRequest
                {
                    Id = i,
                    Title = $"John's Request {i}",
                    RequestorEmail = "john.doe@example.com",
                    RequestorName = "John Doe",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                    Category = "Test",
                    Classification = "Regular"
                });
            }
            _context.SaveChanges();

            // Act - Get page 1
            var page1Result = await _controller.List(
                classification: null,
                category: null,
                status: null,
                startDate: null,
                endDate: null,
                page: 1,
                pageSize: 20,
                requestorEmail: "john.doe@example.com");

            // Act - Get page 2
            var page2Result = await _controller.List(
                classification: null,
                category: null,
                status: null,
                startDate: null,
                endDate: null,
                page: 2,
                pageSize: 20,
                requestorEmail: "john.doe@example.com");

            // Assert - Page 1
            var page1Ok = Assert.IsType<OkObjectResult>(page1Result);
            var page1Value = page1Ok.Value;
            
            var page1ItemsProperty = page1Value?.GetType().GetProperty("items");
            var page1TotalCountProperty = page1Value?.GetType().GetProperty("totalCount");
            var page1HasMoreProperty = page1Value?.GetType().GetProperty("hasMore");
            
            var page1Items = page1ItemsProperty.GetValue(page1Value) as System.Collections.IEnumerable;
            var page1TotalCount = (int)page1TotalCountProperty.GetValue(page1Value);
            var page1HasMore = (bool)page1HasMoreProperty.GetValue(page1Value);
            
            Assert.Equal(20, page1Items.Cast<object>().Count());
            Assert.Equal(24, page1TotalCount); // John has 24 total requests (2 original + 22 added)
            Assert.True(page1HasMore);

            // Assert - Page 2
            var page2Ok = Assert.IsType<OkObjectResult>(page2Result);
            var page2Value = page2Ok.Value;
            
            var page2ItemsProperty = page2Value?.GetType().GetProperty("items");
            var page2HasMoreProperty = page2Value?.GetType().GetProperty("hasMore");
            
            var page2Items = page2ItemsProperty.GetValue(page2Value) as System.Collections.IEnumerable;
            var page2HasMore = (bool)page2HasMoreProperty.GetValue(page2Value);
            
            Assert.Equal(4, page2Items.Cast<object>().Count()); // Remaining 4 items
            Assert.False(page2HasMore);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
