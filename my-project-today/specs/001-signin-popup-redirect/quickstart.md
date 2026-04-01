# Quickstart: Verify Sign-in Popup Redirect (local)

1. Build and deploy the SPA (non-test-mode) to the local server:

```powershell
# from repo root
Set-Location 'C:\Users\arath\my-project-today\src\client'
npm run build
Set-Location 'C:\Users\arath\my-project-today'
Stop-Process -Name VibeCode.Server -ErrorAction SilentlyContinue -Force
Remove-Item -Recurse -Force src\server\wwwroot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path src\server\wwwroot | Out-Null
Copy-Item -Path src\client\dist\* -Destination src\server\wwwroot -Recurse -Force
Start-Process -FilePath 'dotnet' -ArgumentList 'run','--urls','http://localhost:5001' -WorkingDirectory (Resolve-Path src\server).Path -NoNewWindow -PassThru
```

2. Open developer tools (Console + Network) in your browser.
3. Navigate to `http://localhost:5001/login`.
4. Optionally enter an email in the form, then click `Sign in (popup)`.
5. Confirm a popup/tab opens and the URL begins with `https://login.microsoftonline.com/` and contains the expected query params (`client_id`, `scope`, `redirect_uri`, `prompt=select_account`).
6. After completing sign-in in the popup, confirm the popup redirects to `http://localhost:5001/login` and the main app detects authentication and returns to the original route.

Playwright snippet (capture popup URL):

```ts
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('button:has-text("Sign in (popup)")')
])
await popup.waitForLoadState('load')
const url = popup.url()
expect(url).toMatch(/^https:\/\/login.microsoftonline.com\//)
expect(url).toContain('prompt=select_account')
expect(url).toContain('redirect_uri=' + encodeURIComponent('http://localhost:5001/login'))
```

Troubleshooting:
- If the popup does not open, clear `localStorage` keys starting with `msal.` and retry.
- If the browser blocks popups in tests, ensure Playwright captures the `popup` event instead of relying on a new window being created manually.

