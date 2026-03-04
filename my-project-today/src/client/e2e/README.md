E2E tests (Playwright)

How to run locally:

1. Install client dependencies:

```bash
cd src/client
npm ci
```

2. Build the client in test mode (this enables a TestAuthProvider instead of real MSAL):

```bash
npm run e2e:build:test
```

3. Deploy the build to the server and start the server (from repository root):

```bash
# from repository root (project)
# replace with your start commands if different
Stop-Process -Name VibeCode.Server -ErrorAction SilentlyContinue -Force
Remove-Item -Recurse -Force src/server/wwwroot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path src/server/wwwroot | Out-Null
Copy-Item -Path src/client/dist/* -Destination src/server/wwwroot -Recurse -Force
Start-Process -FilePath 'dotnet' -ArgumentList 'run','--urls','http://localhost:5001' -WorkingDirectory (Resolve-Path src/server).Path -NoNewWindow -PassThru
```

4. Run Playwright tests:

```bash
cd src/client
npx playwright test
```

Notes:
- Tests run in `VITE_TEST_MODE=true` which uses a simulated auth provider; they do not contact Azure AD.
- The test suite assumes the server is reachable at `http://localhost:5001`.
