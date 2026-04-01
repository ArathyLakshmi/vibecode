**Feature**: App Shell

**Short name**: app-shell

**Summary**
- A responsive, accessible application shell for the Single Page Application that provides a global header, global footer, top navigation, page header, and main content regions. Provides a modern, mobile-first layout and consistent navigation container for all pages.

**Actors**
- Anonymous visitor
- Authenticated user

**Goals**
- Allow users to navigate the application consistently across screens and view page-level content with a clear structure.

**Scope & Constraints**
- Must be responsive (mobile/tablet/desktop).
- Use Tailwind-based utility classes for styling and a modern look and feel (design tokens via Tailwind config).
- Must be accessible (semantic HTML, keyboard navigable, ARIA where required, contrast ratios met).

**User Scenarios & Testing**

1) Primary navigation (desktop)
   - Given a desktop viewport (>= 1024px), when a user loads any route, then the global header is visible with logo at left, top navigation links horizontally centered or right-aligned, and account/status controls on the right.
   - Acceptance: automated visual / DOM test asserts header element exists, logo link present, and nav contains links: Home, Dashboard, Meetings, Settings.

2) Primary navigation (mobile)
   - Given a mobile viewport (<= 640px), when a user loads the app, then the top navigation collapses into a hamburger menu; tapping the hamburger opens a slideover or dropdown with the same navigation links.
   - Acceptance: E2E asserts hamburger button presence at mobile width, when clicked the nav links are visible and focusable.

3) Page header + content
   - Given any route, the page header area displays a descriptive title, optional subtitle, and optional breadcrumb. Main content renders below the page header.
   - Acceptance: DOM test checks `header[role="banner"]` and `main` structure; page header contains `h1` with expected text when route provides it.

4) Global footer
   - Footer present on all routes; contains legal links, version string, and contact link.
   - Acceptance: DOM test verifies presence of footer element and links.

5) Accessibility
   - Keyboard and screen reader users can navigate header and menu; interactive elements have accessible names and ARIA attributes as needed.
   - Acceptance: Run automated axe-core checks (or manual audit) to ensure no critical accessibility violations; ensure interactive controls are keyboard operable.

**Functional Requirements (testable)**

FR-1 Header: The app shell must include a global header containing:
- logo (clickable, navigates to home)
- primary navigation with links: Home, Dashboard, Meetings, Settings
- user/account control area on right (placeholder if user not signed in)

FR-2 Responsive navigation: The primary navigation must collapse into a hamburger on small viewports (<= 640px) and reveal links when toggled.

FR-3 Page header: Each page must expose a page header area with an `h1` title, optional subtitle, and optional breadcrumb region.

FR-4 Main content regions: The main area must provide a top-level `main` landmark and support content sections with optional two-column layout that collapses to single column on mobile.

FR-5 Footer: The shell must include a global footer with copyright text, legal links (Privacy, Terms), and an app version placeholder.

FR-6 Accessible semantics: Use semantic elements (`header`, `nav`, `main`, `footer`, `button`) and ensure keyboard focus order, visible focus styles, and ARIA attributes for the hamburger toggle and any dynamic menus.

FR-7 The shell must load within 1.5 seconds on a typical dev machine (measured on cold load) and not block rendering of main content unnecessarily.

FR-8 Design system: Use Tailwind utility classes and responsive breakpoints to implement layout and spacing; avoid inline styles where possible.

**Success Criteria (measurable)**

- 100% of primary navigation links are reachable within 3 keyboard tab presses from page load on desktop.
- 95% of critical pages render visible main content within 1.5s on a cold local load.
- No critical accessibility violations reported by automated scanner (axe-core) on the app shell pages.
- Navigation collapse behavior works at common breakpoints: <=640px hamburger visible; >=1024px full nav visible.

**Key Entities**
- Navigation item: { id, label, href, roles }.
- Page header: { title, subtitle, breadcrumb[] }.

**Assumptions**
- Tailwind is available in the project and can be used for classes.
- The app will inject page-level metadata (page title) into the page header region.
- Authentication and account UI are out of scope for initial shell; provide a placeholder area for account controls.

**Dependencies**
- Project CSS build (Tailwind) must be configured and included in the SPA build.

**Out of Scope**
- Implementing the account menu dropdown or authentication flows.
- Page-specific content beyond the shell layout components.

**Acceptance / Test cases**
- Visual snapshot tests for header and footer at mobile, tablet, desktop widths.
- DOM assertions for presence of `header`, `nav`, `main`, `footer`, `h1` in page header.
- Accessibility scan (axe) must report zero critical violations.

**Notes**
- Provide a small set of CSS utility classes in Tailwind config for consistent spacing and colors.
