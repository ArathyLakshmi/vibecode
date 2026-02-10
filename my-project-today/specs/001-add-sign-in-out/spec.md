# Feature: Add Sign-in and Sign-out

Summary

Add a simple, user-friendly sign-in and sign-out experience for the SPA using Azure AD (MSAL) so users can authenticate, see their display name, and optionally have the server prefer the authenticated identity when persisting meeting requests.

Actors

- End user (board member, scheduler)
- System: SPA (React) and API (ASP.NET Core)

Actions

- User signs in via Azure AD from the SPA
- SPA acquires an access token and attaches it to API calls
- Server validates incoming JWTs and, when present, uses the principal's name for RequestorName and returns whoami
- User signs out from the SPA which clears local MSAL state and optionally revokes session

Data

- Identity claims: name, preferred_username, sub/oid
- Access token for API scope (e.g., api://<server-client-id>/access_as_user)

Constraints

- Must be technology-agnostic in acceptance criteria (user-facing outcomes)
- Use Authorization header Bearer tokens between SPA and API
- Local dev supports un-authenticated fallback (existing behaviour)

Assumptions

- Azure AD tenant and two app registrations exist (SPA and API)
- API will be configured with `Authentication:Authority` and `Authentication:Audience` for JWT validation in development
- SPA will use MSAL (`@azure/msal-browser`, `@azure/msal-react`) to handle auth code + PKCE flow
- Existing `GET /api/meetingrequests/whoami` and server-side resolution of RequestorName will be used

[Answer: Optional] Submitting meeting requests remains optional — the server will use the authenticated principal when present, and otherwise accept client-supplied `RequestorName`.

User Scenarios & Testing

1. Sign in (happy path)
   - Given a user visits the SPA
   - When they click "Login" and complete Azure AD sign-in
   - Then the SPA shows the user's display name in the UI, and `GET /api/meetingrequests/whoami` returns the name
   - Test: Browser DevTools Network shows `Authorization: Bearer <token>` on POST /api/meetingrequests

2. Sign out (happy path)
   - Given a signed-in user
   - When they click "Logout"
   - Then the SPA removes the visible user name and whoami returns null in subsequent unauthenticated requests

3. Unauthenticated fallback
   - Given a user not signed in
   - When they create a meeting request
   - Then the client sends the RequestorName field provided in the form and the server persists it

4. Token acquisition failure
   - Given a user attempts to acquire a token silently and it fails
   - When SPA falls back to interactive acquisition (popup/redirect)
   - Then the user is prompted to sign in and the flow continues

Functional Requirements (testable)

- FR1: SPA shows a `Login` button when user is unauthenticated and `Logout` + user display name when authenticated. (Verify DOM contains button and name after sign-in)
- FR2: SPA acquires an access token for configured API scopes and attaches `Authorization: Bearer` header to protected API calls. (Verify network requests include header)
- FR3: Server validates incoming JWTs when `Authentication:Authority` and `Authentication:Audience` are configured; unauthenticated requests continue to work as before. (Integration test: call API with/without token)
- FR4: Server's `POST /api/meetingrequests` and `/draft` prefer authenticated principal's name for RequestorName when present. (Verify saved record `RequestorName` matches whoami)
- FR5: `GET /api/meetingrequests/whoami` returns `{ name: string }` when authenticated and `null` when not. (API test)

Success Criteria

- Users can sign in and see their display name within one interaction (click → sign-in → display) 95% of the time in testing.
- After sign-in, 95% of POST requests from the SPA include a valid Authorization header for a sample user in tests.
- Unauthenticated users can still submit meeting requests without error; server persists client-supplied RequestorName.

Key Entities

- User: { id, displayName, email }
- Token: Access token for API scope

Dependencies

- Azure AD tenant and app registrations
- MSAL packages for SPA
- Server JWT bearer package (already present)

Open questions

- None remain.

Spec ready for planning
