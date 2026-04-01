Set-Location 'C:\Users\arath\my-project-today'
$short='email-password-login'
$nums=@()
try { git fetch --all --prune } catch { }
# remote
$remote = git ls-remote --heads origin 2>$null
if ($remote) {
  $remote | ForEach-Object {
    if ($_ -match "refs/heads/([0-9]+)-$short$") { $nums += [int]$matches[1] }
  }
}
# local branches
$local = git branch 2>$null
if ($local) {
  $local | ForEach-Object {
    $b = ($_ -replace '^\s*[\*\s]+','')
    if ($b -match "^([0-9]+)-$short$") { $nums += [int]$matches[1] }
  }
}
# specs dirs
if (Test-Path .\specs) {
  Get-ChildItem -Path .\specs -Directory | ForEach-Object {
    if ($_.Name -match "^([0-9]+)-$short$") { $nums += [int]$matches[1] }
  }
}
if ($nums.Count -eq 0) { $next=1 } else { $next = ($nums | Measure-Object -Maximum).Maximum + 1 }
Write-Output "NEXT=$next"
