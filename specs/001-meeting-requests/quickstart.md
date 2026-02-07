# Quickstart: Board Meeting Request & Voting System

**Phase**: Phase 1 Design  
**Status**: Ready for Development

This guide will get you up and running with the Board Meeting Request & Voting System in 15 minutes.

## Prerequisites

- **Backend**: .NET 8 SDK (download from https://dotnet.microsoft.com/download/dotnet/8.0)
- **Frontend**: Node.js 18+ (https://nodejs.org/)
- **Database**: SQL Server 2022 or Azure SQL Database with connection string
- **Authentication**: Azure AD B2C setup for external voters (or local JWT tokens for development)
- **Editor**: Visual Studio Code or Visual Studio 2022 Community

## Project Structure

```
my-project/
├── backend/                   # ASP.NET Core 8 API
│   ├── src/
│   │   ├── Api/              # Endpoint definitions
│   │   ├── Domain/           # Entities (Meeting, Vote, Document, etc.)
│   │   ├── Services/         # Business logic
│   │   ├── Data/             # DbContext, Migrations
│   │   └── Program.cs        # DI Container, middleware setup
│   ├── tests/
│   └── Directory.Build.props # Shared project settings
│
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Full-page views
│   │   ├── services/         # API client
│   │   └── App.tsx           # Root component
│   └── package.json
│
└── README.md
```

---

## Step 1: Clone & Setup Backend

### 1.1 Install Dependencies

```bash
cd backend
dotnet restore
```

### 1.2 Configure Database Connection

Create `backend/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=BoardMeetingDB;Integrated Security=true;TrustServerCertificate=true;"
  },
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "YOUR_TENANT_ID",
    "ClientId": "YOUR_CLIENT_ID",
    "ClientSecret": "YOUR_CLIENT_SECRET"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.EntityFrameworkCore.Database.Command": "Debug"
    }
  }
}
```

**For local development**, create a local SQL Server:

```bash
# Using Docker (if available)
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=MyPassword123!' `
  -p 1433:1433 --name sqlserver `
  mcr.microsoft.com/mssql/server:2022-latest

# Connection string: Server=localhost,1433;User Id=sa;Password=MyPassword123;Database=BoardMeetingDB;TrustServerCertificate=true;
```

### 1.3 Apply Database Migrations

```bash
cd backend
dotnet ef database update --project src/BoardMeeting.Data.csproj
```

This creates all tables (Users, MeetingRequests, Meetings, Documents, Votes, VoteSubmissions, etc.) with indices.

### 1.4 Run Backend Server

```bash
cd backend
dotnet run --project src/BoardMeeting.Api.csproj --launch-profile Development
```

Expected output:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
      Now listening on: https://localhost:5001
```

✅ **Backend is running on http://localhost:5000**

---

## Step 2: Setup Frontend

### 2.1 Install Dependencies

```bash
cd frontend
npm install
```

### 2.2 Configure Environment

Create `frontend/.env.development.local`:

```env
VITE_API_URL=http://localhost:5000/v1
VITE_AUTH_AUTHORITY=https://login.microsoftonline.com/YOUR_TENANT_ID
VITE_AUTH_CLIENT_ID=YOUR_CLIENT_ID
VITE_SCOPES=api://YOUR_API_IDENTIFIER/api.access
```

### 2.3 Run Frontend Development Server

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v4.5.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ **Frontend is running on http://localhost:5173**

---

## Step 3: First Feature Walkthrough (P1 - Meeting Requests)

### 3.1 Verify API Health

```bash
curl http://localhost:5000/v1/health
```

Expected: `{ "status": "healthy" }`

### 3.2 Create a Test User (Backend Console)

```bash
cd backend
dotnet run --project src/BoardMeeting.Data.csproj -- seed-users
```

This creates:
- **alice@ubs.example.com** (Role: RegularUser)
- **bob@ubs.example.com** (Role: SecAdmin)
- **charlie@external.com** (Role: ExternalMember)

### 3.3 Login to Frontend

1. Open http://localhost:5173
2. Click "Login"
3. Use Alice's account: alice@ubs.example.com (or local dev login)

### 3.4 Create a Meeting Request

1. Click "Request Meeting" button
2. Fill form:
   - **Date**: 2026-02-20
   - **Time**: 14:30
   - **Location**: Board Room A
   - **Agenda**: "Q1 Financial Review"
3. Click "Submit"
4. Verify notification: "Meeting request submitted successfully"

### 3.5 Approve Meeting (as SEC Admin)

1. Logout and login as Bob (bob@ubs.example.com, SecAdmin)
2. Navigate to "Pending Requests" dashboard
3. Click on Alice's meeting request
4. Click "Approve"
5. Confirm: "Meeting created for 2026-02-20 at 14:30"

### 3.6 View Approved Meeting (as Regular User)

1. Logout and login as Alice
2. Dashboard shows "Upcoming Meetings" section
3. Meeting appears: "Q1 Financial Review - 2026-02-20 14:30"

✅ **P1 Flow Complete**: Request → Approve → View

---

## Step 4: API Testing

### 4.1 Test Meeting Request Endpoint

```bash
# Create meeting request
curl -X POST http://localhost:5000/v1/meeting-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "proposedDate": "2026-02-22",
    "proposedTime": "10:00:00",
    "location": "Virtual - Zoom",
    "agenda": "Board strategy session"
  }'

# Response: 201 Created
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "Pending",
#   "createdAt": "2026-02-07T10:00:00Z"
# }
```

### 4.2 View API Documentation

OpenAPI schemas are available at:
- **Meetings API**: [contracts/meetings.openapi.yaml](contracts/meetings.openapi.yaml)
- **Documents API**: [contracts/documents.openapi.yaml](contracts/documents.openapi.yaml)
- **Votes API**: [contracts/votes.openapi.yaml](contracts/votes.openapi.yaml)

**Swagger UI** (if configured):
```
https://localhost:5001/swagger/index.html
```

---

## Step 5: Running Tests

### 5.1 Unit Tests (Backend)

```bash
cd backend
dotnet test tests/BoardMeeting.Services.Tests.csproj
```

Expected: Tests for MeetingService, DocumentService, VoteService pass

### 5.2 Integration Tests (Backend)

```bash
cd backend
dotnet test tests/BoardMeeting.Api.Tests.csproj
```

Expected: API endpoint tests pass against test database

### 5.3 Frontend Tests

```bash
cd frontend
npm run test
```

Expected: Component and hook tests pass

---

## Step 6: Local Development Workflow

### 6.1 Making Changes to Backend

1. Edit entity or service file
2. If schema changes: Create migration
   ```bash
   cd backend
   dotnet ef migrations add DescribeYourChange --project src/BoardMeeting.Data.csproj
   dotnet ef database update
   ```
3. Restart API server (usually auto-reloads with hot-reload)
4. Test via API or frontend

### 6.2 Making Changes to Frontend

1. Edit React component
2. Frontend dev server hot-reloads automatically
3. Changes visible in browser immediately (no refresh needed)
4. Test component in context of page

### 6.3 Debugging Backend

**In Visual Studio Code**:
1. Install C# extension (ms-dotnettools.csharp)
2. Add breakpoints in code
3. Press F5 to launch debugger
4. Breakpoint pauses execution when hit
5. Inspect variables in debug panel

**In Visual Studio 2022**:
1. Open solution: `backend/BoardMeeting.sln`
2. Set breakpoints
3. Press F5 to debug
4. Full IDE debugging experience

### 6.4 Debugging Frontend

1. Open http://localhost:5173 in Chrome
2. Press F12 to open DevTools
3. Sources tab: Set breakpoints in React components
4. Console tab: Debug logs (use `console.log()`)
5. Network tab: Inspect API calls to backend

---

## Step 7: Database Inspection

### 7.1 View Database Tables

**Using SQL Server Management Studio**:
```
Server: localhost,1433
Authentication: SQL Server
Username: sa
Password: MyPassword123!
Database: BoardMeetingDB
```

**Using Azure Data Studio**:
1. Install from https://aka.ms/azuredatastudio
2. Add connection to localhost
3. Browse tables: Users, Meetings, Votes, VoteSubmissions, etc.

### 7.2 Check Audit Trail (Temporal Tables)

```sql
-- View current votes
SELECT * FROM Votes;

-- View all historical changes to votes
SELECT * FROM Votes FOR SYSTEM_TIME ALL WHERE Id = '550e8400-e29b-41d4-a716-446655440000';

-- View all vote submissions (audit trail)
SELECT VoterId, VoteId, Choice, SubmittedAt FROM VoteSubmissions WHERE VoteId = '550e8400-e29b-41d4-a716-446655440000' ORDER BY SubmittedAt;
```

---

## Step 8: Environment Setup for Phase 2 (Tasks/Implementation)

Once Phase 1 design is complete, development tasks will be decomposed by user story:

### Task Categories:

1. **P1 - Meeting Requests Implementation**
   - Task P1.1: API endpoints CRUD for MeetingRequest
   - Task P1.2: React form components for meeting request
   - Task P1.3: Approval/rejection workflow
   - Task P1.4: Email notifications

2. **P2 - Document Management**
   - Task P2.1: Document upload to Azure Blob Storage
   - Task P2.2: Document access control UI
   - Task P2.3: Document listing and metadata

3. **P2 - Vote Creation**
   - Task P2.4: Vote creation API and SEC admin UI
   - Task P2.5: Vote participant assignment

4. **P3 - Voting**
   - Task P3.1: Email magic link voting for external members
   - Task P3.2: Vote submission API and UI
   - Task P3.3: Vote results display

Each task is independently testable and deployable.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **API won't start** | Check connection string in appsettings.Development.json; ensure database exists |
| **Frontend shows 404** | Check VITE_API_URL matches backend URL (http://localhost:5000) |
| **Database migration fails** | Delete `BoardMeetingDB` database and rerun `dotnet ef database update` |
| **Authentication fails** | Verify Azure AD ClientId and TenantId in appsettings; or use local JWT tokens |
| **Null reference in tests** | Ensure test data is seeded before running integration tests |

---

## Next Steps

- 📖 Read [data-model.md](data-model.md) for entity relationships
- 🔌 Review [contracts/](contracts/) for API endpoint specifications
- 🚀 Start Phase 2: Task decomposition and feature implementation
- ✅ Follow [spec.md](spec.md) user stories as acceptance criteria

---

## Support & References

- **ASP.NET Core Docs**: https://docs.microsoft.com/en-us/aspnet/core/
- **React Docs**: https://react.dev
- **Entity Framework Core**: https://docs.microsoft.com/en-us/ef/core/
- **Azure SQL Database**: https://docs.microsoft.com/en-us/azure/azure-sql/

---

**Ready to build?** Start with Phase 2 task list or open an issue for setup help!

