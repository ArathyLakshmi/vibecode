Write-Output "=== GET / ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5001/' -UseBasicParsing -TimeoutSec 15
    Write-Output ("Status: " + $r.StatusCode)
    $c = $r.Content
    if ($c -and $c.Length -gt 500) { $c = $c.Substring(0,500) + '...[truncated]' }
    Write-Output $c
} catch {
    Write-Output ("GET / error: " + $_.Exception.Message)
}

Write-Output "=== GET /login ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5001/login' -UseBasicParsing -TimeoutSec 15
    Write-Output ("Status: " + $r.StatusCode)
    $c = $r.Content
    if ($c -and $c.Length -gt 500) { $c = $c.Substring(0,500) + '...[truncated]' }
    Write-Output $c
} catch {
    Write-Output ("GET /login error: " + $_.Exception.Message)
}

Write-Output "=== POST /api/meetingrequests/draft ==="
$body = @{ MeetingTitle='Smoke Test Draft'; MeetingDate=''; AlternateDate=''; MeetingCategory='Ops'; MeetingSubcategory='Test'; MeetingDescription='smoke' } | ConvertTo-Json
try {
    $r = Invoke-WebRequest -Method Post -Uri 'http://localhost:5001/api/meetingrequests/draft' -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Output ("Status: " + $r.StatusCode)
    $resp = $r.Content
    if ($resp -and $resp.Length -gt 500) { $resp = $resp.Substring(0,500) + '...[truncated]' }
    Write-Output $resp
} catch {
    if ($_.Exception.Response -ne $null) {
        try { $code = $_.Exception.Response.StatusCode.value__ } catch { $code = 'unknown' }
        Write-Output ("POST error status: " + $code)
    }
    Write-Output ("POST error: " + $_.Exception.Message)
}
