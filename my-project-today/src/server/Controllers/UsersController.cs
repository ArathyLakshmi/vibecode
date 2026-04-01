using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Models;
using System.Text.RegularExpressions;

namespace VibeCode.Server.Controllers;

/// <summary>
/// API controller for user management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly MeetingRequestsDbContext _db;
    private readonly PasswordHasher<User> _passwordHasher;

    public UsersController(MeetingRequestsDbContext db)
    {
        _db = db;
        _passwordHasher = new PasswordHasher<User>();
    }

    /// <summary>
    /// Create a new user with hashed password
    /// </summary>
    /// <param name="request">User creation request with Name, Email, Password</param>
    /// <returns>201 Created with UserResponse, or 400/409 on validation errors</returns>
    [HttpPost]
    public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request)
    {
        // Validate Name (required)
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { field = "name", message = "Name is required" });
        }

        // Validate Email format (must contain @)
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains("@"))
        {
            return BadRequest(new { field = "email", message = "Invalid email format" });
        }

        // Validate Email uniqueness
        var emailExists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
        {
            return Conflict(new { field = "email", message = "Email already in use" });
        }

        // Validate Password strength
        // Must be at least 8 characters with uppercase, lowercase, and number
        if (string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < 8 ||
            !Regex.IsMatch(request.Password, @"[A-Z]") ||
            !Regex.IsMatch(request.Password, @"[a-z]") ||
            !Regex.IsMatch(request.Password, @"[0-9]"))
        {
            return BadRequest(new
            {
                field = "password",
                message = "Password must be at least 8 characters and contain uppercase, lowercase, and number"
            });
        }

        // Create user entity
        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            CreatedAt = DateTime.UtcNow,
            // Optional: Set CreatedBy from claims if authenticated
            CreatedBy = User.Identity?.Name
        };

        // Hash password using PBKDF2 (PasswordHasher outputs base64 with "AQAAAA" prefix)
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        // Save to database
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Return 201 Created with UserResponse (excludes PasswordHash)
        var response = UserResponse.FromEntity(user);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, response);
    }

    /// <summary>
    /// Get user by ID (required for CreatedAtAction route)
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponse>> GetUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        return UserResponse.FromEntity(user);
    }
}
