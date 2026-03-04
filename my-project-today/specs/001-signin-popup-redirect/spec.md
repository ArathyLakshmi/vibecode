# Feature: Signin popup redirects to Microsoft authorize endpoint

**Short name:** signin-popup-redirect

## Summary
On clicking the "Sign in (popup)" control, the SPA must open the Microsoft Azure AD authorize endpoint in a popup or new window with the correct OAuth2 query parameters so the user is shown the Microsoft sign-in page and can complete authentication. After successful sign-in the SPA returns to the configured `redirect_uri` (`/login`) and resumes the original route flow.

## Background
The app uses MSAL for Azure AD sign-in. In production the `loginPopup` flow should open a Microsoft login page (authorize endpoint) with parameters including `client_id`, `scope`, `redirect_uri`, `response_type=code`, `prompt=select_account` and any `loginHint` when provided. End-to-end tests and manual verification require deterministic redirection to the Microsoft URL.

## Actors
- Primary actor: End user (clicks "Sign in (popup)")
- System: SPA (client) performing MSAL `loginPopup` call
- External: Microsoft Identity Platform (authorize endpoint)

## Actions
- User clicks `Sign in (popup)`.
- SPA constructs an OAuth2 authorization request (MSAL request) including optional `loginHint` and `prompt: 'select_account'`.
- SPA opens the Microsoft authorize URL in a popup/new window.
- User completes sign-in on Microsoft page; Microsoft redirects back to SPA `redirect_uri` with authorization `code` (or fragment depending on response_mode).
- SPA consumes the redirect and completes authentication, returning the user to the originating route.

## Data
- Request parameters (observable in Network / popup URL): `client_id`, `scope`, `redirect_uri`, `response_type`, `prompt`, `loginHint` (optional), `state`, `nonce`, PKCE fields as applicable.

## Constraints
- Do not collect user passwords in the SPA; rely on Microsoft sign-in UI.
- Popup must target the same `redirect_uri` configured for the MSAL app registration (e.g., `http://localhost:5001/login`).
- Must support `prompt=select_account` and include `loginHint` when the user entered an email.

## User Scenarios & Testing
- Primary scenario (manual):
  1. Open app at `http://localhost:5001` and navigate to `/login`.
  2. Enter an email (optional) in the login form and click `Sign in (popup)`.
  3. A new popup (or browser tab) opens and navigates to a URL starting with:
     `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` and contains query parameters including `client_id`, `scope`, `redirect_uri=http%3A%2F%2Flocalhost%3A5001%2Flogin`, `response_type=code`, and `prompt=select_account`.
  4. User signs in on Microsoft page; Microsoft redirects back to `http://localhost:5001/login` (with code/fragment).
  5. SPA completes sign-in and the popup closes (or the main window processes the redirect), returning user to the original route.

- Automated E2E test (Playwright):
  - Arrange: Serve production bundle (non-test-mode) on `http://localhost:5001`.
  - Act: Click the `Sign in (popup)` button.
  - Assert:
    - A new page/window is opened with URL that matches the authorize URL pattern and contains `prompt=select_account` and the configured `client_id` and `redirect_uri`.
    - The popup navigation to the Microsoft endpoint occurs within 5 seconds.

## Functional Requirements (testable)
- FR-1: On `Sign in (popup)` click, the client must call MSAL `loginPopup` with a request whose effective authorize URL opens in a popup.
  - Acceptance test: Playwright/intercept verifies a new window opened with URL matching the authorize endpoint and containing expected params.

- FR-2: The authorize URL must include `prompt=select_account`.
  - Acceptance test: The opened URL contains `prompt=select_account`.

- FR-3: If a user email is provided, the authorize URL must include a `login_hint` query parameter (or MSAL `loginHint` value resulting in the same behavior).
  - Acceptance test: When email is entered in the form, the popup URL contains that email in `login_hint` (URL-encoded) or MSAL request shows `loginHint` in its request object.

- FR-4: The popup must navigate to the configured `redirect_uri` on successful sign-in.
  - Acceptance test: After sign-in simulation, verify navigation to `http://localhost:5001/login` with auth code/fragment.

- FR-5: The SPA must not log or store user password values.
  - Acceptance test: Code inspection and runtime checks show no password collection or storage.

## Success Criteria
- SC-1: 100% of manual test runs where a user clicks `Sign in (popup)` see a popup navigate to the Microsoft authorize endpoint within 5 seconds.
- SC-2: The popup URL includes `prompt=select_account` and `redirect_uri=http://localhost:5001/login` and `client_id` matching the app registration.
- SC-3: When an email is provided, `login_hint` is present in the popup URL.
- SC-4: After sign-in completes, the SPA resumes the original route and user is authenticated (end-to-end flow verified in an integration test run).

## Key Entities
- `MSALRequest` (login request object): properties `loginHint`, `prompt`, `scopes`, `redirectUri`.
- `AuthorizeURL`: the Microsoft endpoint URL shown to the user.
- `PopupWindow`: browser popup or new tab opened by `loginPopup`.

## Assumptions
- The app uses MSAL.js in the browser for OAuth2/OIDC flows.
- `redirect_uri` is `http://localhost:5001/login` in local development and is registered in Azure AD.
- The MSAL `loginPopup` flow is supported by the chosen browser/environment used in development and CI (Playwright).
- Network access to `login.microsoftonline.com` is available in the test environment when running production-mode tests.

## Risks & Mitigations
- If the browser blocks popups, instruct tests to allow popups or use a Playwright pattern that captures `page.on('popup', ...)`.
- If an MSAL account is already present in localStorage, the SPA may consider the user authenticated immediately; tests should clear `msal.*` keys before running.

## Acceptance Checklist (summary)
- [ ] FR-1: Popup opens and navigates to Microsoft authorize URL
- [ ] FR-2: `prompt=select_account` present
- [ ] FR-3: `login_hint` present when email provided
- [ ] FR-4: Redirect to configured `redirect_uri` after sign-in
- [ ] FR-5: No password collection in SPA


---

Created: 2026-02-10

