using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using VibeCode.Server.Utils;

[ApiController]
[Route("api/[controller]")]
public class MeetingRequestsController : ControllerBase
{
    private readonly MeetingRequestsDbContext _db;

    public MeetingRequestsController(MeetingRequestsDbContext db)
    {
        _db = db;
    }

    [HttpPost]
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
            RequestorName = body.RequestorName ?? string.Empty,
            RequestType = body.RequestType ?? string.Empty,
            Country = body.Country ?? string.Empty,
            IsDraft = false,
            CreatedAt = DateTime.UtcNow
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
    public async Task<IActionResult> SaveDraft([FromBody] MeetingRequestBody body)
    {
        if (body is null) return BadRequest(new { error = "Body required" });
        body.NormalizeAliases();
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
            RequestorName = body.RequestorName ?? string.Empty,
            RequestType = body.RequestType ?? string.Empty,
            Country = body.Country ?? string.Empty,
            IsDraft = true,
            CreatedAt = DateTime.UtcNow
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
        return Ok(new { id = item.Id, meetingRequest = item });
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? classification, [FromQuery] string? category, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var q = _db.MeetingRequests.AsQueryable();
        if (!string.IsNullOrWhiteSpace(classification)) q = q.Where(x => x.Classification.ToLower() == classification.ToLower());
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category.ToLower() == category.ToLower());
        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var sd)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date >= sd.Date);
        if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date <= ed.Date);
        var result = await q.Select(x => new
        {
            id = x.Id,
            title = x.Title,
            meetingDate = x.MeetingDate,
            category = x.Category,
            classification = x.Classification,
            isDraft = x.IsDraft,
            referenceNumber = x.ReferenceNumber,
            // placeholders for fields expected by the UI; populate in future iterations
            requestorName = "",
            requestType = "",
            country = ""
        }).ToListAsync();
        return Ok(result);
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
    [JsonExtensionData]
    public System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>? ExtensionData { get; set; }
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
