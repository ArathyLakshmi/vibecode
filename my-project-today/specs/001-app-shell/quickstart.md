# quickstart.md — App Shell

To preview and iterate on the App Shell locally:

1. Install and run the frontend dev server (from repo root):

```powershell
Set-Location src/client
npm ci
npm run dev
```

2. Open `http://localhost:5173` (or the URL printed by Vite) and verify header/footer appear.

3. Run unit/component tests (Jest):

```powershell
Set-Location src/client
npm run test:unit
```

4. Run Playwright E2E (dev server must be running):

```powershell
Set-Location src/client
npx playwright test e2e/tests/shell.spec.ts
```

Notes:
- The quickstart assumes the repository uses `src/client` for the SPA. Adjust paths if your workspace differs.
