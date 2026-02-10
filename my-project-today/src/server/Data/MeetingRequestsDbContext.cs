using Microsoft.EntityFrameworkCore;

public class MeetingRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string MeetingDate { get; set; } = string.Empty;
    public string AlternateDate { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Subcategory { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Comments { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public bool IsDraft { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MeetingRequestsDbContext : DbContext
{
    public MeetingRequestsDbContext(DbContextOptions<MeetingRequestsDbContext> options) : base(options) { }

    public DbSet<MeetingRequest> MeetingRequests { get; set; } = null!;
}
