# research.md — App Shell (Phase 0)

Decision: Use React + Vite + Tailwind for the App Shell; tests with Jest + Testing Library and Playwright; accessibility scans with axe-core.

Rationale:
- The repository already uses React + Vite + Tailwind; continuing with the same stack minimizes integration work.
- Playwright provides cross-browser E2E automation and integrates with tracing for intermittent failures; use Playwright for E2E acceptance (desktop + mobile breakpoints).
- Jest + Testing Library are standard for component/unit tests and support DOM assertions for `header/nav/main/footer` structure.
- axe-core (or the Playwright `axe-playwright` approach) ensures automated accessibility checks as part of CI.

Alternatives considered:
- Storybook-only visual testing: useful but does not replace E2E assertions; use Storybook for snapshots and visual regression alongside Playwright snapshots.
- Cypress: strong E2E option, but Playwright is already used in this repository so we follow existing conventions.

Unknowns / Clarifications resolved:
- Test-First: we will add test skeletons before implementing components (component tests + E2E smoke test that asserts shell elements exist).
- Mobile behaviour: use a responsive hamburger + accessible disclosure (Headless UI or native ARIA) — choose simple controlled `button` + `nav` implementation with ARIA attributes.

Tasks produced by research:
- Create component test templates for `Header`, `TopNav`, `PageHeader`, `Footer` using Jest + Testing Library.
- Add Playwright E2E smoke test that verifies header, nav links, hamburger behavior, and footer at 3 breakpoints.
- Add an accessibility test harness using `axe-core` for the shell pages.
