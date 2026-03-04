# Export API Contract

**Endpoint**: `/api/meetingrequests/export`  
**Purpose**: Export filtered meeting requests to CSV or PDF format  
**Authentication**: Required (Bearer Token)

---

## Overview

The Export API allows users to download filtered meeting request results in CSV or PDF format. Export respects the same filter parameters as the search API, with additional format and column selection options.

**Key Features**:
- Export to CSV or PDF
- Configurable column selection
- Respects current filters (same as search API)
- Background processing for large exports (planned for future)
- Rate limited to prevent abuse

---

## Endpoint

### Export Meeting Requests

Export filtered meeting requests in specified format.

#### Request

**HTTP Method**: `GET`

**Endpoint**: `/api/meetingrequests/export`

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
Accept: text/csv OR application/pdf
```

**Query Parameters** (Filters - same as search API):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | Export format: `csv` or `pdf` (default: csv) |
| `columns` | string[] | No | Columns to include (default: all) |
| `categories[]` | string[] | No | Filter by categories |
| `statuses[]` | string[] | No | Filter by statuses |
| `classifications[]` | string[] | No | Filter by classifications |
| `requestors[]` | string[] | No | Filter by requestors |
| `startDate` | date | No | Meeting date >= this date |
| `endDate` | date | No | Meeting date <= this date |
| `createdAfter` | datetime | No | Created timestamp >= this |
| `createdBefore` | datetime | No | Created timestamp <= this |
| `referenceNumber` | string | No | Exact reference number match |
| `query` | string | No | Boolean text search |

**Format Parameter**:
- `csv`: Comma-separated values (default)
- `pdf`: PDF document

**Columns Parameter** (array, optional):

Valid column names:
- `referenceNumber`
- `title`
- `description`
- `objectives`
- `category`
- `classification`
- `meetingDate`
- `duration`
- `location`
- `requestorName`
- `requestorEmail`
- `requestorDepartment`
- `status`
- `createdAt`
- `updatedAt`

**Default Columns** (if not specified):
```
referenceNumber, title, category, status, meetingDate, requestorName, createdAt
```

**Example Requests**:
```http
# Export to CSV with default columns
GET /api/meetingrequests/export?categories[]=Technical&statuses[]=Pending

# Export to PDF with custom columns
GET /api/meetingrequests/export?format=pdf&columns[]=referenceNumber&columns[]=title&columns[]=meetingDate&columns[]=status&categories[]=Budget

# Export all fields to CSV
GET /api/meetingrequests/export?format=csv&columns[]=referenceNumber&columns[]=title&columns[]=description&columns[]=objectives&columns[]=category&columns[]=classification&columns[]=meetingDate&columns[]=duration&columns[]=location&columns[]=requestorName&columns[]=requestorEmail&columns[]=requestorDepartment&columns[]=status&columns[]=createdAt&columns[]=updatedAt
```

---

#### Response (CSV Format)

**Success Status**: `200 OK`

**Headers**:
```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.csv"
```

**Body** (Example with default columns):
```csv
Reference Number,Title,Category,Status,Meeting Date,Requestor Name,Created At
10001,Q1 Budget Review,Budget,Pending,2026-03-15T14:00:00Z,John Doe,2026-03-01T10:30:00Z
10002,Security Audit,Technical,Approved,2026-03-20T09:00:00Z,Jane Smith,2026-03-02T11:15:00Z
10003,HR Policy Update,HR,Pending,2026-03-25T15:00:00Z,Bob Johnson,2026-03-03T09:45:00Z
```

**CSV Format Details**:
- UTF-8 encoding with BOM (for Excel compatibility)
- Comma-separated values
- Double quotes for text fields containing commas or newlines
- Header row with user-friendly column names
- ISO 8601 datetime format for dates

**Column Headers Mapping**:
| Field Name | CSV Header |
|------------|------------|
| `referenceNumber` | Reference Number |
| `title` | Title |
| `description` | Description |
| `objectives` | Objectives |
| `category` | Category |
| `classification` | Classification |
| `meetingDate` | Meeting Date |
| `duration` | Duration (minutes) |
| `location` | Location |
| `requestorName` | Requestor Name |
| `requestorEmail` | Requestor Email |
| `requestorDepartment` | Requestor Department |
| `status` | Status |
| `createdAt` | Created At |
| `updatedAt` | Updated At |

---

#### Response (PDF Format)

**Success Status**: `200 OK`

**Headers**:
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.pdf"
```

**Body**: Binary PDF document

**PDF Layout**:
- **Header**: "Meeting Requests Export" title, export date, filter summary
- **Table**: Selected columns in tabular format
- **Footer**: Page numbers, total count
- **Styling**: Professional layout with borders, alternating row colors

**PDF Example Structure**:
```
┌──────────────────────────────────────────────────────────┐
│ Meeting Requests Export                                  │
│ Generated: March 3, 2026 2:30 PM                         │
│ Filters: Category: Technical, Status: Pending            │
├──────────────────────────────────────────────────────────┤
│ Ref #   │ Title              │ Status  │ Meeting Date   │
├─────────┼────────────────────┼─────────┼────────────────┤
│ 10001   │ Q1 Budget Review   │ Pending │ Mar 15, 2026   │
│ 10002   │ Security Audit     │ Pending │ Mar 20, 2026   │
├──────────────────────────────────────────────────────────┤
│ Total: 2 results                          Page 1 of 1    │
└──────────────────────────────────────────────────────────┘
```

**PDF Library**: QuestPDF (lightweight, .NET native)

---

## Error Responses

### 400 Bad Request

**Scenario**: Invalid parameters

**Response**:
```json
{
  "error": "ValidationError",
  "message": "Invalid export parameters",
  "details": {
    "format": "Invalid format: xlsx. Valid formats: csv, pdf",
    "columns": "Invalid column: invalidColumn",
    "categories": "Invalid category: XYZ"
  }
}
```

**Common Validation Errors**:
| Field | Error Message |
|-------|---------------|
| `format` | "Invalid format: {value}. Valid formats: csv, pdf" |
| `columns` | "Invalid column: {value}" |
| `categories[]` | "Invalid category: {value}" |
| `startDate` | "Invalid date format. Use YYYY-MM-DD" |
| (all filter params) | Same validation as search API |

---

### 401 Unauthorized

**Scenario**: Missing or invalid authentication

**Response**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 413 Payload Too Large

**Scenario**: Export exceeds size limits (>10,000 records)

**Response**:
```json
{
  "error": "PayloadTooLarge",
  "message": "Export result exceeds maximum limit of 10,000 records. Please refine your filters.",
  "details": {
    "matchingRecords": 15000,
    "maxRecords": 10000
  }
}
```

**Mitigation**: User must apply more selective filters to reduce result count.

---

### 429 Too Many Requests

**Scenario**: Rate limit exceeded (5 exports/minute)

**Response**:
```json
{
  "error": "TooManyRequests",
  "message": "Export rate limit exceeded. Try again in 45 seconds."
}
```

**Headers**:
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709481720
Retry-After: 45
```

---

### 500 Internal Server Error

**Scenario**: Export generation failure

**Response**:
```json
{
  "error": "InternalServerError",
  "message": "Failed to generate export. Please try again."
}
```

---

## Examples

### Example 1: Export to CSV (Default Columns)

**Request**:
```http
GET /api/meetingrequests/export?categories[]=Technical&statuses[]=Pending
Authorization: Bearer eyJhbGciOiJSUzI1...
Accept: text/csv
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.csv"

Reference Number,Title,Category,Status,Meeting Date,Requestor Name,Created At
10001,"Q1 Budget Review",Technical,Pending,2026-03-15T14:00:00Z,John Doe,2026-03-01T10:30:00Z
10002,"Security Audit Meeting",Technical,Pending,2026-03-20T09:00:00Z,Jane Smith,2026-03-02T11:15:00Z
```

---

### Example 2: Export to CSV (Custom Columns)

**Request**:
```http
GET /api/meetingrequests/export?format=csv&columns[]=referenceNumber&columns[]=title&columns[]=description&columns[]=meetingDate&columns[]=requestorEmail&categories[]=Budget
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.csv"

Reference Number,Title,Description,Meeting Date,Requestor Email
10010,"Annual Budget Planning","Comprehensive review of annual budget allocations and forecasts",2026-04-10T14:00:00Z,finance@example.com
10011,"Q2 Budget Review","Quarterly budget review for Q2 2026",2026-04-15T10:00:00Z,accounting@example.com
```

---

### Example 3: Export to PDF

**Request**:
```http
GET /api/meetingrequests/export?format=pdf&columns[]=referenceNumber&columns[]=title&columns[]=status&columns[]=meetingDate&categories[]=Technical&statuses[]=Pending
Authorization: Bearer eyJhbGciOiJSUzI1...
Accept: application/pdf
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.pdf"

[Binary PDF content]
```

---

### Example 4: Export with Date Range

**Request**:
```http
GET /api/meetingrequests/export?format=csv&startDate=2026-03-01&endDate=2026-03-31&categories[]=Budget&columns[]=referenceNumber&columns[]=title&columns[]=meetingDate&columns[]=status
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.csv"

Reference Number,Title,Meeting Date,Status
10020,"March Budget Review",2026-03-10T14:00:00Z,Approved
10021,"End of Month Budget Closeout",2026-03-31T16:00:00Z,Pending
```

---

### Example 5: Export with Boolean Query

**Request**:
```http
GET /api/meetingrequests/export?format=csv&query=budget%20AND%20quarterly&columns[]=referenceNumber&columns[]=title&columns[]=objectives
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="meeting-requests-2026-03-03.csv"

Reference Number,Title,Objectives
10030,"Quarterly Budget Planning","Review quarterly budget performance and plan next quarter allocations"
10031,"Q1 Budget Analysis","Analyze Q1 budget spending and identify optimization opportunities"
```

---

### Example 6: Export Too Large (413 Error)

**Request**:
```http
GET /api/meetingrequests/export?format=csv
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response** (if >10,000 matching records):
```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/json

{
  "error": "PayloadTooLarge",
  "message": "Export result exceeds maximum limit of 10,000 records. Please refine your filters.",
  "details": {
    "matchingRecords": 15000,
    "maxRecords": 10000
  }
}
```

---

### Example 7: Invalid Column Error

**Request**:
```http
GET /api/meetingrequests/export?format=csv&columns[]=referenceNumber&columns[]=invalidColumn
Authorization: Bearer eyJhbGciOiJSUzI1...
```

**Response**:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "ValidationError",
  "message": "Invalid export parameters",
  "details": {
    "columns": "Invalid column: invalidColumn. Valid columns: referenceNumber, title, description, objectives, category, classification, meetingDate, duration, location, requestorName, requestorEmail, requestorDepartment, status, createdAt, updatedAt"
  }
}
```

---

## CSV Generation Implementation

### Library

**CsvHelper** (4.0+): Mature, feature-rich, handles edge cases (quotes, newlines, special chars)

### Code Example

```csharp
using CsvHelper;
using CsvHelper.Configuration;

public async Task<FileContentResult> ExportToCsv(
    List<MeetingRequestDto> data, 
    List<string> columns)
{
    var config = new CsvConfiguration(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        Encoding = Encoding.UTF8
    };
    
    using var memoryStream = new MemoryStream();
    using var streamWriter = new StreamWriter(memoryStream, new UTF8Encoding(true)); // BOM
    using var csvWriter = new CsvWriter(streamWriter, config);
    
    // Write header row
    foreach (var column in columns)
    {
        csvWriter.WriteField(GetColumnHeader(column));
    }
    await csvWriter.NextRecordAsync();
    
    // Write data rows
    foreach (var item in data)
    {
        foreach (var column in columns)
        {
            csvWriter.WriteField(GetColumnValue(item, column));
        }
        await csvWriter.NextRecordAsync();
    }
    
    await streamWriter.FlushAsync();
    var bytes = memoryStream.ToArray();
    
    var fileName = $"meeting-requests-{DateTime.UtcNow:yyyy-MM-dd}.csv";
    return new FileContentResult(bytes, "text/csv")
    {
        FileDownloadName = fileName
    };
}
```

---

## PDF Generation Implementation

### Library

**QuestPDF** (2024.3+): Modern, fluent API, open-source, lightweight

### Code Example

```csharp
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public async Task<FileContentResult> ExportToPdf(
    List<MeetingRequestDto> data, 
    List<string> columns,
    Dictionary<string, object> filters)
{
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
                column.Item().Text($"Generated: {DateTime.UtcNow:MMMM dd, yyyy h:mm tt}")
                    .FontSize(10);
                column.Item().Text(GetFilterSummary(filters))
                    .FontSize(10).Italic();
            });
            
            // Content (table)
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
                text.Span($"Total: {data.Count} results");
                text.Span("  |  ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        });
    });
    
    var bytes = document.GeneratePdf();
    var fileName = $"meeting-requests-{DateTime.UtcNow:yyyy-MM-dd}.pdf";
    
    return new FileContentResult(bytes, "application/pdf")
    {
        FileDownloadName = fileName
    };
}
```

---

## Performance Considerations

### Limits

| Metric | Limit | Justification |
|--------|-------|---------------|
| Max records | 10,000 | Prevents memory exhaustion, large file sizes |
| CSV max size | ~5 MB | Reasonable for 10,000 records with ~500 bytes/row |
| PDF max size | ~10 MB | PDF overhead higher due to formatting |
| Processing timeout | 30 seconds | Prevents long-running requests |

### Memory Management

- Stream-based CSV writing (no full buffer in memory)
- Chunk data retrieval (page 1000 records at a time from DB)
- Dispose resources immediately after generation

### Query Optimization

- Use same indexes as search API
- Apply filters at database level (not in-memory)
- Select only required columns from database

```csharp
// Good: Select only needed columns
var query = _context.MeetingRequests
    .Where(FilterConditions)
    .Select(m => new 
    {
        m.ReferenceNumber,
        m.Title,
        m.Category,
        m.Status,
        m.MeetingDate
    });

// Bad: Select all columns
var query = _context.MeetingRequests
    .Where(FilterConditions)
    .ToList(); // Materialize everything
```

### Async Generation

For MVP: Synchronous generation (request waits for file)

**Future Enhancement**: Background job queue
1. User triggers export → returns job ID
2. Backend processes export in background
3. User polls status endpoint
4. Download link provided when complete

---

## Security Considerations

### Authorization

- Same user-scoped filtering as search API
- Users can only export data they can view
- No cross-user data exposure

### Rate Limiting

**Limits**:
- 5 exports per minute per user
- Max 20 exports per hour per user

**Enforcement**: In-memory rate limiter (AspNetCore.RateLimiting)

### Data Sanitization

- CSV field escaping (prevent formula injection)
- Remove leading `=`, `+`, `-`, `@` characters from text fields
- Quote all text fields in CSV

**Formula Injection Prevention**:
```csharp
private string SanitizeCsvField(string value)
{
    if (string.IsNullOrEmpty(value))
        return string.Empty;
    
    // Remove leading formula characters
    var dangerous = new[] { '=', '+', '-', '@', '\t', '\r' };
    while (value.Length > 0 && dangerous.Contains(value[0]))
        value = value.Substring(1);
    
    return value;
}
```

---

## Testing Strategy

### Unit Tests

Test export generation logic:
- CSV serialization with special characters
- PDF layout with varying data sizes
- Column selection logic
- Filename generation

### Integration Tests

Test full export flow:
```csharp
[Fact]
public async Task ExportToCsv_WithFilters_ReturnsCorrectFile()
{
    // Arrange
    await SeedMeetingRequests();
    
    // Act
    var response = await Client.GetAsync(
        "/api/meetingrequests/export?format=csv&categories[]=Technical");
    
    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Equal("text/csv", response.Content.Headers.ContentType.MediaType);
    
    var csvContent = await response.Content.ReadAsStringAsync();
    var lines = csvContent.Split('\n');
    
    Assert.Contains("Reference Number,Title", lines[0]); // Header
    Assert.True(lines.Length > 1); // Has data rows
}

[Fact]
public async Task ExportToPdf_WithCustomColumns_ReturnsValidPdf()
{
    await SeedMeetingRequests();
    
    var response = await Client.GetAsync(
        "/api/meetingrequests/export?format=pdf&columns[]=referenceNumber&columns[]=title");
    
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Equal("application/pdf", response.Content.Headers.ContentType.MediaType);
    
    var pdfBytes = await response.Content.ReadAsByteArrayAsync();
    Assert.StartsWith("%PDF", Encoding.ASCII.GetString(pdfBytes.Take(4).ToArray()));
}
```

### E2E Tests (Playwright)

Test export from UI:
```javascript
test('export search results to CSV', async ({ page }) => {
  await page.goto('/meeting-requests');
  
  // Apply filters
  await page.selectOption('[name="category"]', 'Technical');
  await page.click('button:has-text("Apply Filters")');
  
  // Trigger export
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export CSV")')
  ]);
  
  // Verify download
  expect(download.suggestedFilename()).toMatch(/meeting-requests-\d{4}-\d{2}-\d{2}\.csv/);
  
  // Read CSV content
  const path = await download.path();
  const csvContent = fs.readFileSync(path, 'utf-8');
  
  expect(csvContent).toContain('Reference Number,Title');
  expect(csvContent).toContain('Technical'); // Category filter applied
});
```

---

## Future Enhancements

### Background Processing

**Problem**: Large exports (thousands of records) block user request

**Solution**: Job queue system
1. POST `/api/exports` → Returns job ID
2. GET `/api/exports/{jobId}/status` → Check progress
3. GET `/api/exports/{jobId}/download` → Retrieve file when complete

**Benefits**:
- Non-blocking user experience
- Progress tracking
- Retry failed exports

### Additional Formats

- **Excel (.xlsx)**: ClosedXML library, richer formatting
- **JSON**: For programmatic consumption
- **XML**: For legacy system integration

### Email Delivery

**Feature**: Email export link instead of direct download

**Use Case**: Very large exports (>1000 records)

**Flow**:
1. User triggers export
2. Backend processes in background
3. Email sent with temporary download link (24hr expiration)

---

## Migration Notes

### No Database Changes

Export feature is read-only, no new tables required.

### NuGet Packages

Add to **VibeCode.Server.csproj**:
```xml
<PackageReference Include="CsvHelper" Version="30.0.1" />
<PackageReference Include="QuestPDF" Version="2024.3.0" />
```

### Deployment

1. **Phase 1**: Deploy backend with export endpoints
2. **Phase 2**: Deploy frontend with export buttons
3. **Rollback**: Remove export endpoints (no data impact)
