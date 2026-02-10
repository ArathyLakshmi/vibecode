using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        if (string.IsNullOrWhiteSpace(body.MeetingTitle) || string.IsNullOrWhiteSpace(body.MeetingDate))
            return BadRequest(new { error = "Missing required fields" });

        // duplicate detection: title + date + category
        var existing = await _db.MeetingRequests.FirstOrDefaultAsync(x => !x.IsDraft
            && x.Title.ToLower() == (body.MeetingTitle ?? string.Empty).ToLower()
            && x.MeetingDate == (body.MeetingDate ?? string.Empty)
            && x.Category.ToLower() == (body.MeetingCategory ?? string.Empty).ToLower());
        if (existing != null)
        {
            return Ok(new { id = existing.Id, duplicate = true });
        }

        var entity = new MeetingRequest
        {
            Title = body.MeetingTitle ?? string.Empty,
            MeetingDate = body.MeetingDate ?? string.Empty,
            AlternateDate = body.AlternateDate ?? string.Empty,
            Category = body.MeetingCategory ?? string.Empty,
            Subcategory = body.MeetingSubcategory ?? string.Empty,
            Description = body.MeetingDescription ?? string.Empty,
            Comments = body.Comments ?? string.Empty,
            Classification = body.Classification ?? string.Empty,
            IsDraft = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.MeetingRequests.Add(entity);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, new { id = entity.Id });
    }

    [HttpPost("draft")]
    public async Task<IActionResult> SaveDraft([FromBody] MeetingRequestBody body)
    {
        if (body is null) return BadRequest(new { error = "Body required" });
        var entity = new MeetingRequest
        {
            Title = body.MeetingTitle ?? string.Empty,
            MeetingDate = body.MeetingDate ?? string.Empty,
            AlternateDate = body.AlternateDate ?? string.Empty,
            Category = body.MeetingCategory ?? string.Empty,
            Subcategory = body.MeetingSubcategory ?? string.Empty,
            Description = body.MeetingDescription ?? string.Empty,
            Comments = body.Comments ?? string.Empty,
            Classification = body.Classification ?? string.Empty,
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
        if (!string.IsNullOrWhiteSpace(startDate)) q = q.Where(x => string.Compare(x.MeetingDate, startDate, StringComparison.Ordinal) >= 0);
        if (!string.IsNullOrWhiteSpace(endDate)) q = q.Where(x => string.Compare(x.MeetingDate, endDate, StringComparison.Ordinal) <= 0);
        var result = await q.Select(x => new { id = x.Id, title = x.Title, meetingDate = x.MeetingDate, category = x.Category, classification = x.Classification, isDraft = x.IsDraft }).ToListAsync();
        return Ok(result);
    }
}

public class MeetingRequestBody
{
    public string? MeetingTitle { get; set; }
    public string? MeetingDate { get; set; }
    public string? AlternateDate { get; set; }
    public string? MeetingCategory { get; set; }
    public string? MeetingSubcategory { get; set; }
    public string? MeetingDescription { get; set; }
    public string? Comments { get; set; }
    public string? Classification { get; set; }
}
