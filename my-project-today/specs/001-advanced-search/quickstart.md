# Advanced Search Implementation Quickstart

**Feature**: 001-advanced-search  
**Branch**: `001-advanced-search`  
**Target Sprint**: 2 weeks  
**Estimated Effort**: 40-60 hours

---

## Overview

This guide provides step-by-step instructions for implementing the Advanced Search & Filtering feature. Follow these phases sequentially for optimal results.

**Feature Summary**:
- Multi-criteria filtering (categories, statuses, classifications, requestors, date ranges)
- Boolean text search with AND/OR/NOT operators
- Saved searches (CRUD operations)
- Export to CSV/PDF
- Performance-optimized queries (<500ms target)

---

## Prerequisites

### Environment Setup

1. **Development Tools**:
   - Visual Studio 2022 or VS Code with C# extensions
   - Node.js 18+ and npm 9+
   - SQLite Browser (for database inspection)
   - Postman or similar (API testing)

2. **Local Development Environment**:
   ```powershell
   # Clone and checkout feature branch
   git checkout -b 001-advanced-search
   
   # Install backend dependencies
   dotnet restore
   
   # Install frontend dependencies
   cd src/client
   npm install
   cd ../..
   ```

3. **Database Baseline**:
   - Ensure `meetingrequests.db` exists with seed data
   - Run existing migrations: `dotnet ef database update`

---

## Phase 0: Database Schema Updates

**Goal**: Add SavedSearches table and optimize indexes for filtering

**Estimated Time**: 2 hours

### Step 1: Create Migration

```powershell
cd src/server
dotnet ef migrations add AddAdvancedSearchSupport
```

### Step 2: Update Migration File

Edit the generated migration file to include:

**Up Migration**:
```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Create SavedSearches table
    migrationBuilder.CreateTable(
        name: "SavedSearches",
        columns: table => new
        {
            Id = table.Column<int>(nullable: false)
                .Annotation("Sqlite:Autoincrement", true),
            UserId = table.Column<string>(maxLength: 450, nullable: false),
            Name = table.Column<string>(maxLength: 100, nullable: false),
            Description = table.Column<string>(maxLength: 500, nullable: true),
            FilterCriteria = table.Column<string>(nullable: false),
            CreatedAt = table.Column<DateTime>(nullable: false),
            UpdatedAt = table.Column<DateTime>(nullable: false)
        },
        constraints: table =>
        {
            table.PrimaryKey("PK_SavedSearches", x => x.Id);
        });

    // Create indexes
    migrationBuilder.CreateIndex(
        name: "idx_savedsearches_userid_name",
        table: "SavedSearches",
        columns: new[] { "UserId", "Name" },
        unique: true);

    migrationBuilder.CreateIndex(
        name: "idx_savedsearches_updatedat",
        table: "SavedSearches",
        column: "UpdatedAt");

    // Optimize MeetingRequests table for filtering
    migrationBuilder.CreateIndex(
        name: "idx_meetingrequests_category_status_meetingdate",
        table: "MeetingRequests",
        columns: new[] { "Category", "Status", "MeetingDate" });

    migrationBuilder.CreateIndex(
        name: "idx_meetingrequests_meetingdate_status",
        table: "MeetingRequests",
        columns: new[] { "MeetingDate", "Status" });

    migrationBuilder.CreateIndex(
        name: "idx_meetingrequests_createdat_status",
        table: "MeetingRequests",
        columns: new[] { "CreatedAt", "Status" });
}
```

**Down Migration**:
```csharp
protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropTable(name: "SavedSearches");
    
    migrationBuilder.DropIndex(
        name: "idx_meetingrequests_category_status_meetingdate",
        table: "MeetingRequests");
    
    migrationBuilder.DropIndex(
        name: "idx_meetingrequests_meetingdate_status",
        table: "MeetingRequests");
    
    migrationBuilder.DropIndex(
        name: "idx_meetingrequests_createdat_status",
        table: "MeetingRequests");
}
```

### Step 3: Apply Migration

```powershell
dotnet ef database update
```

### Step 4: Verify Schema

```powershell
# Open SQLite Browser and verify:
# - SavedSearches table exists with all columns
# - Indexes created on MeetingRequests (check indexes tab)
```

**Validation**: Schema changes match [data-model.md](data-model.md)

---

## Phase 1: Backend - DTOs and Models

**Goal**: Define data transfer objects and domain models

**Estimated Time**: 3 hours

### Step 1: Create DTOs

**File**: `src/server/Models/DTOs/FilterCriteriaDto.cs`

```csharp
namespace VibeCode.Server.Models.DTOs;

public class FilterCriteriaDto
{
    public List<string>? Categories { get; set; }
    public List<string>? Statuses { get; set; }
    public List<string>? Classifications { get; set; }
    public List<string>? Requestors { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Query { get; set; }
    
    public bool IsEmpty()
    {
        return (Categories == null || Categories.Count == 0) &&
               (Statuses == null || Statuses.Count == 0) &&
               (Classifications == null || Classifications.Count == 0) &&
               (Requestors == null || Requestors.Count == 0) &&
               StartDate == null &&
               EndDate == null &&
               CreatedAfter == null &&
               CreatedBefore == null &&
               string.IsNullOrWhiteSpace(ReferenceNumber) &&
               string.IsNullOrWhiteSpace(Query);
    }
}
```

**File**: `src/server/Models/DTOs/SavedSearchDto.cs`

```csharp
namespace VibeCode.Server.Models.DTOs;

public class SavedSearchDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FilterCriteriaDto FilterCriteria { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSavedSearchDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FilterCriteriaDto FilterCriteria { get; set; } = new();
}

public class UpdateSavedSearchDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FilterCriteriaDto FilterCriteria { get; set; } = new();
}
```

**File**: `src/server/Models/DTOs/SearchResultsDto.cs`

```csharp
namespace VibeCode.Server.Models.DTOs;

public class SearchResultsDto
{
    public List<MeetingRequestDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasMore { get; set; }
    public FilterCriteriaDto? AppliedFilters { get; set; }
    public string? SavedSearchName { get; set; }
}
```

### Step 2: Create Domain Model

**File**: `src/server/Models/SavedSearch.cs`

```csharp
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace VibeCode.Server.Models;

public class SavedSearch
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(450)]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Required]
    public string FilterCriteria { get; set; } = "{}";
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Helper methods
    public FilterCriteriaDto GetFilterCriteria()
    {
        return JsonSerializer.Deserialize<FilterCriteriaDto>(FilterCriteria) 
            ?? new FilterCriteriaDto();
    }
    
    public void SetFilterCriteria(FilterCriteriaDto criteria)
    {
        FilterCriteria = JsonSerializer.Serialize(criteria);
    }
}
```

### Step 3: Update DbContext

**File**: `src/server/Data/MeetingRequestsDbContext.cs`

```csharp
public class MeetingRequestsDbContext : DbContext
{
    // Existing DbSets...
    public DbSet<MeetingRequest> MeetingRequests { get; set; }
    public DbSet<MeetingRequestAudit> MeetingRequestAudits { get; set; }
    public DbSet<User> Users { get; set; }
    
    // Add new DbSet
    public DbSet<SavedSearch> SavedSearches { get; set; }
    
    // ... rest of context
}
```

**Validation**: Build solution to ensure no compilation errors

---

## Phase 2: Backend - Search Query Builder

**Goal**: Implement dynamic query builder for advanced filtering

**Estimated Time**: 6 hours

### Step 1: Create Query Builder Service

**File**: `src/server/Services/MeetingRequestQueryBuilder.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Data;
using VibeCode.Server.Models;
using VibeCode.Server.Models.DTOs;

namespace VibeCode.Server.Services;

public class MeetingRequestQueryBuilder
{
    private readonly MeetingRequestsDbContext _context;

    public MeetingRequestQueryBuilder(MeetingRequestsDbContext context)
    {
        _context = context;
    }

    public IQueryable<MeetingRequest> BuildQuery(FilterCriteriaDto filters)
    {
        var query = _context.MeetingRequests.AsQueryable();

        // Reference number filter (exact match, highest priority)
        if (!string.IsNullOrWhiteSpace(filters.ReferenceNumber))
        {
            query = query.Where(m => 
                m.ReferenceNumber != null && 
                m.ReferenceNumber.ToLower() == filters.ReferenceNumber.ToLower());
            return query; // Early return - reference number is unique
        }

        // Category filter
        if (filters.Categories != null && filters.Categories.Count > 0)
        {
            query = query.Where(m => filters.Categories.Contains(m.Category));
        }

        // Status filter
        if (filters.Statuses != null && filters.Statuses.Count > 0)
        {
            var isDraftStatuses = filters.Statuses
                .Where(s => s.Equals("Draft", StringComparison.OrdinalIgnoreCase))
                .Any();
            
            var otherStatuses = filters.Statuses
                .Where(s => !s.Equals("Draft", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (isDraftStatuses && otherStatuses.Count > 0)
            {
                // Include both drafts and non-drafts with matching status
                query = query.Where(m => 
                    m.IsDraft || 
                    (!m.IsDraft && otherStatuses.Contains(m.Status ?? "")));
            }
            else if (isDraftStatuses)
            {
                query = query.Where(m => m.IsDraft);
            }
            else
            {
                query = query.Where(m => 
                    !m.IsDraft && otherStatuses.Contains(m.Status ?? ""));
            }
        }

        // Classification filter
        if (filters.Classifications != null && filters.Classifications.Count > 0)
        {
            query = query.Where(m => 
                m.Classification != null && 
                filters.Classifications.Contains(m.Classification));
        }

        // Requestor filter
        if (filters.Requestors != null && filters.Requestors.Count > 0)
        {
            query = query.Where(m => 
                m.RequestorName != null && 
                filters.Requestors.Contains(m.RequestorName));
        }

        // Meeting date range
        if (filters.StartDate.HasValue)
        {
            query = query.Where(m => m.MeetingDate >= filters.StartDate.Value);
        }
        if (filters.EndDate.HasValue)
        {
            // Include entire end date (until 23:59:59)
            var endOfDay = filters.EndDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(m => m.MeetingDate <= endOfDay);
        }

        // Created timestamp range
        if (filters.CreatedAfter.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= filters.CreatedAfter.Value);
        }
        if (filters.CreatedBefore.HasValue)
        {
            query = query.Where(m => m.CreatedAt <= filters.CreatedBefore.Value);
        }

        // Boolean text search
        if (!string.IsNullOrWhiteSpace(filters.Query))
        {
            var searchPredicate = BuildBooleanSearchPredicate(filters.Query);
            query = query.Where(searchPredicate);
        }

        return query;
    }

    private Expression<Func<MeetingRequest, bool>> BuildBooleanSearchPredicate(string query)
    {
        // Simple implementation - enhance with BooleanQueryParser later
        var terms = query.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => !t.Equals("AND", StringComparison.OrdinalIgnoreCase))
            .Where(t => !t.Equals("OR", StringComparison.OrdinalIgnoreCase))
            .Where(t => !t.Equals("NOT", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (terms.Count == 0)
        {
            return m => true; // No valid terms
        }

        // Simple AND logic for MVP
        return m =>
            terms.All(term =>
                (m.Title != null && m.Title.ToLower().Contains(term.ToLower())) ||
                (m.Description != null && m.Description.ToLower().Contains(term.ToLower())) ||
                (m.Objectives != null && m.Objectives.ToLower().Contains(term.ToLower()))
            );
    }
}
```

### Step 2: Register Service

**File**: `src/server/Program.cs`

```csharp
// Add service registration
builder.Services.AddScoped<MeetingRequestQueryBuilder>();
```

**Validation**: Write unit tests for query builder logic

---

## Phase 3: Backend - Enhanced Search Endpoint

**Goal**: Extend existing MeetingRequests controller with advanced filtering

**Estimated Time**: 4 hours

### Update Controller

**File**: `src/server/Controllers/MeetingRequestsController.cs`

Find the existing `GetMeetingRequests` method and replace with:

```csharp
[HttpGet]
public async Task<ActionResult<SearchResultsDto>> GetMeetingRequests(
    [FromQuery] List<string>? categories,
    [FromQuery] List<string>? statuses,
    [FromQuery] List<string>? classifications,
    [FromQuery] List<string>? requestors,
    [FromQuery] DateTime? startDate,
    [FromQuery] DateTime? endDate,
    [FromQuery] DateTime? createdAfter,
    [FromQuery] DateTime? createdBefore,
    [FromQuery] string? referenceNumber,
    [FromQuery] string? query,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string sortBy = "createdAt",
    [FromQuery] string sortOrder = "desc")
{
    // Validate pagination
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    // Validate date ranges
    if (startDate.HasValue && endDate.HasValue && startDate > endDate)
    {
        return BadRequest(new { error = "ValidationError", message = "Start date must be before end date" });
    }

    // Build filter criteria
    var filters = new FilterCriteriaDto
    {
        Categories = categories,
        Statuses = statuses,
        Classifications = classifications,
        Requestors = requestors,
        StartDate = startDate,
        EndDate = endDate,
        CreatedAfter = createdAfter,
        CreatedBefore = createdBefore,
        ReferenceNumber = referenceNumber,
        Query = query
    };

    // Build query
    var queryBuilder = new MeetingRequestQueryBuilder(_context);
    var baseQuery = queryBuilder.BuildQuery(filters);

    // Apply sorting
    baseQuery = sortBy.ToLower() switch
    {
        "meetingdate" => sortOrder.ToLower() == "asc" 
            ? baseQuery.OrderBy(m => m.MeetingDate)
            : baseQuery.OrderByDescending(m => m.MeetingDate),
        "title" => sortOrder.ToLower() == "asc"
            ? baseQuery.OrderBy(m => m.Title)
            : baseQuery.OrderByDescending(m => m.Title),
        "referencenumber" => sortOrder.ToLower() == "asc"
            ? baseQuery.OrderBy(m => m.ReferenceNumber)
            : baseQuery.OrderByDescending(m => m.ReferenceNumber),
        _ => sortOrder.ToLower() == "asc"
            ? baseQuery.OrderBy(m => m.CreatedAt)
            : baseQuery.OrderByDescending(m => m.CreatedAt)
    };

    // Get total count
    var totalCount = await baseQuery.CountAsync();

    // Apply pagination
    var items = await baseQuery
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(m => new MeetingRequestDto
        {
            Id = m.Id,
            ReferenceNumber = m.ReferenceNumber,
            Title = m.Title,
            Description = m.Description,
            Objectives = m.Objectives,
            Category = m.Category,
            Classification = m.Classification,
            MeetingDate = m.MeetingDate,
            Duration = m.Duration,
            Location = m.Location,
            RequestorName = m.RequestorName,
            RequestorEmail = m.RequestorEmail,
            RequestorDepartment = m.RequestorDepartment,
            Status = m.IsDraft ? "Draft" : m.Status,
            IsDraft = m.IsDraft,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt
        })
        .ToListAsync();

    var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

    return Ok(new SearchResultsDto
    {
        Items = items,
        Page = page,
        PageSize = pageSize,
        TotalCount = totalCount,
        TotalPages = totalPages,
        HasMore = page < totalPages,
        AppliedFilters = filters
    });
}
```

**Validation**: Test with Postman using various filter combinations

---

## Phase 4: Backend - Saved Searches API

**Goal**: Implement CRUD endpoints for saved searches

**Estimated Time**: 5 hours

### Create Controller

**File**: `src/server/Controllers/SavedSearchesController.cs`

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VibeCode.Server.Data;
using VibeCode.Server.Models;
using VibeCode.Server.Models.DTOs;

namespace VibeCode.Server.Controllers;

[ApiController]
[Route("api/saved-searches")]
[Authorize]
public class SavedSearchesController : ControllerBase
{
    private readonly MeetingRequestsDbContext _context;

    public SavedSearchesController(MeetingRequestsDbContext context)
    {
        _context = context;
    }

    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("preferred_username")?.Value 
            ?? "unknown";
    }

    [HttpPost]
    public async Task<ActionResult<SavedSearchDto>> CreateSavedSearch(CreateSavedSearchDto dto)
    {
        var userId = GetUserId();

        // Validate name uniqueness
        var exists = await _context.SavedSearches
            .AnyAsync(s => s.UserId == userId && s.Name == dto.Name);
        
        if (exists)
        {
            return Conflict(new 
            { 
                error = "Conflict", 
                message = $"A saved search with the name '{dto.Name}' already exists" 
            });
        }

        // Validate filter criteria not empty
        if (dto.FilterCriteria.IsEmpty())
        {
            return BadRequest(new 
            { 
                error = "ValidationError", 
                message = "At least one filter criterion must be specified" 
            });
        }

        var savedSearch = new SavedSearch
        {
            UserId = userId,
            Name = dto.Name,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        savedSearch.SetFilterCriteria(dto.FilterCriteria);

        _context.SavedSearches.Add(savedSearch);
        await _context.SaveChangesAsync();

        var result = MapToDto(savedSearch);
        return CreatedAtAction(nameof(GetSavedSearch), new { id = savedSearch.Id }, result);
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetSavedSearches()
    {
        var userId = GetUserId();

        var items = await _context.SavedSearches
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

        return Ok(new
        {
            items = items.Select(MapToDto),
            totalCount = items.Count
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SavedSearchDto>> GetSavedSearch(int id)
    {
        var userId = GetUserId();
        var savedSearch = await _context.SavedSearches
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        if (savedSearch == null)
            return NotFound(new { error = "NotFound", message = $"Saved search with ID {id} not found" });

        return Ok(MapToDto(savedSearch));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SavedSearchDto>> UpdateSavedSearch(int id, UpdateSavedSearchDto dto)
    {
        var userId = GetUserId();
        var savedSearch = await _context.SavedSearches
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        if (savedSearch == null)
            return NotFound(new { error = "NotFound", message = $"Saved search with ID {id} not found" });

        // Validate name uniqueness (excluding current record)
        var exists = await _context.SavedSearches
            .AnyAsync(s => s.UserId == userId && s.Name == dto.Name && s.Id != id);
        
        if (exists)
        {
            return Conflict(new 
            { 
                error = "Conflict", 
                message = $"A saved search with the name '{dto.Name}' already exists" 
            });
        }

        savedSearch.Name = dto.Name;
        savedSearch.Description = dto.Description;
        savedSearch.SetFilterCriteria(dto.FilterCriteria);
        savedSearch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(MapToDto(savedSearch));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteSavedSearch(int id)
    {
        var userId = GetUserId();
        var savedSearch = await _context.SavedSearches
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        if (savedSearch == null)
            return NotFound(new { error = "NotFound", message = $"Saved search with ID {id} not found" });

        _context.SavedSearches.Remove(savedSearch);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/apply")]
    public async Task<ActionResult<SearchResultsDto>> ApplySavedSearch(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortOrder = "desc")
    {
        var userId = GetUserId();
        var savedSearch = await _context.SavedSearches
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        if (savedSearch == null)
            return NotFound(new { error = "NotFound", message = $"Saved search with ID {id} not found" });

        var filters = savedSearch.GetFilterCriteria();

        // Reuse search logic from MeetingRequestsController
        var queryBuilder = new MeetingRequestQueryBuilder(_context);
        var baseQuery = queryBuilder.BuildQuery(filters);

        // Apply sorting and pagination (same as GetMeetingRequests)
        // ... (copy sorting and pagination logic)

        var totalCount = await baseQuery.CountAsync();
        var items = await baseQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MeetingRequestDto { /* ... */ })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new SearchResultsDto
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalPages,
            HasMore = page < totalPages,
            AppliedFilters = filters,
            SavedSearchName = savedSearch.Name
        });
    }

    private SavedSearchDto MapToDto(SavedSearch entity)
    {
        return new SavedSearchDto
        {
            Id = entity.Id,
            UserId = entity.UserId,
            Name = entity.Name,
            Description = entity.Description,
            FilterCriteria = entity.GetFilterCriteria(),
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }
}
```

**Validation**: Write integration tests for all CRUD operations

---

## Phase 5: Backend - Export API

**Goal**: Implement CSV and PDF export endpoints

**Estimated Time**: 6 hours

### Step 1: Install NuGet Packages

```powershell
cd src/server
dotnet add package CsvHelper --version 30.0.1
dotnet add package QuestPDF --version 2024.3.0
```

### Step 2: Create Export Service

**File**: `src/server/Services/ExportService.cs`

```csharp
using CsvHelper;
using CsvHelper.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using System.Text;
using VibeCode.Server.Models.DTOs;

namespace VibeCode.Server.Services;

public class ExportService
{
    public byte[] ExportToCsv(List<MeetingRequestDto> data, List<string> columns)
    {
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            Encoding = new UTF8Encoding(true) // BOM for Excel
        };

        using var memoryStream = new MemoryStream();
        using var streamWriter = new StreamWriter(memoryStream, new UTF8Encoding(true));
        using var csvWriter = new CsvWriter(streamWriter, config);

        // Write header
        foreach (var column in columns)
        {
            csvWriter.WriteField(GetColumnHeader(column));
        }
        csvWriter.NextRecord();

        // Write data
        foreach (var item in data)
        {
            foreach (var column in columns)
            {
                csvWriter.WriteField(GetColumnValue(item, column));
            }
            csvWriter.NextRecord();
        }

        streamWriter.Flush();
        return memoryStream.ToArray();
    }

    public byte[] ExportToPdf(List<MeetingRequestDto> data, List<string> columns, FilterCriteriaDto filters)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1, Unit.Centimetre);

                // Header
                page.Header().Column(column =>
                {
                    column.Item().Text("Meeting Requests Export")
                        .FontSize(20).Bold();
                    column.Item().Text($"Generated: {DateTime.UtcNow:MMMM dd, yyyy h:mm tt} UTC")
                        .FontSize(10);
                    column.Item().Text(GetFilterSummary(filters))
                        .FontSize(10).Italic();
                });

                // Content
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        foreach (var _ in columns)
                            cols.RelativeColumn();
                    });

                    // Header row
                    table.Header(header =>
                    {
                        foreach (var column in columns)
                        {
                            header.Cell().Background(Colors.Grey.Lighten2)
                                .Padding(5).Text(GetColumnHeader(column)).Bold();
                        }
                    });

                    // Data rows
                    foreach (var item in data)
                    {
                        foreach (var column in columns)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3)
                                .Padding(5).Text(GetColumnValue(item, column));
                        }
                    }
                });

                // Footer
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span($"Total: {data.Count} results  |  ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private string GetColumnHeader(string column) => column switch
    {
        "referenceNumber" => "Reference Number",
        "title" => "Title",
        "description" => "Description",
        "objectives" => "Objectives",
        "category" => "Category",
        "classification" => "Classification",
        "meetingDate" => "Meeting Date",
        "duration" => "Duration (minutes)",
        "location" => "Location",
        "requestorName" => "Requestor Name",
        "requestorEmail" => "Requestor Email",
        "requestorDepartment" => "Requestor Department",
        "status" => "Status",
        "createdAt" => "Created At",
        "updatedAt" => "Updated At",
        _ => column
    };

    private string GetColumnValue(MeetingRequestDto item, string column) => column switch
    {
        "referenceNumber" => item.ReferenceNumber ?? "",
        "title" => item.Title ?? "",
        "description" => item.Description ?? "",
        "objectives" => item.Objectives ?? "",
        "category" => item.Category ?? "",
        "classification" => item.Classification ?? "",
        "meetingDate" => item.MeetingDate.ToString("yyyy-MM-dd HH:mm"),
        "duration" => item.Duration.ToString(),
        "location" => item.Location ?? "",
        "requestorName" => item.RequestorName ?? "",
        "requestorEmail" => item.RequestorEmail ?? "",
        "requestorDepartment" => item.RequestorDepartment ?? "",
        "status" => item.Status ?? "",
        "createdAt" => item.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
        "updatedAt" => item.UpdatedAt.ToString("yyyy-MM-dd HH:mm"),
        _ => ""
    };

    private string GetFilterSummary(FilterCriteriaDto filters)
    {
        var parts = new List<string>();
        
        if (filters.Categories?.Count > 0)
            parts.Add($"Categories: {string.Join(", ", filters.Categories)}");
        if (filters.Statuses?.Count > 0)
            parts.Add($"Statuses: {string.Join(", ", filters.Statuses)}");
        if (filters.StartDate.HasValue || filters.EndDate.HasValue)
            parts.Add($"Date Range: {filters.StartDate:yyyy-MM-dd} to {filters.EndDate:yyyy-MM-dd}");

        return parts.Count > 0 ? $"Filters: {string.Join(" | ", parts)}" : "Filters: None";
    }
}
```

### Step 3: Create Export Controller

**File**: `src/server/Controllers/ExportController.cs`

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VibeCode.Server.Models.DTOs;
using VibeCode.Server.Services;

namespace VibeCode.Server.Controllers;

[ApiController]
[Route("api/meetingrequests")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly MeetingRequestQueryBuilder _queryBuilder;
    private readonly ExportService _exportService;

    public ExportController(MeetingRequestQueryBuilder queryBuilder, ExportService exportService)
    {
        _queryBuilder = queryBuilder;
        _exportService = exportService;
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string format = "csv",
        [FromQuery] List<string>? columns = null,
        [FromQuery] List<string>? categories = null,
        [FromQuery] List<string>? statuses = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? query = null)
    {
        // Build filters
        var filters = new FilterCriteriaDto
        {
            Categories = categories,
            Statuses = statuses,
            StartDate = startDate,
            EndDate = endDate,
            Query = query
        };

        // Build query
        var baseQuery = _queryBuilder.BuildQuery(filters);

        // Limit to 10,000 records
        var count = await baseQuery.CountAsync();
        if (count > 10000)
        {
            return StatusCode(413, new 
            { 
                error = "PayloadTooLarge", 
                message = "Export exceeds 10,000 record limit. Please refine filters.",
                details = new { matchingRecords = count, maxRecords = 10000 }
            });
        }

        // Fetch data
        var data = await baseQuery.Select(m => new MeetingRequestDto { /* map fields */ }).ToListAsync();

        // Default columns if not specified
        columns ??= new List<string> 
        { 
            "referenceNumber", "title", "category", "status", 
            "meetingDate", "requestorName", "createdAt" 
        };

        // Generate export
        var fileName = $"meeting-requests-{DateTime.UtcNow:yyyy-MM-dd}";
        
        if (format.ToLower() == "pdf")
        {
            var pdfBytes = _exportService.ExportToPdf(data, columns, filters);
            return File(pdfBytes, "application/pdf", $"{fileName}.pdf");
        }
        else
        {
            var csvBytes = _exportService.ExportToCsv(data, columns);
            return File(csvBytes, "text/csv", $"{fileName}.csv");
        }
    }
}
```

### Step 4: Register Services

**File**: `src/server/Program.cs`

```csharp
builder.Services.AddScoped<ExportService>();
```

**Validation**: Test CSV and PDF exports with various filters

---

## Phase 6: Frontend - Advanced Search UI

**Goal**: Build React components for advanced search panel

**Estimated Time**: 8 hours

### Step 1: Create Filter Panel Component

**File**: `src/client/src/components/AdvancedSearchPanel.jsx`

```jsx
import React, { useState } from 'react';
import {
  Panel,
  Button,
  Dropdown,
  DatePicker,
  TextField,
  Stack
} from '@fluentui/react-components';

export const AdvancedSearchPanel = ({ onApplyFilters, onClearFilters }) => {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [query, setQuery] = useState('');

  const handleApply = () => {
    onApplyFilters({
      categories,
      statuses,
      startDate,
      endDate,
      query
    });
  };

  const handleClear = () => {
    setCategories([]);
    setStatuses([]);
    setStartDate(null);
    setEndDate(null);
    setQuery('');
    onClearFilters();
  };

  return (
    <Panel>
      <Stack tokens={{ childrenGap: 16 }}>
        <h3>Advanced Search</h3>
        
        /* Category multi-select */
        <Dropdown
          label="Categories"
          multiselect
          selectedOptions={categories}
          onOptionSelect={(e, data) => setCategories(data.selectedOptions)}
          options={[
            { key: 'Technical', text: 'Technical' },
            { key: 'Budget', text: 'Budget' },
            { key: 'Policy', text: 'Policy' },
            // ... more options
          ]}
        />

        /* Status multi-select */
        <Dropdown
          label="Statuses"
          multiselect
          selectedOptions={statuses}
          onOptionSelect={(e, data) => setStatuses(data.selectedOptions)}
          options={[
            { key: 'Pending', text: 'Pending' },
            { key: 'Approved', text: 'Approved' },
            // ... more options
          ]}
        />

        /* Date range */
        <DatePicker
          label="Start Date"
          value={startDate}
          onSelectDate={setStartDate}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onSelectDate={setEndDate}
        />

        /* Text search */
        <TextField
          label="Search Query"
          placeholder="e.g., budget AND quarterly"
          value={query}
          onChange={(e, data) => setQuery(data.value)}
        />

        /* Actions */
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Button appearance="primary" onClick={handleApply}>
            Apply Filters
          </Button>
          <Button onClick={handleClear}>
            Clear All
          </Button>
        </Stack>
      </Stack>
    </Panel>
  );
};
```

**Validation**: Component renders with proper styling and interactions

---

## Phase 7: Frontend - Search State Management

**Goal**: Implement React Context for search state

**Estimated Time**: 4 hours

### Create Search Context

**File**: `src/client/src/contexts/SearchContext.jsx`

```jsx
import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const applyFilters = async (newFilters) => {
    setLoading(true);
    try {
      const queryString = buildQueryString(newFilters);
      const response = await fetch(`/api/meetingrequests?${queryString}`);
      const data = await response.json();
      
      setResults(data.items);
      setTotalCount(data.totalCount);
      setFilters(newFilters);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
    applyFilters({});
  };

  const buildQueryString = (filters) => {
    const params = new URLSearchParams();
    
    filters.categories?.forEach(c => params.append('categories[]', c));
    filters.statuses?.forEach(s => params.append('statuses[]', s));
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters.query) params.append('query', filters.query);
    
    return params.toString();
  };

  return (
    <SearchContext.Provider value={{
      filters,
      results,
      loading,
      totalCount,
      applyFilters,
      clearFilters
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
```

**Validation**: Context provides state and actions correctly

---

## Phase 8: Testing

**Goal**: Comprehensive test coverage

**Estimated Time**: 8 hours

### Backend Integration Tests

**File**: `src/tests/Integration/AdvancedSearchTests.cs`

```csharp
public class AdvancedSearchTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Search_WithCategoryFilter_ReturnsFilteredResults()
    {
        var response = await _client.GetAsync("/api/meetingrequests?categories[]=Technical");
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<SearchResultsDto>();
        Assert.All(result.Items, item => Assert.Equal("Technical", item.Category));
    }
    
    // More tests...
}
```

### Frontend E2E Tests

**File**: `src/tests/e2e/advanced-search.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('apply category filter', async ({ page }) => {
  await page.goto('/meeting-requests');
  await page.click('[aria-label="Advanced Search"]');
  
  await page.selectOption('[name="category"]', 'Technical');
  await page.click('button:has-text("Apply Filters")');
  
  await expect(page.locator('.result-item')).toHaveCount(2);
  await expect(page.locator('.result-item').first()).toContainText('Technical');
});
```

**Validation**: All tests pass with >80% coverage

---

## Phase 9: Documentation & Deployment

**Goal**: Deploy feature and update documentation

**Estimated Time**: 2 hours

### Step 1: Update API Documentation

Add Swagger annotations to controllers

### Step 2: Merge to Main

```powershell
git add .
git commit -m "feat: Advanced search and filtering (#001)"
git push origin 001-advanced-search

# Create PR and merge
```

### Step 3: Deploy

```powershell
# Deploy backend
dotnet publish -c Release
# ... deployment steps

# Deploy frontend
cd src/client
npm run build
# ... deployment steps
```

---

## Troubleshooting

### Database Migration Fails

**Symptom**: `dotnet ef database update` errors

**Solution**:
```powershell
dotnet ef migrations remove
dotnet ef migrations add AddAdvancedSearchSupport --force
dotnet ef database update
```

### Query Performance Slow

**Symptom**: Searches > 1 second

**Solution**:
- Verify indexes created: Check SQLite indexes tab
- Use EXPLAIN QUERY PLAN to analyze query
- Add missing indexes for specific filter combinations

### CSV Export Opens Incorrectly in Excel

**Symptom**: Character encoding issues

**Solution**:
- Ensure UTF-8 BOM added (already in ExportService)
- Verify CSV config uses UTF8Encoding(true)

---

## Success Criteria

✅ All 62 functional requirements from spec.md implemented  
✅ Performance targets met (<500ms searches, <5s exports)  
✅ Test coverage >80% (unit + integration + E2E)  
✅ No critical bugs in manual QA testing  
✅ Documentation complete and accurate  
✅ Feature deployed to production

---

## Next Steps

After implementing this feature:
1. Monitor performance metrics in production
2. Gather user feedback on search UX
3. Consider Boolean query parser enhancement (P2)
4. Plan export background processing (future enhancement)

---

**Questions?** Refer to contract documents in `contracts/` directory or reach out to tech lead.
