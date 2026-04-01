**Feature**: Email/password login component

Summary
- Replace the current MSAL-driven sign-in button with an in-app login component that allows users to enter an email address and password and submit to sign in.

Actors
- **User**: Person attempting to sign in to the SPA.
- **System**: Server-side API that validates credentials and establishes an authenticated session or issues a token.

User Scenarios & Testing
- **Primary flow — successful login**: User navigates to `/login`, enters email and password, submits, server validates credentials, user is redirected to the original route and sees authenticated UI. Test: submit known valid credentials → HTTP 200 and redirect to original route; client shows user as signed in.
- **Failure — invalid credentials**: User submits wrong password → UI shows inline error and no redirect. Test: submit invalid credentials → HTTP 401 and error message.
- **Session persistence**: After successful login, user reloads SPA and remains signed in. Test: refresh page → authenticated UI persists.
- **Logout**: User logs out and is returned to `/login` and must re-enter credentials. Test: logout → session cleared, `/login` shown.

Functional Requirements (testable)
- FR1: The login page displays email and password fields and a Submit button.
- FR2: Submitting valid credentials results in a successful authentication response from the server and redirect to the original route within 3s.
- FR3: Submitting invalid credentials displays a clear error message and does not authenticate the user.
- FR4: Server sets a session token or returns a token that the client uses for subsequent authenticated API requests.
- FR5: The login flow must support preserving and returning to the original route (state) after sign-in.
- FR6: Logout must clear authentication state and return the user to `/login`.

Success Criteria
- Users can sign in with email/password and return to their original route in under 3 seconds (measured end-to-end in dev environment).
- 95% of valid sign-in attempts succeed on first try in functional tests.
- Error messages for invalid credentials are displayed within 1 second.

Key Entities
- `User` (email, displayName, id)
- `Credentials` (email, password — transmitted over TLS only)
- `Session` / `AuthToken` (token, expiry)

Assumptions
- Transport is TLS; passwords are never logged.
- Password storage and validation use secure practices (hash+salt) if stored locally.
- This feature is focused on UX and API contract; exact storage and identity provider choice will be clarified below.

Authentication backend
- Choice: **Azure AD (OAuth/OIDC)** — credentials and authentication will be delegated to Azure Active Directory. The application should not store or validate passwords directly in production.

Sign-in flow decision
- Choice: **MSAL redirect/popup (selected)** — the SPA will not collect user passwords. Instead, implement a small login component that optionally accepts the user's email to pass as `loginHint`, and then calls MSAL's `loginPopup` or `loginRedirect` with `prompt: 'select_account'` to force account selection.

Implementation notes (non-mandatory)
- Implement a `LoginForm` UI that contains an email input and a Submit button. On submit, call MSAL's `loginPopup({ loginHint: email, prompt: 'select_account' })` (or `loginRedirect` if redirect flow preferred).
- Do not collect or store passwords in the SPA for production. If a password-collecting flow is required later, treat it as a separate non-recommended alternative and document security requirements.
- For E2E tests, continue to use the existing test-mode auth provider so tests don't depend on Azure AD.
