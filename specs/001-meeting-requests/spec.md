# Feature Specification: Board Meeting Request & Voting System

**Feature Branch**: `001-meeting-requests`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "Board meeting request approval, document management, and voting system"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Raise & Approve Meeting Requests (Priority: P1)

Regular users can submit requests to schedule board meetings with proposed dates, times, and locations. SEC admins review these requests and can approve (scheduling the meeting) or reject them (with optional feedback). This is the core workflow that enables all other board meeting functionality.

**Why this priority**: This is the MVP-critical foundation. Without the ability to request and approve meetings, no other board meeting functions (documents, voting) can occur. Organizations cannot operate without meeting scheduling.

**Independent Test**: Can be fully tested by: (1) user submitting a meeting request with date/time, (2) SEC admin receiving notification, (3) SEC admin approving or rejecting, (4) user receiving confirmation. Delivers complete meeting approval workflow as standalone capability.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they navigate to "Request Meeting", **Then** they see a form to enter meeting date, time, location, and optional agenda
2. **Given** a user has submitted a meeting request, **When** a SEC admin views pending requests, **Then** the request appears in a list with status "Pending"
3. **Given** a SEC admin reviews a meeting request, **When** they click "Approve", **Then** the meeting is created as scheduled, calendar entries are generated, and the requesting user receives confirmation
4. **Given** a SEC admin reviews a meeting request, **When** they click "Reject" with a reason, **Then** the request is marked rejected and the user receives notification with the reason
5. **Given** a meeting is approved, **When** a user views their dashboard, **Then** the approved meeting appears on their calendar with all details

---

### User Story 2 - Document & Statement Management (Priority: P2)

After a meeting is scheduled (approved), users can upload documents and statements related to that meeting (e.g., agendas, financial statements, procedural documents). Users can view, organize, and manage these documents. SEC admins can monitor document uploads and control visibility based on document type or participant access level.

**Why this priority**: P2 because it supports the meeting once scheduled, but the system can still function at P1 level without it. Document management is a key operational feature that is frequently used but not blocking.

**Independent Test**: Can be fully tested by: (1) user uploading a document to an approved meeting, (2) user viewing/downloading documents, (3) user editing document metadata, (4) SEC admin controlling access visibility. Delivers complete document lifecycle for a meeting.

**Acceptance Scenarios**:

1. **Given** a meeting is approved, **When** a user navigates to that meeting, **Then** they see an "Upload Documents" option
2. **Given** a user clicks "Upload Documents", **When** they select file(s) and confirm, **Then** the documents are attached to the meeting and listed with upload timestamp and uploader name
3. **Given** documents are attached to a meeting, **When** a user views the meeting details, **Then** they can download any document they have access to or view a preview if available
4. **Given** a user is viewing a meeting's documents, **When** they click on a document, **Then** they can see metadata (name, size, uploader, upload date) and edit the description/tags
5. **Given** documents are uploaded, **When** a SEC admin reviews the meeting, **Then** they can see all documents, configure visibility restrictions (which participants can see which docs), and flag non-compliant documents

---

### User Story 3 - Create & Share Votes (Priority: P2)

SEC admins can create votes (binary Yes/No format) related to a scheduled meeting. These votes are configured with title, description, and deadline. SEC admins designate which members participate in the vote and publish the vote to them.

**Why this priority**: P2 because voting is a core decision-making function but can be phased in after basic meeting scheduling and document management. Voting is used for specific meeting-related decisions.

**Independent Test**: Can be fully tested by: (1) SEC admin creating a binary vote with deadline, (2) SEC admin defining participant list, (3) vote appearing as available to designated members, (4) vote showing as "Voting Open" during active period. Independently delivers voting creation and setup.

**Acceptance Scenarios**:

1. **Given** a meeting is approved, **When** a SEC admin navigates to that meeting, **Then** they see a "Create Vote" option
2. **Given** a SEC admin clicks "Create Vote", **When** they enter a vote title, description, deadline, and approve/reject options, **Then** the vote is created in "Draft" status
3. **Given** a vote is in "Draft" status, **When** a SEC admin selects participants and clicks "Publish Vote", **Then** the vote status becomes "Voting Open" and notifications are sent to designated members via email
4. **Given** a vote is published, **When** voting period is active and before deadline, **Then** vote appears in members' "Active Votes" section with remaining time and Yes/No options
5. **Given** a voting deadline passes, **When** the system detects deadline, **Then** the vote automatically closes and results (count of yes/no votes) are calculated and displayed

---

### User Story 4 - Cast Votes (Priority: P3)

Internal users and external members who have been designated as voters can view open votes for meetings and cast their votes before the deadline. External members authenticate via email magic links. Members can see their vote status for each vote. After the deadline, all members can view the vote results.

**Why this priority**: P3 because this is the participant-facing feature that depends on P2 (votes must exist first). Core system functions with P1+P2. This adds the participation layer.

**Independent Test**: Can be fully tested by: (1) external member receiving vote notification and clicking magic link, (2) member viewing available vote with Yes/No options, (3) member selecting and submitting vote, (4) member confirmation of submission, (5) member viewing results after deadline. Independently delivers full voting participation experience.

**Acceptance Scenarios**:

1. **Given** an external member has been designated as a voter for a meeting, **When** a vote is published, **Then** they receive an email notification with vote title, deadline, and a magic link to cast vote
2. **Given** an external member clicks the magic link, **When** they are authenticated, **Then** they see the vote details with Yes/No options clearly displayed
3. **Given** a member selects "Yes" or "No" and clicks "Submit Vote", **When** the submission is confirmed, **Then** they receive confirmation with timestamp and cannot change their vote
4. **Given** a member votes successfully, **When** they view the vote again before deadline, **Then** they see "Your vote: [Yes/No]" and cannot re-vote
5. **Given** voting deadline has passed, **When** any member views the vote, **Then** they see final results (total Yes count, total No count, percentage breakdown) and voting locked status

---

### Edge Cases

- **Meeting date conflicts**: When a SEC admin approves a meeting with a date that conflicts with another scheduled meeting, system shows warning but allows approval (per clarification)
- **Missed voting deadlines**: What reminders should be sent to members who haven't voted, and at what intervals before deadline?
- **Cancelled/rescheduled meetings**: When a meeting is cancelled or date changed after documents uploaded and votes created, should documents be archived and votes nullified?
- **External members removing themselves**: If a designated voter removes themselves from the member list, should their vote (if already cast) remain counted, or be discarded?
- **Concurrent document uploads**: What happens if multiple users upload documents simultaneously to the same meeting?
- **Vote modification after publish**: If SEC admin needs to extend vote deadline after voting has started, are existing votes preserved?

## Clarifications

### Session 2026-02-07

- Q: How should votes be structured - binary Yes/No only, or custom options? → A: Binary (Yes/No only)
- Q: How should system handle meeting date/time conflicts? → A: Allow conflicts with warning
- Q: How should external members authenticate to cast votes? → A: Email magic link (passwordless)
- Q: Should all documents be visible to all members or can SEC admin restrict visibility? → A: SEC admin can restrict document visibility

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST allow regular users to submit meeting requests with date, time, location, and optional agenda/description
- **FR-002**: System MUST notify SEC admins when a new meeting request is submitted and provide a dashboard showing all pending requests with request details
- **FR-003**: SEC admins MUST be able to approve meeting requests, which creates the meeting as scheduled
- **FR-004**: SEC admins MUST be able to reject meeting requests with optional reason/feedback communicated to the requesting user
- **FR-005**: System MUST send notifications to the requesting user when their request is approved or rejected
- **FR-006**: System MUST display approved meetings on user dashboards/calendars with full details (date, time, location, agenda)
- **FR-007**: When a SEC admin approves a meeting with a conflicting date/time, system MUST display a warning but allow approval (CLARIFICATION: Conflict handling - allow with warning)
- **FR-008**: Users MUST be able to upload documents/statements to approved meetings (pdf, doc, excel, image formats)
- **FR-009**: System MUST associate uploaded documents with the meeting and track uploader identity and upload timestamp
- **FR-010**: Users MUST be able to download, view, and manage (rename, add descriptions) documents attached to a meeting
- **FR-011**: SEC admins MUST be able to configure which participants can see which documents in a meeting (CLARIFICATION: SEC admin can restrict document visibility)
- **FR-012**: SEC admins MUST be able to create binary Yes/No votes for approved meetings with title, description, and deadline (CLARIFICATION: Votes are binary Yes/No format only)
- **FR-013**: System MUST persist vote configuration and automatically close votes at the configured deadline
- **FR-014**: Created votes MUST be shareable with designated meeting participants (both internal users and external members)
- **FR-015**: System MUST send email notifications to designated voters when a vote is published with deadline and voting instructions
- **FR-016**: Internal users MUST be able to authenticate directly and view assigned active votes before deadline
- **FR-017**: External members MUST be able to authenticate via email magic links to cast votes without creating dedicated credentials (CLARIFICATION: External auth - email magic link)
- **FR-018**: Voters MUST be able to view active votes with clear Yes/No options and remaining time before deadline
- **FR-019**: Voters MUST be able to submit Yes/No votes and receive confirmation; votes cannot be changed after submission
- **FR-020**: System MUST track vote submission timestamp and voter identity for audit purposes
- **FR-021**: System MUST calculate and display vote results (count and percentage for Yes/No) after voting period closes
- **FR-022**: System MUST prevent voting after deadline has passed and display "Voting Closed" status with final results
- **FR-023**: All users MUST be able to identify their role in the interface (regular user vs SEC admin vs external member/voter)

### Key Entities

- **Meeting**: Represents a scheduled board meeting with date, time, location, agenda, status (approved/cancelled), created by user reference, approval timestamp, optional meeting notes
- **Meeting Request**: Initial submission by user requesting a meeting, contains proposed date/time/location/agenda, status (pending/approved/rejected), rejection reason if applicable, submission timestamp
- **Document**: File attached to a meeting (pdf, doc, excel, image), has filename, file type, size, upload timestamp, uploader identity, optional description/tags/categories, visibility controller (which participants can access), compliance flags
- **Vote**: A voting item for a meeting with title, description, deadline, status (draft/voting open/closed), participant list, and results (count of yes/no votes), automatically closes at deadline
- **Vote Submission**: Individual vote cast by a member, contains voter identity, selected option (Yes or No only), submission timestamp, meeting/vote references

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: SEC admins can approve or reject a meeting request within 5 minutes of submission (from receiving notification to decision completion)
- **SC-002**: Users can successfully upload documents to a meeting in under 2 minutes (selecting file through confirmation)
- **SC-003**: External voters can authenticate via email magic link, view, understand, and submit votes within 3 minutes of receiving notification
- **SC-004**: System maintains 99.5% uptime for meeting approval, document management, and voting functions during business hours
- **SC-005**: Vote results are calculated and displayed within 5 seconds of deadline passing
- **SC-006**: System supports minimum 1000 concurrent users accessing meetings, documents, and votes simultaneously
- **SC-007**: 95% of users successfully complete a full meeting request → approve → document upload → vote creation → voting cycle on first attempt without support
- **SC-008**: Audit trail is complete - 100% of governance actions (requests, approvals, rejections, uploads, visibility changes, votes, submissions) are logged with timestamp and user identity
- **SC-009**: External members report 80% satisfaction with voting interface clarity and deadline communication
- **SC-010**: Email notifications for votes and approvals are delivered within 5 minutes of event occurrence
