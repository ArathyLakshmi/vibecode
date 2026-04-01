namespace VibeCode.Server.Models;

public class MeetingRequestAttachment
{
    public int Id { get; set; }
    public int MeetingRequestId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public MeetingRequest? MeetingRequest { get; set; }
}
