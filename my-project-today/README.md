# Unified Board Solutions (React + Tailwind) + ASP.NET Core

This repository contains a minimal single-page application scaffold for
Unified Board Solutions:

- `src/server` — ASP.NET Core backend (serves API and static files)
- `src/client` — React app (Vite) with Tailwind CSS

Quickstart (Windows):

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
