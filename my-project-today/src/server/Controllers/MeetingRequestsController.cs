using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using VibeCode.Server.Utils;
using VibeCode.Server.Services;
using VibeCode.Server.Models;

[ApiController]
[Route("api/[controller]")]
public class MeetingRequestsController : ControllerBase
{
    private readonly MeetingRequestsDbContext _db;
    private readonly FileValidationService _fileValidation;
    private readonly FileStorageService _fileStorage;

    public MeetingRequestsController(
        MeetingRequestsDbContext db,
        FileValidationService fileValidation,
        FileStorageService fileStorage)
    {
        _db = db;
        _fileValidation = fileValidation;
        _fileStorage = fileStorage;
    }

    [HttpPost]
    // [Microsoft.AspNetCore.Authorization.Authorize] // Temporarily disabled for development
    public async Task<IActionResult> Create([FromBody] MeetingRequestBody body)
    {
        if (body is null) return BadRequest(new { error = "Body required" });
        body.NormalizeAliases();
        if (string.IsNullOrWhiteSpace(body.MeetingTitle))
            return BadRequest(new { error = "Missing required field: MeetingTitle" });
        if (!body.MeetingDate.HasValue)
            return BadRequest(new { error = "Missing or invalid required field: MeetingDate" });

        // duplicate detection: title + date + category
        var existing = await _db.MeetingRequests.FirstOrDefaultAsync(x => !x.IsDraft
            && x.Title.ToLower() == (body.MeetingTitle ?? string.Empty).ToLower()
            && x.MeetingDate.HasValue && x.MeetingDate.Value.Date == body.MeetingDate.Value.Date
            && x.Category.ToLower() == (body.MeetingCategory ?? string.Empty).ToLower());
        if (existing != null)
        {
            return Ok(new { id = existing.Id, duplicate = true });
        }

        string resolvedRequestor = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedRequestor = User.FindFirst("name")?.Value ?? User.FindFirst("preferred_username")?.Value ?? User.Identity?.Name;
        }
        var entity = new MeetingRequest
        {
            Title = body.MeetingTitle ?? string.Empty,
            MeetingDate = body.MeetingDate,
            AlternateDate = body.AlternateDate,
            Category = body.MeetingCategory ?? string.Empty,
            Subcategory = body.MeetingSubcategory ?? string.Empty,
            Description = body.MeetingDescription ?? string.Empty,
            Comments = body.Comments ?? string.Empty,
            Classification = body.Classification ?? string.Empty,
            RequestorName = resolvedRequestor ?? (body.RequestorName ?? string.Empty),
            RequestType = body.RequestType ?? string.Empty,
            Country = body.Country ?? string.Empty,
            Status = body.Status ?? "Pending",
            IsDraft = false,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = resolvedRequestor
        };
        _db.MeetingRequests.Add(entity);
        // Generate a unique 5-digit reference number (numeric, zero-padded)
        // Try a limited number of times to avoid infinite loops.
        var rng = new System.Random();
        const int maxAttempts = 10;
        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            var candidate = rng.Next(0, 100000).ToString("D5");
            var exists = await _db.MeetingRequests.AnyAsync(x => x.ReferenceNumber == candidate);
            if (!exists)
            {
                entity.ReferenceNumber = candidate;
                break;
            }
        }
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, new { id = entity.Id });
    }

    [HttpPost("draft")]
    // [Microsoft.AspNetCore.Authorization.Authorize] // Temporarily disabled for development (matching Create endpoint)
    public async Task<IActionResult> SaveDraft([FromBody] MeetingRequestBody body)
    {
        if (body is null) return BadRequest(new { error = "Body required" });
        body.NormalizeAliases();
        string resolvedDraftRequestor = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedDraftRequestor = User.FindFirst("name")?.Value ?? User.FindFirst("preferred_username")?.Value ?? User.Identity?.Name;
        }
        var entity = new MeetingRequest
        {
            Title = body.MeetingTitle ?? string.Empty,
            MeetingDate = body.MeetingDate,
            AlternateDate = body.AlternateDate,
            Category = body.MeetingCategory ?? string.Empty,
            Subcategory = body.MeetingSubcategory ?? string.Empty,
            Description = body.MeetingDescription ?? string.Empty,
            Comments = body.Comments ?? string.Empty,
            Classification = body.Classification ?? string.Empty,
            RequestorName = resolvedDraftRequestor ?? (body.RequestorName ?? string.Empty),
            RequestType = body.RequestType ?? string.Empty,
            Country = body.Country ?? string.Empty,
            Status = body.Status ?? "Draft",
            IsDraft = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = resolvedDraftRequestor
        };
        _db.MeetingRequests.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(new { id = entity.Id });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _db.MeetingRequests.FindAsync(id);
        if (item == null) return NotFound();
        
        // Get audit logs for this meeting request
        var auditLogs = await _db.MeetingRequestAudits
            .Where(a => a.MeetingRequestId == id)
            .OrderByDescending(a => a.ChangedAt)
            .Select(a => new
            {
                fieldName = a.FieldName,
                oldValue = a.OldValue,
                newValue = a.NewValue,
                changedBy = a.ChangedBy,
                changedAt = a.ChangedAt
            })
            .ToListAsync();
        
        return Ok(new { id = item.Id, meetingRequest = item, auditLogs = auditLogs });
    }

    [HttpPut("{id}")]
    // [Microsoft.AspNetCore.Authorization.Authorize] // Temporarily disabled for development
    public async Task<IActionResult> Update(int id, [FromBody] MeetingRequestBody body)
    {
        if (body is null) return BadRequest(new { error = "Body required" });
        body.NormalizeAliases();
        
        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        // Set UpdatedBy from request body or authenticated user
        string? resolvedUpdatedBy = body.UpdatedBy;
        if (string.IsNullOrWhiteSpace(resolvedUpdatedBy) && User?.Identity?.IsAuthenticated == true)
        {
            resolvedUpdatedBy = User.FindFirst("name")?.Value ?? User.FindFirst("preferred_username")?.Value ?? User.Identity?.Name;
        }

        var auditLogs = new List<MeetingRequestAudit>();
        var changeTime = DateTime.UtcNow;

        // Helper to track field changes
        void TrackChange(string fieldName, string? oldValue, string? newValue)
        {
            if (oldValue != newValue)
            {
                auditLogs.Add(new MeetingRequestAudit
                {
                    MeetingRequestId = id,
                    FieldName = fieldName,
                    OldValue = oldValue,
                    NewValue = newValue,
                    ChangedBy = resolvedUpdatedBy,
                    ChangedAt = changeTime
                });
            }
        }

        // Track and update all fields from the request body (preserve existing if not provided)
        if (body.MeetingTitle != null) TrackChange("Title", existing.Title, body.MeetingTitle);
        existing.Title = body.MeetingTitle ?? existing.Title;

        if (body.MeetingDate != null) TrackChange("Meeting Date", existing.MeetingDate?.ToString("yyyy-MM-dd"), body.MeetingDate?.ToString("yyyy-MM-dd"));
        existing.MeetingDate = body.MeetingDate ?? existing.MeetingDate;

        if (body.AlternateDate != null) TrackChange("Alternate Date", existing.AlternateDate?.ToString("yyyy-MM-dd"), body.AlternateDate?.ToString("yyyy-MM-dd"));
        existing.AlternateDate = body.AlternateDate ?? existing.AlternateDate;

        if (body.MeetingCategory != null) TrackChange("Category", existing.Category, body.MeetingCategory);
        existing.Category = body.MeetingCategory ?? existing.Category;

        if (body.MeetingSubcategory != null) TrackChange("Subcategory", existing.Subcategory, body.MeetingSubcategory);
        existing.Subcategory = body.MeetingSubcategory ?? existing.Subcategory;

        if (body.MeetingDescription != null) TrackChange("Description", existing.Description, body.MeetingDescription);
        existing.Description = body.MeetingDescription ?? existing.Description;

        if (body.Comments != null) TrackChange("Comments", existing.Comments, body.Comments);
        existing.Comments = body.Comments ?? existing.Comments;

        if (body.Classification != null) TrackChange("Classification", existing.Classification, body.Classification);
        existing.Classification = body.Classification ?? existing.Classification;

        if (body.RequestType != null) TrackChange("Request Type", existing.RequestType, body.RequestType);
        existing.RequestType = body.RequestType ?? existing.RequestType;

        if (body.Country != null) TrackChange("Country", existing.Country, body.Country);
        existing.Country = body.Country ?? existing.Country;

        if (body.RequestorName != null) TrackChange("Requestor Name", existing.RequestorName, body.RequestorName);
        existing.RequestorName = body.RequestorName ?? existing.RequestorName;

        if (body.Status != null) TrackChange("Status", existing.Status, body.Status);
        existing.Status = body.Status ?? existing.Status;

        // Update metadata
        existing.UpdatedAt = changeTime;
        if (!string.IsNullOrWhiteSpace(resolvedUpdatedBy))
        {
            existing.UpdatedBy = resolvedUpdatedBy;
        }

        // Save audit logs
        if (auditLogs.Count > 0)
        {
            await _db.MeetingRequestAudits.AddRangeAsync(auditLogs);
        }

        await _db.SaveChangesAsync();
        return Ok(new { id = existing.Id, message = "Meeting request updated successfully" });
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelRequest(int id, [FromBody] CancelRequestBody body)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Reason))
        {
            return BadRequest(new { error = "Cancellation reason is required" });
        }

        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        if (existing.Status?.ToLower() == "cancelled")
        {
            return BadRequest(new { error = "Request is already cancelled" });
        }

        // Set UpdatedBy from authenticated user
        string? resolvedUpdatedBy = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedUpdatedBy = User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.FindFirst("upn")?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? User.Identity?.Name;
        }

        var changeTime = DateTime.UtcNow;
        var oldStatus = existing.Status;
        existing.Status = "Cancelled";
        existing.UpdatedAt = changeTime;
        existing.UpdatedBy = resolvedUpdatedBy;

        // Add audit log for status change
        await _db.MeetingRequestAudits.AddAsync(new MeetingRequestAudit
        {
            MeetingRequestId = id,
            FieldName = "Status",
            OldValue = oldStatus,
            NewValue = "Cancelled",
            ChangedBy = resolvedUpdatedBy,
            ChangedAt = changeTime
        });

        // Add audit log for cancellation reason
        await _db.MeetingRequestAudits.AddAsync(new MeetingRequestAudit
        {
            MeetingRequestId = id,
            FieldName = "Cancellation Reason",
            OldValue = null,
            NewValue = body.Reason,
            ChangedBy = resolvedUpdatedBy,
            ChangedAt = changeTime
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Request cancelled successfully" });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveRequest(int id)
    {
        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        if (existing.Status?.ToLower() == "approved")
        {
            return BadRequest(new { error = "Request is already approved" });
        }

        if (existing.Status?.ToLower() == "cancelled")
        {
            return BadRequest(new { error = "Cannot approve a cancelled request" });
        }

        // Set UpdatedBy from authenticated user
        string? resolvedUpdatedBy = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedUpdatedBy = User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.FindFirst("upn")?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? User.Identity?.Name;
        }

        var changeTime = DateTime.UtcNow;
        var oldStatus = existing.Status;
        existing.Status = "Approved";
        existing.UpdatedAt = changeTime;
        existing.UpdatedBy = resolvedUpdatedBy;

        // Add audit log for status change
        await _db.MeetingRequestAudits.AddAsync(new MeetingRequestAudit
        {
            MeetingRequestId = id,
            FieldName = "Status",
            OldValue = oldStatus,
            NewValue = "Approved",
            ChangedBy = resolvedUpdatedBy,
            ChangedAt = changeTime
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Request approved successfully" });
    }

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> ConfirmRequest(int id)
    {
        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        if (existing.Status?.ToLower() == "confirmed")
        {
            return BadRequest(new { error = "Request is already confirmed" });
        }

        if (existing.Status?.ToLower() == "cancelled")
        {
            return BadRequest(new { error = "Cannot confirm a cancelled request" });
        }

        // Set UpdatedBy from authenticated user
        string? resolvedUpdatedBy = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedUpdatedBy = User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.FindFirst("upn")?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? User.Identity?.Name;
        }

        var changeTime = DateTime.UtcNow;
        var oldStatus = existing.Status;
        existing.Status = "Confirmed";
        existing.UpdatedAt = changeTime;
        existing.UpdatedBy = resolvedUpdatedBy;

        // Add audit log for status change
        await _db.MeetingRequestAudits.AddAsync(new MeetingRequestAudit
        {
            MeetingRequestId = id,
            FieldName = "Status",
            OldValue = oldStatus,
            NewValue = "Confirmed",
            ChangedBy = resolvedUpdatedBy,
            ChangedAt = changeTime
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Request confirmed successfully" });
    }

    [HttpPost("{id}/announce")]
    public async Task<IActionResult> AnnounceRequest(int id)
    {
        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        if (existing.Status?.ToLower() == "announced")
        {
            return BadRequest(new { error = "Request is already announced" });
        }

        if (existing.Status?.ToLower() == "cancelled")
        {
            return BadRequest(new { error = "Cannot announce a cancelled request" });
        }

        if (existing.Status?.ToLower() != "confirmed")
        {
            return BadRequest(new { error = "Request must be confirmed before it can be announced" });
        }

        // Set UpdatedBy from authenticated user
        string? resolvedUpdatedBy = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            resolvedUpdatedBy = User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.FindFirst("upn")?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? User.Identity?.Name;
        }

        var changeTime = DateTime.UtcNow;
        var oldStatus = existing.Status;
        existing.Status = "Announced";
        existing.UpdatedAt = changeTime;
        existing.UpdatedBy = resolvedUpdatedBy;

        // Add audit log for status change
        await _db.MeetingRequestAudits.AddAsync(new MeetingRequestAudit
        {
            MeetingRequestId = id,
            FieldName = "Status",
            OldValue = oldStatus,
            NewValue = "Announced",
            ChangedBy = resolvedUpdatedBy,
            ChangedAt = changeTime
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Request announced successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var existing = await _db.MeetingRequests.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Meeting request not found" });

        // Only allow deletion of draft requests
        if (existing.Status?.ToLower() != "draft" && !existing.IsDraft)
        {
            return BadRequest(new { error = "Only draft requests can be deleted" });
        }

        // Delete attachment files before deleting request
        var attachments = await _db.MeetingRequestAttachments
            .Where(a => a.MeetingRequestId == id)
            .ToListAsync();
        
        foreach (var attachment in attachments)
        {
            var filePath = _fileStorage.GetFullPath(attachment.FilePath);
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);
        }

        // Delete associated audit logs first (foreign key constraint)
        var auditLogs = await _db.MeetingRequestAudits
            .Where(a => a.MeetingRequestId == id)
            .ToListAsync();
        _db.MeetingRequestAudits.RemoveRange(auditLogs);

        // Delete the request (cascade deletes attachment records)
        _db.MeetingRequests.Remove(existing);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Draft request deleted successfully" });
    }

    /// <summary>
    /// Retrieves a paginated list of meeting requests with optional filtering
    /// </summary>
    /// <param name="requestorEmail">Optional: Filter by requestor email (e.g., john.doe@example.com). When provided, returns only requests matching this email.</param>
    /// <returns>Paginated response with items, totalCount, page, pageSize, totalPages, and hasMore</returns>
    /// <remarks>
    /// Feature: 1-requestor-filter
    /// - When requestorEmail is null/empty, returns all meeting requests (admin view)
    /// - When requestorEmail is provided, returns only requests from that user (user view)
    /// - Default filter mode is "My Requests" (filtered by logged-in user's email)
    /// </remarks>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? classification, 
        [FromQuery] string? category, 
        [FromQuery] string? status, 
        [FromQuery] string? startDate, 
        [FromQuery] string? endDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? requestorEmail = null)  // NEW: Filter by requestor email
    {
        // Validate pagination parameters
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100; // Max page size to prevent abuse

        var q = _db.MeetingRequests.AsQueryable();
        if (!string.IsNullOrWhiteSpace(classification)) q = q.Where(x => x.Classification.ToLower() == classification.ToLower());
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category.ToLower() == category.ToLower());
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => !string.IsNullOrEmpty(x.Status) && x.Status.ToLower() == status.ToLower());
        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var sd)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date >= sd.Date);
        if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date <= ed.Date);
        
        // NEW: Filter by requestor email (Feature: 1-requestor-filter)
        // Matches either RequestorEmail field OR RequestorName field (for backwards compatibility)
        // This enables "My Requests" vs "All Requests" toggle in frontend
        if (!string.IsNullOrWhiteSpace(requestorEmail))
        {
            q = q.Where(x => 
                (!string.IsNullOrEmpty(x.RequestorEmail) && x.RequestorEmail == requestorEmail) ||
                (!string.IsNullOrEmpty(x.RequestorName) && x.RequestorName == requestorEmail));
        }
        
        // Get total count before pagination
        var totalCount = await q.CountAsync();
        
        // Apply pagination and ordering (most recent first)
        var result = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                id = x.Id,
                title = x.Title,
                meetingDate = x.MeetingDate,
                alternateDate = x.AlternateDate,
                category = x.Category,
                subcategory = x.Subcategory,
                classification = x.Classification,
                description = x.Description,
                comments = x.Comments,
                status = x.Status ?? "Draft",
                isDraft = x.IsDraft,
                referenceNumber = x.ReferenceNumber,
                requestorName = x.RequestorName,
                requestType = x.RequestType,
                country = x.Country,
                createdAt = x.CreatedAt,
                createdBy = x.CreatedBy,
                updatedAt = x.UpdatedAt,
                updatedBy = x.UpdatedBy
            }).ToListAsync();
        
        // Return paginated response with metadata
        return Ok(new
        {
            items = result,
            page,
            pageSize,
            totalCount,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            hasMore = page * pageSize < totalCount
        });
    }

    [HttpGet("whoami")]
    public IActionResult WhoAmI()
    {
        var name = User?.Identity?.Name;
        if (string.IsNullOrWhiteSpace(name)) return Ok(new { name = (string?)null });
        return Ok(new { name });
    }

    // ===== File Attachment Endpoints =====

    [HttpPost("{id}/attachments")]
    public async Task<IActionResult> UploadAttachment(int id, [FromForm] IFormFile file)
    {
        // Check meeting request exists
        var meetingRequest = await _db.MeetingRequests.FindAsync(id);
        if (meetingRequest == null)
            return NotFound(new { error = "Meeting request not found" });

        // Check attachment count limit
        var attachmentCount = await _db.MeetingRequestAttachments
            .CountAsync(a => a.MeetingRequestId == id);
        if (attachmentCount >= 5)
            return BadRequest(new { error = "Maximum 5 attachments allowed per meeting request" });

        // Validate file
        var (isValid, error) = _fileValidation.ValidateFile(file);
        if (!isValid)
            return BadRequest(new { error });

        // Get user identity
        string? uploadedBy = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            uploadedBy = User.FindFirst("name")?.Value 
                ?? User.FindFirst("preferred_username")?.Value 
                ?? User.FindFirst("email")?.Value 
                ?? User.Identity?.Name;
        }

        // Save file
        try
        {
            var attachment = await _fileStorage.SaveFileAsync(id, file, uploadedBy);
            return CreatedAtAction(nameof(GetAttachment), 
                new { id, attachmentId = attachment.Id }, 
                new
                {
                    id = attachment.Id,
                    meetingRequestId = attachment.MeetingRequestId,
                    fileName = attachment.FileName,
                    fileSize = attachment.FileSize,
                    contentType = attachment.ContentType,
                    uploadedBy = attachment.UploadedBy,
                    uploadedAt = attachment.UploadedAt
                });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to save file", details = ex.Message });
        }
    }

    [HttpGet("{id}/attachments")]
    public async Task<IActionResult> ListAttachments(int id)
    {
        var meetingRequest = await _db.MeetingRequests.FindAsync(id);
        if (meetingRequest == null)
            return NotFound(new { error = "Meeting request not found" });

        var attachments = await _db.MeetingRequestAttachments
            .Where(a => a.MeetingRequestId == id)
            .OrderBy(a => a.UploadedAt)
            .Select(a => new
            {
                id = a.Id,
                meetingRequestId = a.MeetingRequestId,
                fileName = a.FileName,
                fileSize = a.FileSize,
                contentType = a.ContentType,
                uploadedBy = a.UploadedBy,
                uploadedAt = a.UploadedAt
            })
            .ToListAsync();

        return Ok(attachments);
    }

    [HttpGet("{id}/attachments/{attachmentId}")]
    public async Task<IActionResult> GetAttachment(int id, int attachmentId)
    {
        var attachment = await _db.MeetingRequestAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.MeetingRequestId == id);
        
        if (attachment == null)
            return NotFound(new { error = "Attachment not found" });

        var filePath = _fileStorage.GetFullPath(attachment.FilePath);
        if (!System.IO.File.Exists(filePath))
            return StatusCode(500, new { error = "File not found on disk" });

        var memory = new MemoryStream();
        await using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
        {
            await stream.CopyToAsync(memory);
        }
        memory.Position = 0;

        return File(memory, attachment.ContentType, attachment.FileName);
    }

    [HttpDelete("{id}/attachments/{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int id, int attachmentId)
    {
        var attachment = await _db.MeetingRequestAttachments
            .Include(a => a.MeetingRequest)
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.MeetingRequestId == id);
        
        if (attachment == null)
            return NotFound(new { error = "Attachment not found" });

        // Only allow deletion from draft requests
        if (attachment.MeetingRequest?.Status?.ToLower() != "draft" && 
            attachment.MeetingRequest?.IsDraft != true)
        {
            return BadRequest(new { error = "Cannot delete attachments from submitted meeting requests" });
        }

        try
        {
            await _fileStorage.DeleteFileAsync(attachmentId);
            return Ok(new { message = "Attachment deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to delete attachment", details = ex.Message });
        }
    }
}

public class MeetingRequestBody
{
    public string? MeetingTitle { get; set; }
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? MeetingDate { get; set; }
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? AlternateDate { get; set; }
    public string? MeetingCategory { get; set; }
    public string? MeetingSubcategory { get; set; }
    public string? MeetingDescription { get; set; }
    public string? Comments { get; set; }
    public string? Classification { get; set; }
    // Optional UI fields
    public string? RequestorName { get; set; }
    public string? RequestType { get; set; }
    public string? Country { get; set; }
    public string? Status { get; set; }
    public string? UpdatedBy { get; set; }
    [JsonExtensionData]
    public System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>? ExtensionData { get; set; }
}

public class CancelRequestBody
{
    public string? Reason { get; set; }
}

// helper to map legacy client field names to our model
static partial class MeetingRequestBodyExtensions
{
    public static void NormalizeAliases(this MeetingRequestBody body)
    {
        if (body.ExtensionData == null) return;
        string? GetString(string key)
        {
            if (body.ExtensionData.TryGetValue(key, out var el))
            {
                if (el.ValueKind == System.Text.Json.JsonValueKind.String) return el.GetString();
                try { return el.ToString(); } catch { return null; }
            }
            return null;
        }

        DateTime? ParseDate(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)) return dt;
            if (DateTime.TryParseExact(s, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.AssumeUniversal, out dt)) return dt;
            if (DateTime.TryParse(s, out dt)) return dt;
            return null;
        }

        if (string.IsNullOrWhiteSpace(body.MeetingTitle))
        {
            var v = GetString("title") ?? GetString("MeetingTitle");
            if (!string.IsNullOrWhiteSpace(v)) body.MeetingTitle = v;
        }
        if (!body.MeetingDate.HasValue)
        {
            var v = GetString("date") ?? GetString("MeetingDate");
            var d = ParseDate(v);
            if (d.HasValue) body.MeetingDate = d;
        }
        if (!body.AlternateDate.HasValue)
        {
            var v = GetString("altDate") ?? GetString("alternateDate") ?? GetString("AlternateDate");
            var d = ParseDate(v);
            if (d.HasValue) body.AlternateDate = d;
        }
        if (string.IsNullOrWhiteSpace(body.MeetingCategory)) body.MeetingCategory = GetString("category") ?? GetString("MeetingCategory");
        if (string.IsNullOrWhiteSpace(body.MeetingSubcategory)) body.MeetingSubcategory = GetString("subcategory") ?? GetString("MeetingSubcategory");
        if (string.IsNullOrWhiteSpace(body.MeetingDescription)) body.MeetingDescription = GetString("description") ?? GetString("MeetingDescription");
        if (string.IsNullOrWhiteSpace(body.Comments)) body.Comments = GetString("comments") ?? GetString("Comments");
        if (string.IsNullOrWhiteSpace(body.Classification)) body.Classification = GetString("classification") ?? GetString("Classification");
        if (string.IsNullOrWhiteSpace(body.RequestorName)) body.RequestorName = GetString("requestor") ?? GetString("requestorName") ?? GetString("requestor_name");
        if (string.IsNullOrWhiteSpace(body.RequestType)) body.RequestType = GetString("requestType") ?? GetString("type");
        if (string.IsNullOrWhiteSpace(body.Country)) body.Country = GetString("country") ?? GetString("Country");
    }
}
