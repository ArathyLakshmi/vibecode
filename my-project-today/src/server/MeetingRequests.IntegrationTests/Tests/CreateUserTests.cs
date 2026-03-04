using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VibeCode.Server.Models;
using Xunit;

namespace MeetingRequests.IntegrationTests.Tests;

/// <summary>
/// Integration tests for POST /api/users endpoint
/// TEST-FIRST approach: These tests are written BEFORE the controller implementation
/// </summary>
public class CreateUserTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public CreateUserTests(WebApplicationFactory<Program> factory)
    {
        // Generate unique database name for this test run
        var databaseName = "TestDb_" + Guid.NewGuid().ToString();
        
        // Configure test server with in-memory database
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove existing DbContext configuration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<MeetingRequestsDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database for testing with shared root
                services.AddDbContext<MeetingRequestsDbContext>(options =>
                {
                    options.UseInMemoryDatabase(databaseName);
                    options.EnableSensitiveDataLogging();
                });
            });
        });

        _client = _factory.CreateClient();
        
        // Initialize database schema by making a request (schema created on first access)
        var initScope = _factory.Services.CreateScope();
        var initDb = initScope.ServiceProvider.GetRequiredService<MeetingRequestsDbContext>();
        initDb.Database.EnsureCreated();
        initScope.Dispose();
    }

    /// <summary>
    /// T022: Test valid user creation returns 201 Created and hashes password
    /// Expected to FAIL initially (RED phase) - UsersController doesn't exist yet
    /// </summary>
    [Fact]
    public async Task CreateUser_ValidData_Returns201Created_AndHashesPassword()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Name = "Jane Doe",
            Email = "jane@example.com",
            Password = "SecureP@ss123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var userResponse = await response.Content.ReadFromJsonAsync<UserResponse>();
        Assert.NotNull(userResponse);
        Assert.Equal("Jane Doe", userResponse.Name);
        Assert.Equal("jane@example.com", userResponse.Email);
        Assert.True(userResponse.Id > 0);
        Assert.True(userResponse.CreatedAt <= DateTime.UtcNow);

        // Verify password was hashed (not stored as plaintext)
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MeetingRequestsDbContext>();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "jane@example.com");
        Assert.NotNull(user);
        Assert.NotEqual("SecureP@ss123", user.PasswordHash); // Must not be plaintext
        Assert.StartsWith("AQAAAA", user.PasswordHash); // PBKDF2 hash format
    }

    /// <summary>
    /// T023: Test duplicate email returns 409 Conflict
    /// Expected to FAIL initially (RED phase)
    /// </summary>
    [Fact]
    public async Task CreateUser_DuplicateEmail_Returns409Conflict()
    {
        // Arrange - create first user
        var firstRequest = new CreateUserRequest
        {
            Name = "John Doe",
            Email = "duplicate@example.com",
            Password = "Pass123word!"
        };
        await _client.PostAsJsonAsync("/api/users", firstRequest);

        // Act - attempt to create second user with same email
        var secondRequest = new CreateUserRequest
        {
            Name = "Jane Smith",
            Email = "duplicate@example.com", // Same email
            Password = "DifferentP@ss456"
        };
        var response = await _client.PostAsJsonAsync("/api/users", secondRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        
        var errorResponse = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(errorResponse);
        Assert.Equal("email", errorResponse["field"]);
        Assert.Contains("already in use", errorResponse["message"], StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// T024: Test invalid email returns 400 Bad Request
    /// Expected to FAIL initially (RED phase)
    /// </summary>
    [Fact]
    public async Task CreateUser_InvalidEmail_Returns400BadRequest()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Name = "Bad Email User",
            Email = "not-an-email", // Invalid format
            Password = "ValidP@ss123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// T024: Test weak password returns 400 Bad Request
    /// Expected to FAIL initially (RED phase)
    /// </summary>
    [Fact]
    public async Task CreateUser_WeakPassword_Returns400BadRequest()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Name = "Weak Password User",
            Email = "weak@example.com",
            Password = "short" // Too short, no uppercase, no number
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("8", error); // Should mention 8 character requirement
    }

    /// <summary>
    /// T024: Test missing name returns 400 Bad Request
    /// Expected to FAIL initially (RED phase)
    /// </summary>
    [Fact]
    public async Task CreateUser_MissingName_Returns400BadRequest()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Name = "", // Empty name
            Email = "noname@example.com",
            Password = "ValidP@ss123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
