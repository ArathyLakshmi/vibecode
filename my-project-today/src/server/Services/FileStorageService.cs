using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Models;

namespace VibeCode.Server.Services;

public class FileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly MeetingRequestsDbContext _context;
    private const string UploadBasePath = "Uploads/Attachments";

    public FileStorageService(IWebHostEnvironment environment, MeetingRequestsDbContext context)
    {
        _environment = environment;
        _context = context;
    }

    public async Task<MeetingRequestAttachment> SaveFileAsync(
        int meetingRequestId, 
        IFormFile file, 
        string? uploadedBy)
    {
        // Generate unique filename
        var extension = Path.GetExtension(file.FileName);
        var storedFileName = $"{Guid.NewGuid()}{extension}";
        
        // Create directory path
        var requestDirectory = Path.Combine(
            _environment.ContentRootPath, 
            UploadBasePath, 
            meetingRequestId.ToString());
        Directory.CreateDirectory(requestDirectory);

        // Full file path
        var filePath = Path.Combine(requestDirectory, storedFileName);
        var relativeFilePath = Path.Combine(UploadBasePath, meetingRequestId.ToString(), storedFileName);

        // Begin transaction
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Save file to disk
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Create database record
            var attachment = new MeetingRequestAttachment
            {
                MeetingRequestId = meetingRequestId,
                FileName = file.FileName,
                StoredFileName = storedFileName,
                FilePath = relativeFilePath,
                FileSize = file.Length,
                ContentType = file.ContentType,
                UploadedBy = uploadedBy,
                UploadedAt = DateTime.UtcNow
            };

            _context.MeetingRequestAttachments.Add(attachment);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return attachment;
        }
        catch
        {
            // Rollback transaction and delete file
            await transaction.RollbackAsync();
            if (File.Exists(filePath))
                File.Delete(filePath);
            throw;
        }
    }

    public async Task DeleteFileAsync(int attachmentId)
    {
        var attachment = await _context.MeetingRequestAttachments.FindAsync(attachmentId);
        if (attachment == null) return;

        var fullPath = Path.Combine(_environment.ContentRootPath, attachment.FilePath);
        
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Delete file from disk
            if (File.Exists(fullPath))
                File.Delete(fullPath);

            // Delete database record
            _context.MeetingRequestAttachments.Remove(attachment);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public string GetFullPath(string relativePath)
    {
        return Path.Combine(_environment.ContentRootPath, relativePath);
    }
}
