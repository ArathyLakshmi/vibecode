# PR: 001-auth-msal-azuread — Add SPA sign-in/out with Azure AD

Summary

This PR wires Azure AD sign-in/sign-out into the SPA using MSAL, ensures the SPA attaches access tokens to API requests when signed-in, and preserves unauthenticated submit behavior as a fallback.

Changes

- Client: `src/client/src/auth/msalConfig.js`, `src/client/src/main.jsx`, `src/client/src/App.jsx`, `src/client/src/components/MeetingRequestForm.jsx` — MSAL wiring and token attach.
- Docs: `src/client/.env.example`, `docs/msal-azure-ad.md`, `.specify/phase1/quickstart.md` — setup instructions.
- Server: `src/server/appsettings.Development.json` (sample) and optional runtime config.

Testing checklist (manual)

- [ ] Follow `.specify/phase1/quickstart.md` to register apps and set local envs.
- [ ] From `src/client`: `npm install` and `npm run build` (confirm `dist/` generated).
- [ ] Deploy build to `src/server/wwwroot` and run `dotnet run --urls "http://localhost:5001"`.
- [ ] Open `http://localhost:5001`, click Login, and complete Azure AD sign-in.
- [ ] Verify the UI shows the signed-in user's display name.
- [ ] Create a meeting request and confirm the POST includes `Authorization: Bearer <token>` in DevTools Network tab.
- [ ] Confirm `GET /api/meetingrequests/whoami` returns name when signed-in and `null` when signed-out.
- [ ] Confirm unauthenticated submit still works (login not required).

Notes for reviewers

- Secrets must not be committed. Ensure `.env` is used locally and not checked in.
- If `npm install` fails due to registry issues, see `docs/msal-azure-ad.md` troubleshooting.
