namespace VibeCode.Server.Services;

public class FileValidationService
{
    private static readonly HashSet<string> AllowedExtensions = new()
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", 
        ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".txt"
    };

    private static readonly HashSet<string> AllowedMimeTypes = new()
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg",
        "image/png",
        "text/plain"
    };

    public const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

    public (bool IsValid, string? Error) ValidateFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return (false, "No file uploaded");

        if (file.Length > MaxFileSize)
            return (false, $"File exceeds maximum size of 10 MB");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            return (false, $"File type '{extension}' not allowed");

        if (!AllowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            return (false, $"Content type '{file.ContentType}' not allowed");

        return (true, null);
    }
}
