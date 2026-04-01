namespace VibeCode.Server.Models;

/// <summary>
/// Response payload for user operations (excludes sensitive fields)
/// </summary>
public record UserResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    
    /// <summary>
    /// Factory method for projection from User entity
    /// </summary>
    public static UserResponse FromEntity(User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email,
        CreatedAt = user.CreatedAt
    };
}
