```markdown
# Feature Specification: Restrict Dashboard to Authenticated Users

**Feature Branch**: `002-auth-dashboard`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "Only authenticated users see the dashboard page"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Dashboard (Priority: P1)

An authenticated user visits the application and navigates to the Dashboard page to view personalized data.

**Why this priority**: The dashboard is the primary post-login landing and central to the user's workflow; ensuring only authenticated users can access it protects sensitive data.

**Independent Test**: Sign in as a valid user, open the app, navigate to `/dashboard`, and verify the dashboard content loads and API calls include a valid Authorization header.

**Acceptance Scenarios**:

1. **Given** an authenticated session, **When** the user navigates to `/dashboard`, **Then** the dashboard page is shown with personalized content (HTTP 200) and client-side UI displays dashboard widgets.
2. **Given** an authenticated session, **When** the SPA requests dashboard data, **Then** requests include `Authorization: Bearer <token>` and the server responds with dashboard payload.

---

### User Story 2 - Block Unauthenticated Access (Priority: P1)

An unauthenticated visitor attempts to reach the dashboard; the system prevents access and prompts to sign in.

**Why this priority**: Preventing unauthorized access is a security requirement and basic UX expectation.

**Independent Test**: Open the app in a fresh browser session (no auth), navigate to `/dashboard`, verify the SPA redirects to sign-in or shows a sign-in prompt and server responds with 401/302 for direct API calls.

**Acceptance Scenarios**:

1. **Given** no authenticated session, **When** the user requests `/dashboard`, **Then** the SPA shows a sign-in prompt or redirects to sign-in and does not render dashboard data.
2. **Given** no token, **When** an API call for dashboard data is made, **Then** the server returns HTTP 401 (or 302 redirect to auth if configured).

---

### User Story 3 - Role-Restricted Dashboard (Priority: P2) [NEEDS CLARIFICATION: role vs any authenticated user]

If the dashboard should be limited to users with specific roles (e.g., `requestor`, `secadmin`), the system enforces role checks.

**Why this priority**: Role restriction reduces surface area for sensitive actions; apply only if required by product rules.

**Independent Test**: Sign in as a user without the role and confirm access is denied (HTTP 403). Sign in as a user with the role and confirm access granted.

**Acceptance Scenarios**:

1. **Given** an authenticated user without required role, **When** they request `/dashboard`, **Then** server returns HTTP 403 and SPA shows an access-denied message.
2. **Given** an authenticated user with required role, **When** they request `/dashboard`, **Then** server returns HTTP 200 and dashboard content is visible.

---

### Edge Cases

- Token expired mid-session: SPA must attempt silent renew and redirect to interactive sign-in if renew fails.
- Cached unauthenticated pages: ensure server does not serve cached dashboard HTML to anonymous users.
- Multiple tabs: signing out in one tab should remove dashboard access in other tabs.
- API requests from third-party origins: CORS and auth policies must block unauthorized requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The SPA MUST hide or disable the dashboard navigation link when the user is unauthenticated.
- **FR-002**: The SPA MUST redirect unauthenticated users attempting direct navigation to `/dashboard` to the sign-in flow or show a sign-in prompt.
- **FR-003**: Dashboard data endpoints (server) MUST require authentication and return HTTP 401 for unauthenticated requests.
- **FR-004**: If role restriction is enabled, server endpoints MUST validate roles and return HTTP 403 for authenticated users lacking required roles.
- **FR-005**: The SPA MUST include a route guard so client-side routing prevents rendering the dashboard for unauthenticated users.
- **FR-006**: The server MUST validate JWTs using configured `Authentication:Authority` and `Authentication:Audience` and map role claims to `roles` claim type.
- **FR-007**: The server MUST log denied access attempts with timestamp, user (if present), and endpoint.

### Key Entities *(include if feature involves data)*

- **User**: { id, displayName, email, roles }
- **DashboardView**: { userId, widgets: [], lastRefreshed }

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to access dashboard pages without a valid token result in HTTP 401/redirect or an explicit sign-in prompt.
- **SC-002**: 0 incidents of unauthenticated users seeing dashboard content in manual tests and automated checks.
- **SC-003**: When enabled, role-restricted access returns HTTP 403 for users without role in >=95% of tested cases.
- **SC-004**: Dashboard page loads for authenticated users within 2 seconds for 95% of test requests.

## Assumptions

- MSAL-based auth and JWT validation is already wired in the SPA and server (existing work in branch `001-auth-msal-azuread`).
- Default behavior if not specified: any authenticated user can see the dashboard unless the project requests role-restriction (see clarification).
- The environment includes an Azure AD tenant and app registrations for SPA and API.

## Notes

- Implementation must favor server-side enforcement (deny in API) over purely client-side checks.
- If roles are used, ensure role definitions are added in the API app registration and users/groups are assigned in Enterprise Applications.

```
