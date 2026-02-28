# MSAL + Azure AD Integration Guide

This guide explains how to configure Azure Active Directory (AAD) for the SPA and the API, set local environment variables, build the client, and run the server so the SPA can acquire tokens and call the API.

1) Register two apps in Azure AD

- SPA (client):
  - Platform: Single-page application
  - Redirect URI: `http://localhost:5001/` (or your dev server origin)
  - Grant implicit / authorization code flow (MSAL uses auth code + PKCE)
  - Note the **Application (client) ID** → use for `VITE_MSAL_CLIENT_ID`

- API (server):
  - Expose an API scope, e.g. `access_as_user`
  - Note the **Application (client) ID** → use as `Audience` for server config (api://{clientId})
  - Under "Expose an API" add a scope like `api://<server-client-id>/access_as_user`

2) Authorize SPA to call the API

- In the API app registration, add the SPA as a client (Grant consent) or in the SPA app registration, under "API permissions" add the API scope and grant admin consent for testing.

3) Configure local variables

- Client (Vite): create `src/client/.env` (not committed) from `.env.example` and set values:

```powershell
Set-Location src/client
copy .env.example .env
# then edit .env and set VITE_MSAL_CLIENT_ID and VITE_MSAL_AUTHORITY and VITE_MSAL_SCOPES
```

- Server: edit `src/server/appsettings.Development.json` (already contains placeholders) or set environment variables:

```powershell
$Env:Authentication__Authority = 'https://login.microsoftonline.com/<tenant-id>'
$Env:Authentication__Audience = 'api://<server-client-id>'
```

4) Install client dependencies and build

```powershell
# from repository root
Set-Location src/client
npm install
npm run build
# then deploy build to server wwwroot (project helper exists in repo):
Remove-Item -Recurse -Force ../server/wwwroot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path ../server/wwwroot | Out-Null
Copy-Item -Path dist\* -Destination ../server/wwwroot -Recurse -Force
```

5) Run the server

```powershell
Set-Location src/server
dotnet run --urls "http://localhost:5001"
```

6) Test login & API calls

- Open `http://localhost:5001` in browser, click Login. MSAL should open the sign-in flow, then acquire tokens.
- The client uses the `VITE_MSAL_SCOPES` value when acquiring tokens; ensure the scope matches the API scope you exposed (e.g. `api://<server-client-id>/access_as_user`).
- After login, create a meeting request; the client will attach an `Authorization: Bearer <token>` header to POSTs.

Notes

- The environment in this workspace couldn't run `npm install` for MSAL packages; run `npm install` locally. If you get package resolution errors, try clearing npm cache and ensuring registry access.
- Keep secrets out of source control. Use `.env` (gitignored) or environment variables for production.
