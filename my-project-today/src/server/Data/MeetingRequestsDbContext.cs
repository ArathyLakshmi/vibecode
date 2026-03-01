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
    
    // Registration feature properties
    public int? MaxAttendees { get; set; }
    public int? RegistrationDeadlineMinutes { get; set; } = 30;
    
    // Navigation property for registrations
    public ICollection<MeetingRegistration>? Registrations { get; set; }
}

public class MeetingRegistration
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public string Status { get; set; } = "Confirmed"; // Confirmed, Waitlisted, Cancelled, Attended
    public int? WaitlistPosition { get; set; }
    public DateTime? CancellationDate { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation property
    public MeetingRequest? MeetingRequest { get; set; }
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

public class MeetingAgenda
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public MeetingRequest? MeetingRequest { get; set; }
}

public class MeetingAgendaItem
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; }
    public MeetingRequest? MeetingRequest { get; set; }
}

public class MeetingRequestsDbContext : DbContext
{
    public MeetingRequestsDbContext(DbContextOptions<MeetingRequestsDbContext> options) : base(options) { }

    public DbSet<MeetingRequest> MeetingRequests { get; set; } = null!;
    public DbSet<MeetingRequestAudit> MeetingRequestAudits { get; set; } = null!;
    public DbSet<MeetingRequestAttachment> MeetingRequestAttachments { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<MeetingAgenda> MeetingAgendas { get; set; } = null!;
    public DbSet<MeetingAgendaItem> MeetingAgendaItems { get; set; } = null!;
    public DbSet<MeetingRegistration> MeetingRegistrations { get; set; } = null!;

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

        // User entity configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.Property(u => u.Name).IsRequired().HasMaxLength(200);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.CreatedAt).IsRequired();
        });

        // Meeting Agenda entity configuration
        modelBuilder.Entity<MeetingAgenda>(entity =>
        {
            entity.HasIndex(e => e.MeetingRequestId).IsUnique();
            
            entity.HasOne(a => a.MeetingRequest)
                .WithMany()
                .HasForeignKey(a => a.MeetingRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Meeting Agenda Item entity configuration
        modelBuilder.Entity<MeetingAgendaItem>(entity =>
        {
            entity.HasIndex(e => e.MeetingRequestId);
            entity.HasIndex(e => new { e.MeetingRequestId, e.OrderIndex });
            
            entity.HasOne(a => a.MeetingRequest)
                .WithMany()
                .HasForeignKey(a => a.MeetingRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Meeting Registration entity configuration
        modelBuilder.Entity<MeetingRegistration>(entity =>
        {
            entity.HasKey(r => r.Id);
            
            // Indexes for query performance
            entity.HasIndex(r => r.MeetingRequestId);
            entity.HasIndex(r => r.UserEmail);
            entity.HasIndex(r => r.Status);
            entity.HasIndex(r => r.WaitlistPosition);
            
            // Unique constraint: one registration per user per meeting
            entity.HasIndex(r => new { r.MeetingRequestId, r.UserEmail }).IsUnique();
            
            // Foreign key relationship
            entity.HasOne(r => r.MeetingRequest)
                .WithMany(m => m.Registrations)
                .HasForeignKey(r => r.MeetingRequestId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Property constraints
            entity.Property(r => r.UserEmail).IsRequired().HasMaxLength(255);
            entity.Property(r => r.UserName).IsRequired().HasMaxLength(255);
            entity.Property(r => r.Status).IsRequired().HasMaxLength(20);
            entity.Property(r => r.CancellationReason).HasMaxLength(1000);
        });
    }
}
