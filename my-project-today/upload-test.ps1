Add-Type -AssemblyName System.Net.Http

function Upload-File {
    param($RequestId, $FilePath)
    
    $client = New-Object System.Net.Http.HttpClient
    $content = New-Object System.Net.Http.MultipartFormDataContent
    
    $fileStream = [System.IO.File]::OpenRead($FilePath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
    $content.Add($streamContent, "file", [System.IO.Path]::GetFileName($FilePath))
    
    try {
        $response = $client.PostAsync("http://localhost:5000/api/meetingrequests/$RequestId/attachments", $content).Result
        $statusCode = [int]$response.StatusCode
        $body = $response.Content.ReadAsStringAsync().Result
        
        return @{
            Success = ($statusCode -eq 201)
            StatusCode = $statusCode
            Body = $body
        }
    } finally {
        $fileStream.Close()
        $client.Dispose()
    }
}

# Create 6 test files
for ($i = 1; $i -le 6; $i++) {
    $fileName = "C:\Users\arath\my-project-today\limit-test-$i.txt"
    Set-Content -Path $fileName -Value "Test file $i for limit testing - content data here"
}

Write-Output "Created 6 test files. Uploading to request 36...`n"

# Upload files and track results
$results = @()
for ($i = 1; $i -le 6; $i++) {
    $filePath = "C:\Users\arath\my-project-today\limit-test-$i.txt"
    Write-Output "Uploading file $i..."
    $result = Upload-File -RequestId 36 -FilePath $filePath
    
    $results += $result
    
    if ($result.Success) {
        Write-Output "  [OK] File $i uploaded (201 Created)"
    } else {
        Write-Output "  [REJECTED] File $i rejected ($($result.StatusCode))"
        $errorObj = $result.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorObj.error) {
            Write-Output "    Error: $($errorObj.error)"
        }
    }
}

Write-Output "`n=== SUMMARY ==="
$successful = ($results | Where-Object { $_.Success }).Count
$rejected = ($results | Where-Object { -not $_.Success }).Count
Write-Output "Successful uploads: $successful"
Write-Output "Rejected uploads: $rejected"

if ($successful -eq 5 -and $rejected -eq 1) {
    Write-Output "`n[SUCCESS] 5-FILE LIMIT WORKING CORRECTLY!"
}
