# Feature Specification: Navigation Below Header

**Feature Branch**: `004-nav-below-header`  
**Created**: February 10, 2026  
**Status**: Draft  
**Input**: User description: "show nav below global header"

## Clarifications

### Session 2026-02-10

- Q: The spec states the navigation row "MUST be visually distinct from header row (separate background or border)". Which approach should be used? → A: Different background color only (lighter or darker shade than header)
- Q: With navigation moving to a separate row, where should the mobile hamburger menu button be placed and where should the dropdown appear? → A: Keep hamburger in header, but dropdown appears below both header AND nav rows
- Q: What vertical spacing should exist between the header row and navigation row? → A: No gap between rows (they touch), background color provides separation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Navigation Bar (Priority: P1)

When users access the application, they see the primary navigation (Home, Dashboard, Meetings, Settings) displayed in its own horizontal row directly below the header, making navigation options more prominent and accessible.

**Why this priority**: This is the core layout change that improves navigation visibility and follows standard web application patterns. It's the entire feature scope.

**Independent Test**: Can be fully tested by loading any authenticated page and verifying navigation appears in a separate row below the header (containing logo, search, and user account).

**Acceptance Scenarios**:

1. **Given** a user is on any authenticated page, **When** they view the page, **Then** the primary navigation bar (Home, Dashboard, Meetings, Settings) appears in its own dedicated row below the header
2. **Given** a user views the header area, **When** they look at the layout, **Then** the top row contains logo, search bar, and user account, while the second row contains only navigation links
3. **Given** a user is on desktop, **When** they view the navigation, **Then** all navigation links are displayed horizontally in the dedicated nav row
4. **Given** a user is on mobile, **When** they view the navigation, **Then** the hamburger menu remains functional and opens the navigation menu
5. **Given** a user clicks any navigation link, **When** the click occurs, **Then** navigation works exactly as before (no functional changes)

---

### Edge Cases

- What happens when screen is resized from desktop to mobile? Navigation should smoothly transition from horizontal bar to hamburger menu
- What happens on tablets (medium screens)? Navigation should use appropriate breakpoint behavior
- What happens when user is not authenticated? Navigation should not appear (follows existing auth pattern)
- What happens with keyboard navigation? Tab order should remain logical (header elements, then nav elements, then page content)
- What happens when there are more navigation items in the future? The dedicated row provides more horizontal space for additional items

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display navigation links (Home, Dashboard, Meetings, Settings) in a separate horizontal row below the main header
- **FR-002**: System MUST maintain existing navigation functionality (clicking links navigates to correct routes)
- **FR-003**: System MUST show navigation only for authenticated users (follows existing auth pattern)
- **FR-004**: System MUST maintain mobile responsiveness with hamburger menu for small screens; hamburger button remains in header row and dropdown menu appears below both header and navigation rows
- **FR-005**: System MUST maintain desktop layout with horizontal navigation links for large screens
- **FR-006**: Header row MUST contain logo/brand, search bar (when authenticated), and user account display
- **FR-007**: Navigation row MUST be visually distinct from header row using a different background color (lighter or darker shade than the header background); rows touch with no gap between them (background color provides visual separation)
- **FR-008**: System MUST maintain accessibility features (ARIA labels, keyboard navigation, focus states)
- **FR-009**: System MUST preserve existing z-index layering for dropdowns and overlays

### Key Entities

No data entities involved - this is a UI layout change only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Navigation appears in a separate row below header on 100% of authenticated pages
- **SC-002**: All 4 navigation links (Home, Dashboard, Meetings, Settings) remain accessible and functional at all screen sizes
- **SC-003**: Page load time remains under 1 second (no performance degradation from layout change)
- **SC-004**: Mobile hamburger menu continues to work on screens under 768px width
- **SC-005**: Visual hierarchy is clear: users can distinguish header row from navigation row at a glance
- **SC-006**: Zero breaking changes - all existing functionality (search, logout, account display) works unchanged

## Assumptions

- Navigation links remain the same (Home, Dashboard, Meetings, Settings) - no new links added
- Existing color scheme and styling patterns will be reused for the navigation bar
- Desktop breakpoint is 768px (md: breakpoint in Tailwind) - consistent with existing TopNav component
- Navigation bar spans full width of container (matches header width)
- Existing authentication patterns remain unchanged (nav only shows when authenticated)

## Dependencies

- Existing AppShell component structure (Header + main + Footer)
- Existing TopNav component (will be moved, not rewritten)
- Existing Header component (will be modified to remove TopNav)
- Tailwind CSS for styling (existing dependency)
- Authentication state from useMsal hook (existing dependency)

## Out of Scope

- Adding new navigation items
- Changing navigation link labels, URLs, or behavior
- Redesigning header component styling
- Modifying search functionality
- Changing authentication flow
- Adding sub-navigation or dropdown menus
- Implementing sticky/fixed navigation on scroll
- Backend changes (purely frontend UI layout)

## Constraints

- Must maintain existing responsive breakpoints (mobile: <768px, desktop: ≥768px)
- Must not break any E2E tests for authentication or navigation
- Must preserve accessibility compliance (WCAG 2.1 Level AA)
- Must use existing Tailwind utility classes (no custom CSS)
- Change must be completable in single component modification session (<30 minutes)

## Risks & Mitigation

**Risk**: Layout shift causes visual jarring on page load  
**Mitigation**: Structure HTML so navigation is a sibling of header, not nested, to minimize layout shift

**Risk**: Mobile menu positioning breaks with new layout  
**Mitigation**: Test mobile hamburger menu thoroughly after change, adjust absolute positioning if needed

**Risk**: E2E tests break if they depend on specific DOM structure  
**Mitigation**: Review existing E2E tests for header/nav selectors before implementation

**Risk**: Increased vertical space consumption on mobile  
**Mitigation**: Verify mobile viewport usage, ensure navigation bar doesn't consume excessive space
