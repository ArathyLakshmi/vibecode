$json = @{
  MeetingTitle = "UI Test Meeting"
  MeetingDate = "2026-03-01"
  AlternateDate = ""
  MeetingCategory = "Governance"
  MeetingSubcategory = "Board Meeting"
  MeetingDescription = "Test insert for requestor fields"
  Comments = ""
  Classification = "Internal"
  RequestorName = "Alice Example"
  RequestType = "External"
  Country = "UK"
}
Write-Output "POST /api/meetingrequests ->"
$resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:5001/api/meetingrequests' -Body ($json | ConvertTo-Json) -ContentType 'application/json'
$resp | ConvertTo-Json
Write-Output ""
Write-Output "GET created id ->"
$id = $resp.id
Invoke-RestMethod -Method Get -Uri "http://localhost:5001/api/meetingrequests/$id" | ConvertTo-Json -Depth 5
