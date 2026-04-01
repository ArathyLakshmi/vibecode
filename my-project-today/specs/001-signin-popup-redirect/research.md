# Research: Signin popup redirect

Decision: Use MSAL `loginPopup` (msal-browser) and rely on browser popup to open the Microsoft authorize endpoint with required query parameters (`prompt=select_account`, `login_hint` when provided, PKCE, state/nonce`).

Rationale:
- `msal-browser` `loginPopup` is the supported client-side method to open the authorize endpoint in a popup while handling token response via MSAL.
- It constructs PKCE and OIDC fields automatically and ensures the redirect follows the configured `redirectUri`.
- Using MSAL avoids manual URL construction and leverages built-in security features.

Alternatives considered:
- Manually constructing the authorize URL and opening `window.open(...)`:
  - Pros: direct control of query params and immediate visibility of URL.
  - Cons: must reimplement PKCE, state/nonce handling, and token exchange; increases security risk.
- Using `loginRedirect` instead of popup:
  - Pros: simpler flow in some environments where popups are blocked.
  - Cons: redirect navigates away from the main window (less friendly in E2E that expects popup behavior).

Integration & Testing notes:
- Playwright: use `page.waitForEvent('popup')` to capture the popup `Page` object and then assert `popup.url()` matches the authorize endpoint pattern and contains `prompt=select_account` and `redirect_uri`.
- Clear MSAL cache before tests: delete `localStorage` keys that start with `msal.` to avoid stale account state causing immediate navigation.
- Popup blockers: tests must run with popup behavior allowed (Playwright supports capturing popups by listening for the `popup` event).
- In dev, if you see immediate navigation back to `/` without MSAL UI, check `msal.*` localStorage keys and `pca.getAllAccounts()` at bootstrap.

Browser behavior observations:
- Some browsers open popups in new tabs rather than separate windows; code should not assume window features.
- `loginHint` may be present as `login_hint` in the authorize URL; MSAL maps `loginHint` to that query param.

Security:
- Do not collect or log passwords in the SPA.
- Let MSAL manage PKCE, nonce, and state.

Created: 2026-02-10
