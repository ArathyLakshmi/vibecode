namespace VibeCode.Server.Models;

/// <summary>
/// Request payload for creating a new user
/// </summary>
public record CreateUserRequest
{
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty; // Plaintext, will be hashed
}
