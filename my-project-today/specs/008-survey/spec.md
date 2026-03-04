# Feature Specification: Survey Component

**Feature Branch**: `008-survey`  
**Created**: February 18, 2026  
**Status**: Draft  
**Input**: User description: "create a survey component"

## Summary

A reusable survey component that allows administrators to create, publish, and collect responses for custom surveys with multiple question types. Users can submit anonymous or attributed responses, and administrators can view aggregated results in real-time. The component integrates seamlessly with the existing Unified Board Solutions interface using Fluent UI.

## Actors

- **Administrator**: Creates and publishes surveys, views results
- **Authenticated User**: Responds to published surveys
- **System**: Manages survey lifecycle, stores responses, calculates aggregations

## Goals

- Enable rapid feedback collection from board members and stakeholders
- Provide flexible question types (multiple choice, text, rating scales)
- Present results in clear, aggregated formats
- Integrate with existing authentication and UI patterns
- Support both anonymous and attributed responses

## Scope & Constraints

**In Scope:**
- Survey creation with multiple question types
- Response submission and storage
- Basic result aggregation and display
- Anonymous and attributed response options
- Integration with existing auth system

**Out of Scope:**
- Complex branching logic (conditional questions)
- Advanced analytics (cross-tabulation, filtering by demographics)
- Survey scheduling/expiration (v1 - manual publish/unpublish)
- Email notifications for new surveys
- Response editing after submission

**Constraints:**
- Must use Fluent UI components for consistency
- Must respect existing authentication patterns (MSAL)
- Survey responses stored in SQLite database (same as meeting requests)
- Maximum 20 questions per survey (performance limit)
- Maximum 500 responses per survey (v1 limit)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Publish Survey (Priority: P1)

Administrators can create a new survey with multiple questions and publish it for users to respond.

**Why this priority**: Core functionality - without survey creation, the feature has no value

**Independent Test**: Admin can create a survey with 3 questions (text, multiple choice, rating), publish it, and see it appear in the active surveys list

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they click "Create Survey" and enter a title, description, and 3 questions, **Then** the survey is saved as a draft
2. **Given** a draft survey with valid questions, **When** the administrator clicks "Publish", **Then** the survey becomes active and visible to all users
3. **Given** a published survey, **When** the administrator views the surveys list, **Then** they see the survey marked as "Active" with a response count

---

### User Story 2 - Submit Survey Response (Priority: P1)

Authenticated users can view active surveys, answer questions, and submit responses.

**Why this priority**: Core functionality - users must be able to respond for the feature to deliver value

**Independent Test**: User navigates to surveys page, selects an active survey, answers all questions, submits response successfully, and sees confirmation message

**Acceptance Scenarios**:

1. **Given** an active survey with 5 questions, **When** a user opens the survey, **Then** all questions are displayed with appropriate input controls
2. **Given** a user answering survey questions, **When** they submit with all required fields completed, **Then** their response is saved and a success message is shown
3. **Given** a user who has already responded to a survey, **When** they view the survey again, **Then** they see a message "You have already responded to this survey" and cannot submit again
4. **Given** a user submitting a survey, **When** they choose "Submit Anonymously", **Then** their response is recorded without user identification

---

### User Story 3 - View Survey Results (Priority: P2)

Administrators can view aggregated results for completed surveys with visual summaries.

**Why this priority**: Important for decision-making but survey can function without immediate results viewing (responses still collected)

**Independent Test**: Admin opens a survey with 10 responses, views results page showing percentage breakdowns for multiple choice and rating questions, and text responses listed

**Acceptance Scenarios**:

1. **Given** a survey with 10 responses, **When** an administrator views results, **Then** they see response counts and percentages for each multiple choice option
2. **Given** a survey with rating scale questions, **When** viewing results, **Then** they see average rating and distribution chart
3. **Given** a survey with text responses, **When** viewing results, **Then** they see all text responses listed (anonymized if responses were anonymous)
4. **Given** a survey with no responses yet, **When** viewing results, **Then** they see "No responses yet" message with response count: 0

---

### User Story 4 - Manage Survey Lifecycle (Priority: P3)

Administrators can edit draft surveys, unpublish active surveys, and delete surveys with confirmation.

**Why this priority**: Nice-to-have for v1 - administrators can work around by creating new surveys

**Independent Test**: Admin creates draft survey, edits questions, publishes it, later unpublishes it, and finally deletes it with confirmation

**Acceptance Scenarios**:

1. **Given** a draft survey, **When** an administrator edits questions and saves, **Then** changes are persisted
2. **Given** an active survey with responses, **When** an administrator clicks "Unpublish", **Then** the survey becomes inactive and hidden from users (responses preserved)
3. **Given** a draft survey with no responses, **When** an administrator deletes it, **Then** a confirmation dialog appears and survey is removed after confirmation
4. **Given** an active survey with responses, **When** attempting to delete, **Then** an error message appears: "Cannot delete survey with existing responses. Unpublish first."

---

### Edge Cases

- **Empty survey**: Administrator attempts to publish survey with no questions → validation error "Survey must have at least 1 question"
- **Duplicate response**: User tries to submit response twice → system detects and shows "You have already responded" message
- **Survey deleted while user responding**: User submits response to deleted survey → error message "Survey no longer available"
- **Maximum questions exceeded**: Administrator adds 21st question → validation error "Maximum 20 questions per survey"
- **Invalid question type**: Administrator selects unsupported question type → only supported types appear in dropdown
- **All questions skipped**: User submits survey without answering any questions → validation error for required questions, optional questions can be skipped
- **Very long text response**: User enters 5000 characters in text field → field truncates at 2000 characters with counter
- **Survey response limit reached**: 501st user attempts to respond → error message "Survey has reached maximum responses"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow administrators to create surveys with title, description, and multiple questions
- **FR-002**: System MUST support three question types: text (open-ended), multiple choice (single select), and rating scale (1-5 stars)
- **FR-003**: System MUST allow administrators to mark questions as required or optional
- **FR-004**: System MUST validate surveys before publishing (minimum 1 question, all questions have text)
- **FR-005**: System MUST display active surveys in a list visible to authenticated users
- **FR-006**: System MUST prevent users from submitting multiple responses to the same survey
- **FR-007**: System MUST support anonymous responses (no user identification stored)
- **FR-008**: System MUST support attributed responses (user email/name stored with response)
- **FR-009**: System MUST store all responses in the database with timestamp
- **FR-010**: System MUST aggregate results showing response counts and percentages for multiple choice questions
- **FR-011**: System MUST calculate average and distribution for rating scale questions
- **FR-012**: System MUST display text responses in a list for administrators
- **FR-013**: System MUST enforce maximum 20 questions per survey
- **FR-014**: System MUST enforce maximum 500 responses per survey
- **FR-015**: System MUST prevent deletion of surveys with existing responses
- **FR-016**: System MUST allow administrators to unpublish active surveys (hiding from users while preserving responses)
- **FR-017**: System MUST use Fluent UI components for all survey interfaces
- **FR-018**: System MUST integrate with existing MSAL authentication for user identification
- **FR-019**: System MUST validate required questions before allowing response submission
- **FR-020**: System MUST provide confirmation message after successful response submission

### Key Entities

- **Survey**: Represents a survey with title, description, status (draft/active/inactive), creator, created date, published date
- **Question**: Represents a single question with text, type (text/multiple-choice/rating), required flag, order, options (for multiple choice)
- **SurveyResponse**: Represents a user's response to a survey with survey ID, user ID (nullable for anonymous), submitted date
- **QuestionResponse**: Represents answer to a single question with response ID, question ID, answer (text/selected option/rating value)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can create and publish a survey with 5 questions in under 3 minutes
- **SC-002**: Users can complete and submit a 10-question survey in under 2 minutes
- **SC-003**: System displays aggregated results for 100 responses in under 2 seconds
- **SC-004**: 95% of users successfully submit survey responses on first attempt without errors
- **SC-005**: System prevents duplicate responses with 100% accuracy in testing
- **SC-006**: Survey creation form validates all required fields before saving with 100% accuracy
- **SC-007**: Anonymous responses contain no user identification data in 100% of test cases
- **SC-008**: Results page correctly calculates percentages and averages with 100% accuracy for sample datasets

## Assumptions

- Administrators are identified by existing role system or can be any authenticated user for v1
- Survey feature will be accessible via new navigation item in existing AppShell
- SQLite database can handle 500 responses per survey with acceptable performance
- Users understand that anonymous responses cannot be edited or deleted
- Survey results are viewable by all administrators (no survey-specific access control)
- Question options for multiple choice are defined at creation time (not dynamically added during response)
- Rating scale is always 1-5 stars (not configurable per question)
- Survey responses are immutable after submission (no editing)
- Network connectivity is stable during response submission (no offline support)
