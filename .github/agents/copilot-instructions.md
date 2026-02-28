# arath Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-10

## Active Technologies
- N/A (UI shell only) (001-app-shell)
- Frontend: JavaScript/React 18.2.0, Backend: C#/.NET 8.0 + Frontend: React, Vite 5.0, React Router 6.11.2, Tailwind CSS 3.4.8; Backend: ASP.NET Core, Entity Framework Core 8.0, SQLite (003-global-search)
- SQLite database for meeting requests data (003-global-search)
- JavaScript (ES6+), React 18.2.0 + @azure/msal-browser 4.28.1, @azure/msal-react 3.0.25, react-router-dom 6.11.2 (001-logout-redirect)
- localStorage (MSAL token cache), no backend storage changes required (001-logout-redirect)
- JavaScript (ES6+), React 18.2.0 + react-router-dom 6.11.2, @azure/msal-react 3.0.25, Vite 5.0, Tailwind CSS 3.4.8 (004-nav-below-header)
- None (UI layout change only, no data persistence) (004-nav-below-header)

- JavaScript/TypeScript (ES2022+) — React 18.x, Vite build (matched to repo) + React, Vite, Tailwind CSS, @headlessui/react (optional), clsx (001-app-shell)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

JavaScript/TypeScript (ES2022+) — React 18.x, Vite build (matched to repo): Follow standard conventions

## Recent Changes
- 004-nav-below-header: Added JavaScript (ES6+), React 18.2.0 + react-router-dom 6.11.2, @azure/msal-react 3.0.25, Vite 5.0, Tailwind CSS 3.4.8
- 001-logout-redirect: Added JavaScript (ES6+), React 18.2.0 + @azure/msal-browser 4.28.1, @azure/msal-react 3.0.25, react-router-dom 6.11.2
- 003-global-search: Added Frontend: JavaScript/React 18.2.0, Backend: C#/.NET 8.0 + Frontend: React, Vite 5.0, React Router 6.11.2, Tailwind CSS 3.4.8; Backend: ASP.NET Core, Entity Framework Core 8.0, SQLite


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
