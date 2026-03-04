# Seed test data for Announcements feature
# Creates meeting requests with Status="Announced" for testing

param(
    [string]$DbPath = "c:\Users\arath\my-project-today\src\server\meetingrequests.db"
)

Write-Host "Seeding test data for Announcements feature..." -ForegroundColor Cyan

# Import SQLite module if needed (or use System.Data.SQLite)
Add-Type -Path "System.Data.dll"

$connectionString = "Data Source=$DbPath;Version=3;"
$connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)

try {
    $connection.Open()
    Write-Host "Connected to database: $DbPath" -ForegroundColor Green

    # Get current max ID
    $maxIdCmd = $connection.CreateCommand()
    $maxIdCmd.CommandText = "SELECT COALESCE(MAX(Id), 0) FROM MeetingRequests"
    $maxId = [int]$maxIdCmd.ExecuteScalar()
    
    # Create test announcements
    $announcements = @(
        @{
            Id = $maxId + 1
            Title = "Q1 Budget Review Meeting"
            MeetingDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd HH:mm:ss")
            Category = "Finance"
            Classification = "Internal"
            Status = "Announced"
            IsDraft = 0
            ReferenceNumber = "FIN-2024-001"
            RequestorName = "John Doe"
            RequestType = "Budget Review"
            Country = "USA"
        },
        @{
            Id = $maxId + 2
            Title = "Product Launch Strategy Session"
            MeetingDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd HH:mm:ss")
            Category = "Product"
            Classification = "Confidential"
            Status = "Announced"
            IsDraft = 0
            ReferenceNumber = "PRD-2024-002"
            RequestorName = "Jane Smith"
            RequestType = "Strategy Session"
            Country = "USA"
        },
        @{
            Id = $maxId + 3
            Title = "Team Building Workshop"
            MeetingDate = (Get-Date).AddDays(21).ToString("yyyy-MM-dd HH:mm:ss")
            Category = "HR"
            Classification = "Internal"
            Status = "Announced"
            IsDraft = 0
            ReferenceNumber = "HR-2024-003"
            RequestorName = "Bob Johnson"
            RequestType = "Workshop"
            Country = "USA"
        },
        @{
            Id = $maxId + 4
            Title = "Past Meeting - Should Not Show"
            MeetingDate = (Get-Date).AddDays(-5).ToString("yyyy-MM-dd HH:mm:ss")
            Category = "Test"
            Classification = "Internal"
            Status = "Announced"
            IsDraft = 0
            ReferenceNumber = "TST-2024-004"
            RequestorName = "Test User"
            RequestType = "Test"
            Country = "USA"
        }
    )

    foreach ($announcement in $announcements) {
        $cmd = $connection.CreateCommand()
        $cmd.CommandText = @"
INSERT INTO MeetingRequests (
    Id, Title, MeetingDate, Category, Classification, Status, IsDraft, 
    ReferenceNumber, RequestorName, RequestType, Country
) VALUES (
    @Id, @Title, @MeetingDate, @Category, @Classification, @Status, @IsDraft,
    @ReferenceNumber, @RequestorName, @RequestType, @Country
)
"@
        $cmd.Parameters.AddWithValue("@Id", $announcement.Id) | Out-Null
        $cmd.Parameters.AddWithValue("@Title", $announcement.Title) | Out-Null
        $cmd.Parameters.AddWithValue("@MeetingDate", $announcement.MeetingDate) | Out-Null
        $cmd.Parameters.AddWithValue("@Category", $announcement.Category) | Out-Null
        $cmd.Parameters.AddWithValue("@Classification", $announcement.Classification) | Out-Null
        $cmd.Parameters.AddWithValue("@Status", $announcement.Status) | Out-Null
        $cmd.Parameters.AddWithValue("@IsDraft", $announcement.IsDraft) | Out-Null
        $cmd.Parameters.AddWithValue("@ReferenceNumber", $announcement.ReferenceNumber) | Out-Null
        $cmd.Parameters.AddWithValue("@RequestorName", $announcement.RequestorName) | Out-Null
        $cmd.Parameters.AddWithValue("@RequestType", $announcement.RequestType) | Out-Null
        $cmd.Parameters.AddWithValue("@Country", $announcement.Country) | Out-Null

        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  ✓ Added: $($announcement.Title)" -ForegroundColor Green
    }

    Write-Host "`nTest data seeded successfully!" -ForegroundColor Green
    Write-Host "  - 3 future announcements (should be visible)" -ForegroundColor Cyan
    Write-Host "  - 1 past announcement (should be hidden)" -ForegroundColor Cyan

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    if ($connection.State -eq 'Open') {
        $connection.Close()
    }
}
