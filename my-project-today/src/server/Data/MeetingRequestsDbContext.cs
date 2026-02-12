using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Models;

public class MeetingRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    // 5-digit reference number, e.g. "01234"
    public string? ReferenceNumber { get; set; }
    // Requestor details
    public string RequestorName { get; set; } = string.Empty;
    public string? RequestorEmail { get; set; }  // Email for filtering and user matching
    public string RequestType { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateTime? MeetingDate { get; set; }
    public DateTime? AlternateDate { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Subcategory { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Comments { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft, Pending, Approved, Confirmed, Announced
    public bool IsDraft { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public string? CreatedBy { get; set; }
}

public class MeetingRequestAudit
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
}

public class MeetingRequestsDbContext : DbContext
{
    public MeetingRequestsDbContext(DbContextOptions<MeetingRequestsDbContext> options) : base(options) { }

    public DbSet<MeetingRequest> MeetingRequests { get; set; } = null!;
    public DbSet<MeetingRequestAudit> MeetingRequestAudits { get; set; } = null!;
    public DbSet<MeetingRequestAttachment> MeetingRequestAttachments { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<MeetingRequestAttachment>(entity =>
        {
            entity.HasIndex(e => e.MeetingRequestId);
            entity.HasIndex(e => e.StoredFileName).IsUnique();
            
            entity.HasOne(a => a.MeetingRequest)
                .WithMany()
                .HasForeignKey(a => a.MeetingRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
