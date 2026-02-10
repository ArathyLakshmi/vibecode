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
        if (string.IsNullOrWhiteSpace(body.MeetingTitle) || !body.MeetingDate.HasValue)
            return BadRequest(new { error = "Missing required fields" });

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
            MeetingDate = body.MeetingDate,
            AlternateDate = body.AlternateDate,
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
        if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var sd)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date >= sd.Date);
        if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed)) q = q.Where(x => x.MeetingDate.HasValue && x.MeetingDate.Value.Date <= ed.Date);
        var result = await q.Select(x => new { id = x.Id, title = x.Title, meetingDate = x.MeetingDate, category = x.Category, classification = x.Classification, isDraft = x.IsDraft }).ToListAsync();
        return Ok(result);
    }
}

public class MeetingRequestBody
{
    public string? MeetingTitle { get; set; }
    public DateTime? MeetingDate { get; set; }
    public DateTime? AlternateDate { get; set; }
    public string? MeetingCategory { get; set; }
    public string? MeetingSubcategory { get; set; }
    public string? MeetingDescription { get; set; }
    public string? Comments { get; set; }
    public string? Classification { get; set; }
}
