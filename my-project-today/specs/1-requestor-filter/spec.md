**Feature**: Requestor Filter Toggle

**Short name**: requestor-filter

**Summary**
- A toggle control in the meeting requests list that allows users to filter between viewing only their own requests (default) and viewing all requests in the system. The filter persists during the session and provides clear visual feedback about the current filter state.

**Actors**
- Authenticated requestor (user who has created meeting requests)
- Authenticated user (any logged-in user)
- Administrator (user with elevated permissions)

**Goals**
- Allow requestors to focus on their own meeting requests by default without distraction from other users' requests
- Provide easy access to view all requests when needed for collaboration or oversight
- Reduce cognitive load by filtering irrelevant information
- Maintain context when switching between filtered and unfiltered views

**Scope & Constraints**
- Filter applies only to the main meeting requests list view
- Filter state is session-based (resets on page refresh to "My Requests" default)
- Must work seamlessly with existing search functionality
- Must work with infinite scroll pagination
- Filter does not affect the detail drawer view (detail view shows any request when directly accessed)
- Must use Fluent UI components for consistent design

**User Scenarios & Testing**

1) Default view shows only user's requests
   - Given an authenticated user who has created meeting requests, when they navigate to the meeting requests list page, then only their own requests are displayed by default.
   - Acceptance: The list shows only requests where requestorName/requestorEmail matches the current user's identity; toggle button shows "My Requests" as active state.

2) Toggle to view all requests
   - Given a user viewing their own requests (default), when they click the toggle button to "All Requests", then the list refreshes to show all meeting requests from all users in the system.
   - Acceptance: The list displays requests from all requestors; toggle button shows "All Requests" as active state; count updates to reflect total requests.

3) Toggle back to my requests
   - Given a user viewing all requests, when they click the toggle button to "My Requests", then the list filters back to show only their own requests.
   - Acceptance: The list shows only the user's requests again; toggle button returns to "My Requests" active state; count updates to show only user's request count.

4) Filter persists with search
   - Given a user has toggled to "All Requests", when they perform a search using the existing search bar, then search results are filtered within the "All Requests" dataset.
   - Acceptance: Search operates on the currently selected filter scope (my requests or all requests); toggle state remains unchanged during search.

5) Filter works with infinite scroll
   - Given a user has many requests in either filter mode, when they scroll down to trigger infinite scroll loading, then additional pages load respecting the current filter selection.
   - Acceptance: Infinite scroll pagination fetches only "My Requests" data when in default mode, or all requests when in "All Requests" mode.

6) Empty state handling
   - Given a user who has not created any requests, when viewing in "My Requests" mode, then an appropriate empty state message is displayed (e.g., "You haven't created any meeting requests yet").
   - Acceptance: Empty state message is contextual to the filter mode; when toggling to "All Requests", if other users have requests, those are displayed.

7) Visual feedback on filter state
   - Given the toggle button, when in either state, then the active filter option is visually distinct (highlighted, different color, or selected appearance).
   - Acceptance: Toggle uses Fluent UI styling with clear active/inactive states; users can immediately identify which filter is active.

**Functional Requirements (testable)**

FR-1 Toggle control: The meeting requests list must display a toggle button/control above the list with two options: "My Requests" and "All Requests".

FR-2 Default filter: On initial page load, the filter must default to "My Requests", showing only meeting requests where the requestor matches the current authenticated user.

FR-3 User matching: The system must match the current user's identity (email or username from authentication token) against the requestorName or requestorEmail field in meeting requests.

FR-4 Toggle action: Clicking the toggle must immediately refresh the list to show the selected filter scope (my requests or all requests) starting from page 1.

FR-5 Pagination integration: The filter must pass the appropriate query parameter to the backend API (e.g., `?requestor=current` or omit for all requests) and work with existing pagination parameters.

FR-6 Count display: The "Showing X of Y" count must reflect the filtered dataset (X items shown, Y total items matching the current filter).

FR-7 Search integration: The existing search functionality must operate within the currently selected filter scope (search my requests when in "My Requests" mode, search all when in "All Requests" mode).

FR-8 Session persistence: The filter state must persist during the user's session (navigating away and back maintains the selection) but reset to "My Requests" on full page refresh.

FR-9 Infinite scroll integration: When loading more items via infinite scroll, the system must continue applying the current filter to subsequent pages.

FR-10 Visual state: The toggle control must use Fluent UI components and clearly indicate which option is currently active through visual styling (color, background, border, or icon).

FR-11 Accessibility: The toggle control must be keyboard accessible (Tab to focus, Space/Enter to toggle) and include appropriate ARIA labels for screen readers.

**Success Criteria (measurable)**

- Users can identify the current filter state within 1 second of viewing the list (via clear visual indicators)
- Toggle response time is under 500ms to refresh the list with new filter
- 100% of keyboard users can operate the toggle using standard keyboard navigation
- Filter correctly reduces list size by showing only user's requests in "My Requests" mode
- No accessibility violations (WCAG AA) on the toggle control
- Filter state persists correctly during session navigation (95% of navigation cycles)
- Search and pagination work correctly 100% of the time with either filter active

**Key Entities**
- Filter state: { mode: "my-requests" | "all-requests", userEmail: string }
- Meeting request: { id, requestorName, requestorEmail, ... } (existing entity)

**Assumptions**
- The backend API supports filtering by requestor (or can be extended to support this)
- User identity (email/username) is reliably available from the authentication context
- The requestorName or requestorEmail field in meeting requests accurately reflects the original creator
- Session management exists for maintaining filter state during navigation
- Existing empty state messaging can be extended to be filter-aware

**Dependencies**
- Backend API must support filtering by requestor (new query parameter: `?requestor=email@example.com` or `?myRequests=true`)
- Authentication context provides reliable user identity
- Existing infinite scroll and search functionality
- Fluent UI React Components library

**Out of Scope**
- Filtering by other criteria (status, date range, etc.) - this is a separate feature
- Saving filter preferences across sessions (persistence beyond browser session)
- Team-based filtering (showing requests from a specific team)
- Advanced filter combinations (my requests AND specific status)
- Filter analytics or usage tracking

**Acceptance / Test cases**
- Unit test: Filter toggle changes state correctly
- Integration test: API calls include correct requestor parameter based on filter state
- Integration test: Infinite scroll respects current filter when loading next page
- Integration test: Search operates within current filter scope
- E2E test: User loads page → sees only their requests by default
- E2E test: User clicks "All Requests" → sees all requests from all users
- E2E test: User toggles back to "My Requests" → sees only their requests again
- E2E test: User searches while in "All Requests" mode → results include all matching requests
- E2E test: User with zero requests sees contextual empty state
- Accessibility test: Screen reader announces toggle state correctly
- Accessibility test: Keyboard navigation can operate toggle

**Notes**
- Consider using Fluent UI's `ToggleButton` or `Pivot` component for the toggle control
- The backend API extension should be minimal - add optional query parameter support
- Consider adding a visual indicator (badge/count) showing how many requests in each mode
- Future enhancement: Remember user's last filter preference using local storage
- Consider keyboard shortcut (e.g., Ctrl+M for "My Requests", Ctrl+A for "All Requests") as future polish
