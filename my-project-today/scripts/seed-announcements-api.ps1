# Seed test data for Announcements feature using API
# Creates meeting requests with Status="Announced" for testing

Write-Host "Seeding test data for Announcements feature..." -ForegroundColor Cyan
Write-Host "Note: This assumes backend is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host ""

$apiBase = "http://localhost:5000/api/meetingrequests"

# Test announcements to create
$announcements = @(
    @{
        MeetingTitle = "Q1 Budget Review Meeting"
        MeetingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
        MeetingCategory = "Finance"
        Classification = "Internal"
        MeetingDescription = "Quarterly budget review for all departments"
        RequestorName = "John Doe"
        RequestType = "Budget Review"
        Country = "USA"
    },
    @{
        MeetingTitle = "Product Launch Strategy Session"
        MeetingDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
        MeetingCategory = "Product"
        Classification = "Confidential"
        MeetingDescription = "Strategic planning for upcoming product launch"
        RequestorName = "Jane Smith"
        RequestType = "Strategy Session"
        Country = "USA"
    },
    @{
        MeetingTitle = "Team Building Workshop"
        MeetingDate = (Get-Date).AddDays(21).ToString("yyyy-MM-dd")
        MeetingCategory = "HR"
        Classification = "Internal"
        MeetingDescription = "Annual team building activities and workshops"
        RequestorName = "Bob Johnson"
        RequestType = "Workshop"
        Country = "USA"
    }
)

$successCount = 0
$errorCount = 0

foreach ($announcement in $announcements) {
    try {
        $json = $announcement | ConvertTo-Json -Compress
        Write-Host "Creating: $($announcement.MeetingTitle)..." -NoNewline
        
        # Note: In production, this would need authentication token
        # For now, we'll use the endpoint directly assuming local dev
        $response = Invoke-WebRequest -Uri $apiBase `
            -Method POST `
            -ContentType "application/json" `
            -Body $json `
            -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✓" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ✗ (Status: $($response.StatusCode))" -ForegroundColor Yellow
            $errorCount++
        }
    } catch {
        Write-Host " ✗ Error: $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "Seed complete: $successCount succeeded, $errorCount failed" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Note: Created items have Status='Draft' by default." -ForegroundColor Cyan
Write-Host "You'll need to manually update Status to 'Announced' in the database or via API." -ForegroundColor Cyan
