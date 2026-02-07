# Backend Development Guide

Complete guide for developing the Board Meeting Request & Voting System ASP.NET Core 8 REST API.

## Quick Start (10 min)

```bash
# 1. Navigate to backend
cd backend

# 2. Verify .NET SDK (should be 8.0.204)
dotnet --version

# 3. Restore dependencies
dotnet restore

# 4. Create LocalDB database
dotnet ef database update --project src/BoardMeeting.Data

# 5. Run development server
dotnet run --project src/BoardMeeting.Api --launch-profile Development
```

Expected output:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
```

✅ Backend running on **http://localhost:5000** or **https://localhost:5001**

## Project Structure

```
backend/
├── src/
│   ├── BoardMeeting.Api/           # ASP.NET Core 8 REST API
│   │   ├── Program.cs              # Startup config, middleware, DI
│   │   ├── Endpoints/              # Minimal API endpoint handlers
│   │   │   ├── MeetingEndpoints.cs
│   │   │   ├── DocumentEndpoints.cs
│   │   │   └── VoteEndpoints.cs
│   │   ├── Services/               # Business logic layer
│   │   │   ├── MeetingRequestService.cs
│   │   │   ├── DocumentService.cs
│   │   │   └── VoteService.cs
│   │   ├── Models/                 # API DTOs (request/response)
│   │   │   ├── CreateMeetingRequestRequest.cs
│   │   │   ├── MeetingRequestResponse.cs
│   │   │   └── Validators/         # FluentValidation
│   │   ├── appsettings.Development.json
│   │   ├── appsettings.json
│   │   └── .csproj
│   │
│   └── BoardMeeting.Data/          # Entity Framework Core layer
│       ├── Entities/               # Domain models (EF Core)
│       │   ├── User.cs
│       │   ├── MeetingRequest.cs
│       │   ├── Meeting.cs
│       │   ├── Document.cs
│       │   ├── Vote.cs
│       │   ├── VoteSubmission.cs
│       │   ├── DocumentAccess.cs
│       │   └── MeetingParticipant.cs
│       ├── Migrations/             # EF Core database migrations
│       ├── BoardMeetingDbContext.cs # DbContext configuration
│       ├── SeedData.cs             # Initial data seeding
│       └── .csproj
│
├── tests/
│   ├── BoardMeeting.Tests/         # xUnit tests
│   │   ├── Services/
│   │   │   ├── MeetingRequestServiceTests.cs
│   │   │   └── VoteServiceTests.cs
│   │   ├── Endpoints/
│   │   │   └── MeetingEndpointsTests.cs
│   │   └── BuildWebHostFactory.cs  # Test host setup
│   └── .csproj
│
├── global.json                      # Locks .NET SDK to 8.0.204
├── README.md                        # Quick setup guide
└── .gitignore                       # .NET ignore patterns
```

## Setting Up Database

### Option 1: SQL Server LocalDB (Recommended for Windows)

LocalDB is a lightweight SQL Server for development.

```bash
# 1. Install SQL Server LocalDB (if not installed)
# Download from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads

# 2. Create & apply migrations
cd backend
dotnet ef database update --project src/BoardMeeting.Data

# 3. Verify database created
# LocalDB location: C:\Users\YOUR_USER\AppData\Local\Microsoft\Microsoft SQL Server Local DB\Instances\

# 4. Query with SQL Server Management Studio (SSMS)
# Connection string: (localdb)\mssqllocaldb
```

Database file is automatically created. Connection string in `appsettings.Development.json`:
```
"DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=BoardMeetingDB;Integrated Security=true;"
```

### Option 2: Docker SQL Server 2022

For consistent environment across Windows/Mac/Linux:

```bash
# 1. Start SQL Server container
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Password123!' \
  -e 'MSSQL_SA_PASSWORD=Password123!' \
  -p 1433:1433 \
  -d mcr.microsoft.com/mssql/server:2022-latest

# 2. Update connection string (appsettings.Development.json)
"DefaultConnection": "Server=localhost,1433;Database=BoardMeetingDB;User Id=sa;Password=Password123!;TrustServerCertificate=true;"

# 3. Apply migrations
cd backend
dotnet ef database update --project src/BoardMeeting.Data
```

**Verify container running**:
```bash
docker ps
# Find SQL Server image running on port 1433
```

## Database Migrations (EF Core)

### Creating Migrations

When you modify Entity classes, create a migration:

```bash
cd backend

# Create migration after adding/modifying entities
dotnet ef migrations add InitialCreate --project src/BoardMeeting.Data

# This generates: src/BoardMeeting.Data/Migrations/{timestamp}_InitialCreate.cs
```

**Migration file structure**:
```csharp
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Email = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Role = table.Column<int>(type: "int", nullable: false),
                // ... other columns
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Users");
    }
}
```

### Applying Migrations

```bash
# Apply latest migration to database
dotnet ef database update --project src/BoardMeeting.Data

# Apply specific migration
dotnet ef database update InitialCreate --project src/BoardMeeting.Data

# Rollback to previous migration
dotnet ef database update PreviousMigration --project src/BoardMeeting.Data

# Remove last migration (before applied)
dotnet ef migrations remove --project src/BoardMeeting.Data
```

### Viewing Migration History

```bash
# List applied migrations
dotnet ef migrations list --project src/BoardMeeting.Data

# View current schema
# Use SQL Server Management Studio (SSMS) or Azure Data Studio
```

## Entity Framework Core Setup

### DbContext (src/BoardMeeting.Data/BoardMeetingDbContext.cs)

```csharp
using Microsoft.EntityFrameworkCore;
using BoardMeeting.Data.Entities;

namespace BoardMeeting.Data;

public class BoardMeetingDbContext : DbContext
{
    public BoardMeetingDbContext(DbContextOptions<BoardMeetingDbContext> options)
        : base(options)
    {
    }

    // DbSets for each entity
    public DbSet<User> Users => Set<User>();
    public DbSet<MeetingRequest> MeetingRequests => Set<MeetingRequest>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<VoteSubmission> VoteSubmissions => Set<VoteSubmission>();
    public DbSet<DocumentAccess> DocumentAccess => Set<DocumentAccess>();
    public DbSet<MeetingParticipant> MeetingParticipants => Set<MeetingParticipant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure relationships, indices, temporal tables, etc.
        modelBuilder.Entity<MeetingRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            
            entity.HasOne(e => e.Requester)
                .WithMany()
                .HasForeignKey(e => e.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure temporal table for audit trail
            entity.ToTable(t => t.IsTemporal(
                ttb =>
                {
                    ttb.HasPeriodStart("PeriodStart");
                    ttb.HasPeriodEnd("PeriodEnd");
                    ttb.UseHistoryTable("MeetingRequestsHistory");
                }));
        });
    }
}
```

### Entity Example (src/BoardMeeting.Data/Entities/MeetingRequest.cs)

```csharp
namespace BoardMeeting.Data.Entities;

public class MeetingRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RequesterId { get; set; }
    public DateTime ProposedDate { get; set; }
    public MeetingRequestStatus Status { get; set; } = MeetingRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    public string? ResponseUserId { get; set; }
    public string? RejectionReason { get; set; }

    // Navigation properties
    public required User Requester { get; set; }
    public User? ResponsibleAdmin { get; set; }
    public Meeting? Meeting { get; set; }
}

public enum MeetingRequestStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3,
}
```

## Implementing Endpoints

### Minimal APIs Pattern (ASP.NET Core 8)

**Program.cs configuration**:
```csharp
var builder = WebApplication.CreateBuilder(args);

// 1. Add services
builder.Services.AddScoped<BoardMeetingDbContext>();
builder.Services.AddScoped<MeetingRequestService>();
builder.Services.AddScoped<VoteService>();
// ... other services

// 2. Add middleware
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", b =>
        b.AllowAnyOrigin()
         .AllowAnyMethod()
         .AllowAnyHeader());
});

var app = builder.Build();

// 3. Use middleware
app.UseHttpsRedirection();
app.UseCors("AllowAll");

// 4. Map endpoints
app.MapGroup("/v1/meeting-requests")
    .WithName("Meeting Requests")
    .MapMeetingEndpoints();

app.MapGroup("/v1/votes")
    .WithName("Votes")
    .MapVoteEndpoints();

app.Run();
```

### Endpoint Implementation (src/BoardMeeting.Api/Endpoints/MeetingEndpoints.cs)

```csharp
using Microsoft.AspNetCore.Mvc;
using BoardMeeting.Data;
using BoardMeeting.Api.Services;
using BoardMeeting.Api.Models;

namespace BoardMeeting.Api.Endpoints;

public static class MeetingEndpoints
{
    public static void MapMeetingEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/", CreateMeetingRequest)
            .WithName("CreateMeetingRequest")
            .WithOpenApi();

        group.MapGet("/", GetMeetingRequests)
            .WithName("GetMeetingRequests")
            .WithOpenApi();

        group.MapPost("/{id}/approve", ApproveMeetingRequest)
            .WithName("ApproveMeetingRequest")
            .WithOpenApi();

        group.MapPost("/{id}/reject", RejectMeetingRequest)
            .WithName("RejectMeetingRequest")
            .WithOpenApi();
    }

    private static async Task<IResult> CreateMeetingRequest(
        [FromBody] CreateMeetingRequestRequest request,
        MeetingRequestService service)
    {
        try
        {
            var result = await service.CreateRequestAsync(request);
            return Results.Created($"/v1/meeting-requests/{result.Id}", result);
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.Problem("Internal server error", statusCode: 500);
        }
    }

    private static async Task<IResult> GetMeetingRequests(
        [FromQuery] string? status,
        MeetingRequestService service)
    {
        var results = await service.GetRequestsAsync(status);
        return Results.Ok(results);
    }

    private static async Task<IResult> ApproveMeetingRequest(
        [FromRoute] string id,
        [FromBody] ApproveMeetingRequestRequest request,
        MeetingRequestService service)
    {
        try
        {
            var result = await service.ApproveRequestAsync(id, request.MeetingDate, request.AdminId);
            return Results.Ok(result);
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(new { error = ex.Message });
        }
        catch (ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    private static async Task<IResult> RejectMeetingRequest(
        [FromRoute] string id,
        [FromBody] RejectMeetingRequestRequest request,
        MeetingRequestService service)
    {
        try
        {
            await service.RejectRequestAsync(id, request.Reason, request.AdminId);
            return Results.NoContent();
        }
        catch (NotFoundException ex)
        {
            return Results.NotFound(new { error = ex.Message });
        }
    }
}
```

## Service Implementation

### Business Logic (src/BoardMeeting.Api/Services/MeetingRequestService.cs)

```csharp
using Microsoft.EntityFrameworkCore;
using BoardMeeting.Data;
using BoardMeeting.Data.Entities;
using BoardMeeting.Api.Models;

namespace BoardMeeting.Api.Services;

public class MeetingRequestService
{
    private readonly BoardMeetingDbContext _context;
    private readonly ILogger<MeetingRequestService> _logger;

    public MeetingRequestService(
        BoardMeetingDbContext context,
        ILogger<MeetingRequestService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<MeetingRequestResponse> CreateRequestAsync(
        CreateMeetingRequestRequest request)
    {
        // Validate
        if (request.ProposedDate < DateTime.UtcNow.AddDays(1))
            throw new ValidationException("Meeting must be at least 1 day from now");

        // Create entity
        var entity = new MeetingRequest
        {
            RequesterId = request.RequesterId,
            ProposedDate = request.ProposedDate,
            Status = MeetingRequestStatus.Pending,
        };

        _context.MeetingRequests.Add(entity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Meeting request created: {RequestId}", entity.Id);

        return new MeetingRequestResponse
        {
            Id = entity.Id,
            ProposedDate = entity.ProposedDate,
            Status = entity.Status.ToString(),
        };
    }

    public async Task<List<MeetingRequestResponse>> GetRequestsAsync(string? status)
    {
        var query = _context.MeetingRequests.AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(r => r.Status.ToString() == status);
        }

        var results = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new MeetingRequestResponse
            {
                Id = r.Id,
                ProposedDate = r.ProposedDate,
                Status = r.Status.ToString(),
                CreatedAt = r.CreatedAt,
            })
            .ToListAsync();

        return results;
    }

    public async Task<MeetingRequestResponse> ApproveRequestAsync(
        string requestId,
        DateTime meetingDate,
        string adminId)
    {
        var request = await _context.MeetingRequests
            .FirstOrDefaultAsync(r => r.Id == requestId);

        if (request == null)
            throw new NotFoundException($"Meeting request {requestId} not found");

        if (request.Status != MeetingRequestStatus.Pending)
            throw new ValidationException($"Cannot approve request with status {request.Status}");

        // Check for conflicting meetings on same date
        var conflict = await _context.Meetings
            .AnyAsync(m => m.ScheduledDate.Date == meetingDate.Date && !m.IsCancelled);

        if (conflict)
            throw new ValidationException("Meeting already scheduled for that date");

        // Create meeting
        var meeting = new Meeting
        {
            ScheduledDate = meetingDate,
            Status = MeetingStatus.Scheduled,
        };

        request.Status = MeetingRequestStatus.Approved;
        request.RespondedAt = DateTime.UtcNow;
        request.ResponseUserId = adminId;
        request.Meeting = meeting;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Meeting request approved: {RequestId}", requestId);

        return new MeetingRequestResponse
        {
            Id = request.Id,
            ProposedDate = request.ProposedDate,
            Status = request.Status.ToString(),
        };
    }
}
```

## Testing

### Unit Tests with xUnit

```bash
# Run all tests
dotnet test

# Run specific test file
dotnet test tests/BoardMeeting.Tests/Services/MeetingRequestServiceTests.cs

# Run with verbose output
dotnet test --verbosity detailed

# Run with coverage
dotnet test /p:CollectCoverage=true
```

### Example Test (tests/BoardMeeting.Tests/Services/MeetingRequestServiceTests.cs)

```csharp
using Xunit;
using Microsoft.EntityFrameworkCore;
using BoardMeeting.Data;
using BoardMeeting.Api.Services;
using BoardMeeting.Api.Models;

namespace BoardMeeting.Tests.Services;

public class MeetingRequestServiceTests : IDisposable
{
    private readonly BoardMeetingDbContext _context;
    private readonly MeetingRequestService _service;

    public MeetingRequestServiceTests()
    {
        // Use in-memory database for tests
        var options = new DbContextOptionsBuilder<BoardMeetingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new BoardMeetingDbContext(options);
        _service = new MeetingRequestService(_context, new NullLogger<MeetingRequestService>());
    }

    [Fact]
    public async Task CreateRequest_ValidInput_CreatesAndReturns()
    {
        // Arrange
        var request = new CreateMeetingRequestRequest
        {
            RequesterId = "user-123",
            ProposedDate = DateTime.UtcNow.AddDays(5),
        };

        // Act
        var result = await _service.CreateRequestAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Id);
        Assert.Equal("Pending", result.Status);
        Assert.Equal(request.ProposedDate, result.ProposedDate);
    }

    [Fact]
    public async Task CreateRequest_DateInPast_Throws()
    {
        // Arrange
        var request = new CreateMeetingRequestRequest
        {
            RequesterId = "user-123",
            ProposedDate = DateTime.UtcNow.AddHours(-1),
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _service.CreateRequestAsync(request));
    }

    [Fact]
    public async Task ApproveRequest_ValidInput_Updates()
    {
        // Arrange
        var meetingRequest = new MeetingRequest
        {
            RequesterId = "user-123",
            ProposedDate = DateTime.UtcNow.AddDays(5),
            Status = MeetingRequestStatus.Pending,
        };
        _context.MeetingRequests.Add(meetingRequest);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ApproveRequestAsync(
            meetingRequest.Id,
            DateTime.UtcNow.AddDays(5),
            "admin-456"
        );

        // Assert
        Assert.Equal("Approved", result.Status);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
```

## Logging & Debugging

### Viewing Logs

Add to `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information",
      "Microsoft.AspNetCore": "Debug"
    }
  }
}
```

Logs output to console during `dotnet run`.

### SQL Queries

To see SQL queries generated by EF Core:

```csharp
// In Program.cs
services.AddScoped(sp =>
{
    var context = new BoardMeetingDbContext(...);
    context.Database.EnableSensitiveDataLogging();
    context.Database.LogTo(Console.WriteLine);
    return context;
});
```

Or enable in configuration:
```json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

### Visual Studio Debugging

Set breakpoint in code → Press F5 → Execution pauses at breakpoint.

In Watch window:
```
_context.MeetingRequests.ToList()  // View all meeting requests
request.Status                      // Inspect current status
```

## Deployment

### Local Development
```bash
dotnet run --project src/BoardMeeting.Api --launch-profile Development
```

### Staging
```bash
dotnet publish -c Release -o ./publish
dotnet publish src/BoardMeeting.Api/BoardMeeting.Api.csproj -c Release
```

### Production (Azure App Service)
```bash
# Build image
docker build -t ubs-board-meeting:latest .

# Push to Azure Container Registry
az acr build --registry myregistry --image ubs-board-meeting:latest .

# Deploy to App Service
az webapp create -g mygroup -p myplan -n ubs-board-meeting \
  -i myregistry.azurecr.io/ubs-board-meeting:latest
```

## Development Tips

1. **Hot Reload**: Edit code while app running
   ```bash
   dotnet watch run --project src/BoardMeeting.Api
   ```

2. **Database Reset**: 
   ```bash
   dotnet ef database drop --project src/BoardMeeting.Data
   dotnet ef database update --project src/BoardMeeting.Data
   ```

3. **Seed Sample Data**:
   ```csharp
   // In Program.cs after migrations
   using (var scope = app.Services.CreateScope())
   {
       var db = scope.ServiceProvider.GetRequiredService<BoardMeetingDbContext>();
       await SeedData.SeedAsync(db);
   }
   ```

4. **API Documentation**:
   ```bash
   # Swagger OpenAPI docs at:
   # http://localhost:5000/swagger
   ```

## Next Steps

1. **Apply database migration**: `dotnet ef database update --project src/BoardMeeting.Data`
2. **Implement P1 endpoints** (meeting requests): Create, List, Approve, Reject
3. **Add authentication** middleware for Azure AD & magic links
4. **Implement P2 endpoints** (documents, votes)
5. **Unit tests** for services
6. **Integration tests** for endpoints

## Resources

- [ASP.NET Core 8 Docs](https://learn.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/)
- [Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/)
- [xUnit Testing](https://xunit.net/)
- [FluentValidation](https://fluentvalidation.net/)
