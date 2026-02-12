# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Requestor Filter Toggle** (Feature: 1-requestor-filter) - Added toggle control above meeting requests list that allows users to filter between "My Requests" (default) and "All Requests"
  - Frontend: Fluent UI Pivot component with two modes
  - Backend: `requestorEmail` query parameter support in `/api/meetingrequests` endpoint
  - Database: Added `RequestorEmail` column to `MeetingRequests` table (nullable string)
  - Tests: Backend integration tests (xUnit, 4 test cases) + E2E tests (Playwright, 6 test cases)
  - Accessibility: ARIA labels, keyboard navigation support
  - Default behavior: Shows only logged-in user's requests on page load
  - Benefits: Users can quickly view their own submissions vs all team submissions without manual filtering
  - Functional requirements covered: FR-1 through FR-11 from spec.md

### Changed
- Meeting Requests List API endpoint now accepts optional `requestorEmail` parameter
- Meeting Requests List component now includes filter state management with automatic pagination reset

### Technical Details
- Backend: C# .NET8.0, Entity Framework Core migration `20260212143745_AddRequestorEmail`
- Frontend: React 18.2.0, @fluentui/react-components 9.72.11
- Database: SQLite with new nullable `RequestorEmail` TEXT column
- Integration: Filter respects infinite scroll, search, and status filters

## [0.1.0] - 2026-02-12

### Initial Release
- Meeting Requests CRUD operations
- MSAL authentication integration
- Infinite scroll pagination
- Status filtering
- Search functionality
