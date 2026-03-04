# API Contracts: Survey Component

**Phase**: 1 (Design & Contracts)  
**Date**: February 18, 2026  
**Status**: Complete

## Overview

This document defines the public API contracts for the survey component, including HTTP endpoints, request/response schemas, and frontend component interfaces. All contracts follow OpenAPI 3.0 style documentation.

## Base URL

- **Development**: `/api/surveys`
- **Production**: `/api/surveys`

## Authentication

All endpoints require JWT Bearer authentication via MSAL (Microsoft Authentication Library):

```http
Authorization: Bearer <access_token>
```

**Exception**: None. All survey endpoints require authentication (even viewing active surveys).

## API Endpoints

### 1. List Surveys

**Endpoint**: `GET /api/surveys`  
**Description**: Retrieve paginated list of surveys  
**Authorization**: Required

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by status: "Draft", "Active", "Inactive" |
| page | int | No | 1 | Page number (1-indexed) |
| pageSize | int | No | 20 | Items per page (max 100) |

**Response 200** (application/json):
```json
{
  "items": [
    {
      "id": 1,
      "title": "Q1 Board Satisfaction Survey",
      "description": "Quarterly survey for board members",
      "status": "Active",
      "createdBy": "john.doe@example.com",
      "createdAt": "2026-02-18T10:30:00Z",
      "publishedAt": "2026-02-18T11:00:00Z",
      "questionCount": 5,
      "responseCount": 12
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 3,
  "totalPages": 1,
  "hasMore": false
}
```

---

### 2. Get Survey Details

**Endpoint**: `GET /api/surveys/{id}`  
**Description**: Retrieve single survey with questions  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Response 200** (application/json):
```json
{
  "id": 1,
  "title": "Q1 Board Satisfaction Survey",
  "description": "Quarterly survey for board members",
  "status": "Active",
  "createdBy": "john.doe@example.com",
  "createdAt": "2026-02-18T10:30:00Z",
  "publishedAt": "2026-02-18T11:00:00Z",
  "questions": [
    {
      "id": 101,
      "questionText": "How satisfied are you with board meetings?",
      "type": "Rating",
      "isRequired": true,
      "order": 1,
      "options": null
    },
    {
      "id": 102,
      "questionText": "What topics should we prioritize?",
      "type": "MultipleChoice",
      "isRequired": true,
      "order": 2,
      "options": ["Finance", "Strategy", "Operations", "Governance"]
    },
    {
      "id": 103,
      "questionText": "Additional feedback",
      "type": "Text",
      "isRequired": false,
      "order": 3,
      "options": null
    }
  ],
  "responseCount": 12
}
```

**Response 404**:
```json
{
  "error": "Survey not found"
}
```

---

### 3. Create Survey

**Endpoint**: `POST /api/surveys`  
**Description**: Create new draft survey  
**Authorization**: Required

**Request Body** (application/json):
```json
{
  "title": "Q1 Board Satisfaction Survey",
  "description": "Quarterly survey for board members",
  "questions": [
    {
      "questionText": "How satisfied are you with board meetings?",
      "type": "Rating",
      "isRequired": true,
      "order": 1
    },
    {
      "questionText": "What topics should we prioritize?",
      "type": "MultipleChoice",
      "isRequired": true,
      "order": 2,
      "options": ["Finance", "Strategy", "Operations", "Governance"]
    }
  ]
}
```

**Response 201** (application/json):
```json
{
  "id": 1,
  "message": "Survey created successfully"
}
```

**Response 400** (Validation Errors):
```json
{
  "error": "Title is required"
}
```
Other validation errors:
- `"Title max 200 characters"`
- `"Description max 2000 characters"`
- `"Maximum 20 questions per survey"`
- `"Multiple choice question needs 2-10 options"`

---

### 4. Update Survey

**Endpoint**: `PUT /api/surveys/{id}`  
**Description**: Update draft survey  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Request Body** (application/json):
```json
{
  "title": "Q1 Board Satisfaction Survey (Updated)",
  "description": "Updated description",
  "questions": [
    {
      "id": 101,
      "questionText": "Updated question text",
      "type": "Rating",
      "isRequired": true,
      "order": 1
    }
  ]
}
```

**Response 200**:
```json
{
  "message": "Survey updated successfully"
}
```

**Response 400**:
```json
{
  "error": "Cannot update published survey"
}
```

---

### 5. Publish Survey

**Endpoint**: `POST /api/surveys/{id}/publish`  
**Description**: Publish survey (change status from Draft to Active)  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Response 200**:
```json
{
  "message": "Survey published successfully"
}
```

**Response 400** (Validation):
```json
{
  "error": "Survey must have at least 1 question"
}
```

---

### 6. Unpublish Survey

**Endpoint**: `POST /api/surveys/{id}/unpublish`  
**Description**: Unpublish survey (change status from Active to Inactive)  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Response 200**:
```json
{
  "message": "Survey unpublished successfully"
}
```

---

### 7. Delete Survey

**Endpoint**: `DELETE /api/surveys/{id}`  
**Description**: Delete draft survey (only if no responses exist)  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Response 200**:
```json
{
  "message": "Survey deleted successfully"
}
```

**Response 400**:
```json
{
  "error": "Cannot delete survey with existing responses. Unpublish first."
}
```

---

### 8. Submit Survey Response

**Endpoint**: `POST /api/surveys/{id}/responses`  
**Description**: Submit user response to active survey  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Request Body** (application/json):
```json
{
  "isAnonymous": false,
  "responses": [
    {
      "questionId": 101,
      "answerRating": 4
    },
    {
      "questionId": 102,
      "answerOption": "Finance"
    },
    {
      "questionId": 103,
      "answerText": "Great job on communication!"
    }
  ]
}
```

**Response 201**:
```json
{
  "message": "Response submitted successfully"
}
```

**Response 400** (Validation/Duplicate):
```json
{
  "error": "You have already responded to this survey"
}
```

Other errors:
- `"Survey not active"`
- `"Required question not answered"`
- `"Survey has reached maximum responses (500)"`

---

### 9. Get Survey Results

**Endpoint**: `GET /api/surveys/{id}/results`  
**Description**: Get aggregated survey results (admin only)  
**Authorization**: Required

**Path Parameters**:
- `id` (int): Survey ID

**Response 200** (application/json):
```json
{
  "surveyId": 1,
  "surveyTitle": "Q1 Board Satisfaction Survey",
  "totalResponses": 12,
  "questions": [
    {
      "questionId": 101,
      "questionText": "How satisfied are you with board meetings?",
      "type": "Rating",
      "ratingAverage": 4.2,
      "ratingDistribution": {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 5,
        "5": 4
      }
    },
    {
      "questionId": 102,
      "questionText": "What topics should we prioritize?",
      "type": "MultipleChoice",
      "options": [
        {
          "option": "Finance",
          "count": 5,
          "percentage": 41.67
        },
        {
          "option": "Strategy",
          "count": 4,
          "percentage": 33.33
        },
        {
          "option": "Operations",
          "count": 2,
          "percentage": 16.67
        },
        {
          "option": "Governance",
          "count": 1,
          "percentage": 8.33
        }
      ]
    },
    {
      "questionId": 103,
      "questionText": "Additional feedback",
      "type": "Text",
      "textResponses": [
        {
          "response": "Great job on communication!",
          "submittedAt": "2026-02-18T12:00:00Z",
          "isAnonymous": false
        },
        {
          "response": "More time for discussion needed",
          "submittedAt": "2026-02-18T13:00:00Z",
          "isAnonymous": true
        }
      ]
    }
  ]
}
```

---

## Frontend Component Contracts

### SurveysList Component

**Props**:
```typescript
interface SurveysListProps {
  filterStatus?: 'Draft' | 'Active' | 'Inactive';
  onCreateSurvey?: () => void;
}
```

**State**:
```typescript
interface SurveysListState {
  surveys: Survey[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}
```

**Methods**:
- `loadSurveys(): Promise<void>` - Load surveys from API
- `handlePublish(surveyId: number): Promise<void>` - Publish survey
- `handleUnpublish(surveyId: number): Promise<void>` - Unpublish survey
- `handleDelete(surveyId: number): Promise<void>` - Delete survey

---

### SurveyForm Component

**Props**:
```typescript
interface SurveyFormProps {
  surveyId?: number; // For editing existing survey
  onSuccess?: (surveyId: number) => void;
}
```

**State**:
```typescript
interface SurveyFormState {
  title: string;
  description: string;
  questions: Question[];
  submitting: boolean;
  errors: Record<string, string>;
  status: { type: 'success' | 'error'; message: string } | null;
}
```

**Methods**:
- `handleAddQuestion(type: QuestionType): void` - Add new question
- `handleRemoveQuestion(index: number): void` - Remove question
- `handleQuestionChange(index: number, field: string, value: any): void` - Update question
- `validate(): boolean` - Validate form
- `handleSubmit(e: FormEvent): Promise<void>` - Submit form

---

### SurveyResponseForm Component

**Props**:
```typescript
interface SurveyResponseFormProps {
  surveyId: number;
  onSuccess?: () => void;
}
```

**State**:
```typescript
interface SurveyResponseFormState {
  survey: Survey | null;
  responses: Record<number, any>; // questionId -> answer
  isAnonymous: boolean;
  submitting: boolean;
  errors: Record<string, string>;
  alreadyResponded: boolean;
}
```

**Methods**:
- `loadSurvey(): Promise<void>` - Load survey with questions
- `handleResponseChange(questionId: number, value: any): void` - Update answer
- `validate(): boolean` - Validate responses
- `handleSubmit(e: FormEvent): Promise<void>` - Submit response

---

### SurveyResults Component

**Props**:
```typescript
interface SurveyResultsProps {
  surveyId: number;
}
```

**State**:
```typescript
interface SurveyResultsState {
  results: SurveyResults | null;
  loading: boolean;
  error: string | null;
}
```

**Methods**:
- `loadResults(): Promise<void>` - Load aggregated results from API
- `exportResults(): void` - Export results as CSV (future enhancement)

---

## Error Codes

| HTTP Status | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "Title is required" | Validation error |
| 400 | "Maximum 20 questions per survey" | Business rule violation |
| 400 | "Cannot update published survey" | State transition error |
| 400 | "You have already responded to this survey" | Duplicate prevention |
| 400 | "Survey has reached maximum responses (500)" | Capacity limit |
| 401 | "Unauthorized" | Missing or invalid JWT token |
| 404 | "Survey not found" | Resource not found |
| 500 | "Internal server error" | Unexpected error |

---

## Data Types

### QuestionType Enum
```typescript
enum QuestionType {
  Text = 0,
  MultipleChoice = 1,
  Rating = 2
}
```

### SurveyStatus Enum
```typescript
enum SurveyStatus {
  Draft = 0,
  Active = 1,
  Inactive = 2
}
```

---

## Test Data Selectors (E2E)

For Playwright E2E tests, use these data-testid attributes:

| Element | Selector |
|---------|----------|
| Create Survey Button | `create-survey-btn` |
| Survey List | `surveys-list` |
| Survey Item | `survey-item-{id}` |
| Publish Button | `publish-survey-btn-{id}` |
| Unpublish Button | `unpublish-survey-btn-{id}` |
| Delete Button | `delete-survey-btn-{id}` |
| Question Form | `question-form-{index}` |
| Submit Response Button | `submit-response-btn` |
| Anonymous Checkbox | `anonymous-checkbox` |
| Results Chart | `results-chart-{questionId}` |

---

## Summary

**Total Endpoints**: 9 (5 CRUD + 4 actions)  
**Authentication**: All endpoints require JWT Bearer  
**Pagination**: List endpoint uses offset pagination (page/pageSize)  
**Validation**: Client-side + server-side validation with specific error messages  
**Frontend Components**: 4 main components (List, Form, ResponseForm, Results)  
**Test Selectors**: data-testid attributes for E2E testing

**Ready for Implementation**: All contracts are complete and ready for quickstart guide generation.
