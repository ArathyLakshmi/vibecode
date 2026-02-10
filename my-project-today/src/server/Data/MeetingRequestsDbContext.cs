using Microsoft.EntityFrameworkCore;

public class MeetingRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    // 5-digit reference number, e.g. "01234"
    public string? ReferenceNumber { get; set; }
    // Requestor details
    public string RequestorName { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateTime? MeetingDate { get; set; }
    public DateTime? AlternateDate { get; set; }
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
