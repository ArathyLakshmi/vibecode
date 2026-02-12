# Unified Board Solutions (React + Tailwind) + ASP.NET Core

This repository contains a minimal single-page application scaffold for
Unified Board Solutions:

- `src/server` — ASP.NET Core backend (serves API and static files)
- `src/client` — React app (Vite) with Tailwind CSS

## Features

### Meeting Requests Management
- **CRUD Operations**: Create, view, update, and delete meeting requests
- **Authentication**: Microsoft Azure AD (MSAL) integration for secure access
- **Infinite Scroll**: Automatic pagination with load-more functionality
- **Status Filtering**: Filter requests by status (Draft, Pending, Approved, Confirmed, Cancelled, Announced)
- **Search**: Full-text search across reference numbers, requestor names, titles, and dates

### Requestor Filter Toggle (Feature: 1-requestor-filter)
Filter meeting requests by requestor to quickly switch between personal and team views.

**User Interface:**
- Toggle control above the meeting requests list
- Two options:
  - **My Requests** (default): Shows only your submitted requests
  - **All Requests**: Shows all requests from all team members

**How It Works:**
1. Filter defaults to "My Requests" when you load the page
2. Click "All Requests" to view all team submissions
3. Click "My Requests" to return to your personal view
4. Filter works seamlessly with search, status filters, and infinite scroll

**Technical Implementation:**
- Frontend: Fluent UI Pivot component tracks filter state
- Backend: API accepts optional `requestorEmail` query parameter
- Database: `RequestorEmail` column on `MeetingRequests` table
- Authentication: User email extracted from MSAL context (`accounts[0].username`)

**Example API Usage:**
```bash
# Get only john.doe's requests
GET /api/meetingrequests?requestorEmail=john.doe@example.com

# Get all requests (no filter)
GET /api/meetingrequests
```

**Accessibility:**
- Keyboard navigation: Tab to focus, Arrow keys to switch options, Enter/Space to activate
- ARIA labels: `aria-label="Filter by requestor"` on Pivot component
- Screen reader support: Announces current filter state

**Testing:**
- Backend: 4 integration tests (xUnit) in `src/tests/MeetingRequests.IntegrationTests/`
- Frontend: E2E tests (Playwright) in `src/client/e2e/tests/requestor-filter.spec.ts`

---

## Quickstart (Windows):

1. Frontend (dev):
   - Open a terminal in `src/client`
   - `npm install`
   - `npm run dev` (Vite dev server on localhost:5173)

2. Backend (serve built frontend):
   - Build frontend: `npm run build` in `src/client` (creates `dist`)
   - Copy `dist` to `src/server/wwwroot` (or configure Vite `build.outDir` to point there)
   - In `src/server`: `dotnet restore` then `dotnet run` (server serves API and static files)

API example: GET `/api/hello` returns JSON message.

Notes:
- Tailwind requires PostCSS/Tailwind install and build step.
- This scaffold uses .NET 7.0 target; change `TargetFramework` in the `.csproj` if needed.
