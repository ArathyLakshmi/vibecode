# Data model: Sign-in popup redirect

Entities:

- MSALRequest
  - Fields: `loginHint` (string, optional), `prompt` (string), `scopes` (array), `redirectUri` (string)
  - Validation: `redirectUri` must match one of the app registration's reply URLs.

- AuthorizeURL
  - Fields (derived): `client_id`, `scope`, `redirect_uri`, `response_type`, `prompt`, `state`, `nonce`, `code_challenge`, `code_challenge_method`

- PopupWindow
  - Fields: `url` (string), `openedAt` (timestamp), `closed` (bool)

State transitions:
- Idle -> PopupOpen when user clicks `Sign in (popup)` and `loginPopup` is called.
- PopupOpen -> AuthComplete when MSAL receives the redirect response and resolves the popup promise.
- AuthComplete -> Authenticated when tokens are acquired and MSAL account state is set.

