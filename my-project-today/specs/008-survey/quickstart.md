# Quickstart Guide: Survey Component

**Phase**: 1 (Design & Contracts)  
**Date**: February 18, 2026  
**Status**: Complete

## Overview

This guide provides step-by-step instructions for implementing the survey component feature. Follow TDD (Test-First) approach: write tests before implementation.

**Estimated Time**: 12-16 hours (across 3-4 work sessions)

## Prerequisites

- ✅ [spec.md](spec.md) reviewed and understood
- ✅ [data-model.md](data-model.md) reviewed for entity structure
- ✅ [contracts/README.md](contracts/README.md) reviewed for API contracts
- ✅ Development environment running (backend + frontend)
- ✅ Database tools ready (EF Core CLI)

## Implementation Order

Feature is divided into 4 independently deliverable phases, following P1→P2→P3 priority from spec:

1. **Backend Foundation** (P1): Entities + Database + Basic CRUD
2. **Frontend Foundation** (P1): Survey list + Create/Edit forms
3. **Response Submission** (P1): Submit responses + Duplicate prevention
4. **Results & Lifecycle** (P2+P3): View results + Publish/Unpublish/Delete

---

## Phase 1: Backend Foundation (4-5 hours)

### Step 1.1: Create Entity Models (30 minutes)

**File**: `src/server/Models/Survey.cs` (new)

```csharp
namespace VibeCode.Server.Models
{
    public class Survey
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public SurveyStatus Status { get; set; } = SurveyStatus.Draft;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        
        // Navigation properties
        public List<Question> Questions { get; set; } = new();
        public List<SurveyResponse> Responses { get; set; } = new();
    }

    public class Question
    {
        public int Id { get; set; }
        public int SurveyId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public QuestionType Type { get; set; }
        public bool IsRequired { get; set; }
        public int Order { get; set; }
        public string? OptionsJson { get; set; }
        
        public Survey Survey { get; set; } = null!;
        public List<QuestionResponse> QuestionResponses { get; set; } = new();
    }

    public class SurveyResponse
    {
        public int Id { get; set; }
        public int SurveyId { get; set; }
        public string? UserId { get; set; }
        public DateTime SubmittedAt { get; set; }
        
        public Survey Survey { get; set; } = null!;
        public List<QuestionResponse> QuestionResponses { get; set; } = new();
    }

    public class QuestionResponse
    {
        public int Id { get; set; }
        public int SurveyResponseId { get; set; }
        public int QuestionId { get; set; }
        public string? AnswerText { get; set; }
        public string? AnswerOption { get; set; }
        public int? AnswerRating { get; set; }
        
        public SurveyResponse SurveyResponse { get; set; } = null!;
        public Question Question { get; set; } = null!;
    }

    public enum SurveyStatus
    {
        Draft = 0,
        Active = 1,
        Inactive = 2
    }

    public enum QuestionType
    {
        Text = 0,
        MultipleChoice = 1,
        Rating = 2
    }
}
```

---

### Step 1.2: Update DbContext (15 minutes)

**File**: `src/server/Data/MeetingRequestsDbContext.cs` (modify)

Add DbSets:
```csharp
public DbSet<Survey> Surveys { get; set; } = null!;
public DbSet<Question> Questions { get; set; } = null!;
public DbSet<SurveyResponse> SurveyResponses { get; set; } = null!;
public DbSet<QuestionResponse> QuestionResponses { get; set; } = null!;
```

Add configuration in `OnModelCreating`:
```csharp
// Survey configuration
modelBuilder.Entity<Survey>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
    entity.Property(e => e.Description).HasMaxLength(2000);
    entity.HasMany(e => e.Questions)
        .WithOne(q => q.Survey)
        .HasForeignKey(q => q.SurveyId)
        .OnDelete(DeleteBehavior.Cascade);
    entity.HasMany(e => e.Responses)
        .WithOne(r => r.Survey)
        .HasForeignKey(r => r.SurveyId)
        .OnDelete(DeleteBehavior.Cascade);
});

// Question configuration
modelBuilder.Entity<Question>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.QuestionText).IsRequired().HasMaxLength(500);
    entity.HasIndex(e => e.SurveyId);
});

// SurveyResponse configuration
modelBuilder.Entity<SurveyResponse>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.HasIndex(e => new { e.SurveyId, e.UserId })
        .IsUnique()
        .HasFilter("UserId IS NOT NULL");
    entity.HasMany(e => e.QuestionResponses)
        .WithOne(qr => qr.SurveyResponse)
        .HasForeignKey(qr => qr.SurveyResponseId)
        .OnDelete(DeleteBehavior.Cascade);
});

// QuestionResponse configuration
modelBuilder.Entity<QuestionResponse>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.AnswerText).HasMaxLength(2000);
    entity.HasIndex(e => e.SurveyResponseId);
    entity.HasIndex(e => e.QuestionId);
});
```

---

### Step 1.3: Create EF Core Migration (10 minutes)

```powershell
cd src/server
dotnet ef migrations add AddSurveyTables --context MeetingRequestsDbContext
dotnet ef database update
```

**Verify**:
- Check migration file created in `Migrations/` folder
- Verify tables exist: Surveys, Questions, SurveyResponses, QuestionResponses
- Verify unique index on SurveyResponses (SurveyId, UserId)

---

### Step 1.4: Create SurveysController (1 hour)

**File**: `src/server/Controllers/SurveysController.cs` (new)

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VibeCode.Server.Models;

namespace VibeCode.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SurveysController : ControllerBase
    {
        private readonly MeetingRequestsDbContext _db;

        public SurveysController(MeetingRequestsDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _db.Surveys.Include(s => s.Questions).Include(s => s.Responses).AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SurveyStatus>(status, out var statusEnum))
            {
                query = query.Where(s => s.Status == statusEnum);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    id = s.Id,
                    title = s.Title,
                    description = s.Description,
                    status = s.Status.ToString(),
                    createdBy = s.CreatedBy,
                    createdAt = s.CreatedAt,
                    publishedAt = s.PublishedAt,
                    questionCount = s.Questions.Count,
                    responseCount = s.Responses.Count
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                page,
                pageSize,
                totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                hasMore = page * pageSize < totalCount
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var survey = await _db.Surveys
                .Include(s => s.Questions)
                .Include(s => s.Responses)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (survey == null)
                return NotFound(new { error = "Survey not found" });

            return Ok(new
            {
                id = survey.Id,
                title = survey.Title,
                description = survey.Description,
                status = survey.Status.ToString(),
                createdBy = survey.CreatedBy,
                createdAt = survey.CreatedAt,
                publishedAt = survey.PublishedAt,
                questions = survey.Questions.OrderBy(q => q.Order).Select(q => new
                {
                    id = q.Id,
                    questionText = q.QuestionText,
                    type = q.Type.ToString(),
                    isRequired = q.IsRequired,
                    order = q.Order,
                    options = q.Type == QuestionType.MultipleChoice 
                        ? System.Text.Json.JsonSerializer.Deserialize<string[]>(q.OptionsJson ?? "[]") 
                        : null
                }),
                responseCount = survey.Responses.Count
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSurveyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { error = "Title is required" });

            if (request.Title.Length > 200)
                return BadRequest(new { error = "Title max 200 characters" });

            if (request.Questions != null && request.Questions.Count > 20)
                return BadRequest(new { error = "Maximum 20 questions per survey" });

            var userId = User?.Identity?.Name ?? "system";

            var survey = new Survey
            {
                Title = request.Title,
                Description = request.Description ?? string.Empty,
                Status = SurveyStatus.Draft,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            if (request.Questions != null)
            {
                foreach (var q in request.Questions)
                {
                    var question = new Question
                    {
                        QuestionText = q.QuestionText,
                        Type = Enum.Parse<QuestionType>(q.Type),
                        IsRequired = q.IsRequired,
                        Order = q.Order,
                        OptionsJson = q.Options != null 
                            ? System.Text.Json.JsonSerializer.Serialize(q.Options) 
                            : null
                    };
                    survey.Questions.Add(question);
                }
            }

            _db.Surveys.Add(survey);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(Get), new { id = survey.Id }, new { id = survey.Id, message = "Survey created successfully" });
        }

        // Add more methods: Update, Delete, Publish, Unpublish in later steps
    }

    public class CreateSurveyRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<QuestionRequest>? Questions { get; set; }
    }

    public class QuestionRequest
    {
        public string QuestionText { get; set; } = string.Empty;
        public string Type { get; set; } = "Text";
        public bool IsRequired { get; set; }
        public int Order { get; set; }
        public List<string>? Options { get; set; }
    }
}
```

---

### Step 1.5: Write Backend Integration Tests (1.5 hours)

**File**: `src/tests/MeetingRequests.IntegrationTests/Tests/SurveysControllerTests.cs` (new)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;
using VibeCode.Server.Models;

namespace MeetingRequests.IntegrationTests.Tests
{
    public class SurveysControllerTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SurveysControllerTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Create_ValidSurvey_ReturnsCreated()
        {
            // Arrange
            var request = new
            {
                title = "Test Survey",
                description = "Test Description",
                questions = new[]
                {
                    new { questionText = "Question 1", type = "Text", isRequired = true, order = 1 }
                }
            };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            // Act
            var response = await _client.PostAsync("/api/surveys", content);

            // Assert
            Assert.True(response.IsSuccessStatusCode);
            var result = await response.Content.ReadAsStringAsync();
            Assert.Contains("Survey created successfully", result);
        }

        [Fact]
        public async Task Create_EmptyTitle_ReturnsBadRequest()
        {
            // Arrange
            var request = new { title = "", description = "Test" };
            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");

            // Act
            var response = await _client.PostAsync("/api/surveys", content);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
            var result = await response.Content.ReadAsStringAsync();
            Assert.Contains("Title is required", result);
        }

        [Fact]
        public async Task List_ReturnsSuccess()
        {
            // Act
            var response = await _client.GetAsync("/api/surveys");

            // Assert
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadAsStringAsync();
            Assert.Contains("items", result);
        }

        // Add more tests for Get, Update, Delete, Publish, etc.
    }
}
```

**Run tests**:
```powershell
cd src/tests/MeetingRequests.IntegrationTests
dotnet test
```

---

## Phase 2: Frontend Foundation (4-5 hours)

### Step 2.1: Create SurveysList Component (1 hour)

**File**: `src/client/src/components/SurveysList.jsx` (new)

```jsx
import React, { useState, useEffect } from 'react'
import {
  FluentProvider,
  teamsLightTheme,
  Button,
  Card,
  Text,
  Spinner
} from '@fluentui/react-components'
import { Add24Regular } from '@fluentui/react-icons'

export default function SurveysList({ onCreateSurvey }) {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSurveys()
  }, [])

  async function loadSurveys() {
    try {
      setLoading(true)
      const response = await fetch('/api/surveys')
      if (!response.ok) throw new Error('Failed to load surveys')
      const data = await response.json()
      setSurveys(data.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner label="Loading surveys..." />
  if (error) return <Text>Error: {error}</Text>

  return (
    <FluentProvider theme={teamsLightTheme}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Surveys</h1>
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={onCreateSurvey}
            data-testid="create-survey-btn"
          >
            Create Survey
          </Button>
        </div>

        <div className="grid gap-4" data-testid="surveys-list">
          {surveys.map(survey => (
            <Card key={survey.id} data-testid={`survey-item-${survey.id}`}>
              <div className="p-4">
                <Text weight="semibold" size={500}>{survey.title}</Text>
                <Text size={300} className="block mt-2">{survey.description}</Text>
                <div className="flex gap-4 mt-3">
                  <Text size={200}>Status: {survey.status}</Text>
                  <Text size={200}>Questions: {survey.questionCount}</Text>
                  <Text size={200}>Responses: {survey.responseCount}</Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </FluentProvider>
  )
}
```

---

### Step 2.2: Create SurveyForm Component (2 hours)

**File**: `src/client/src/components/SurveyForm.jsx` (new)

```jsx
import React, { useState } from 'react'
import {
  FluentProvider,
  teamsLightTheme,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Button,
  MessageBar
} from '@fluentui/react-components'
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons'

export default function SurveyForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    questions: []
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)

  function addQuestion() {
    if (form.questions.length >= 20) {
      setErrors({ general: 'Maximum 20 questions per survey' })
      return
    }
    setForm({
      ...form,
      questions: [...form.questions, {
        questionText: '',
        type: 'Text',
        isRequired: true,
        order: form.questions.length + 1,
        options: []
      }]
    })
  }

  function removeQuestion(index) {
    const newQuestions = form.questions.filter((_, i) => i !== index)
    setForm({ ...form, questions: newQuestions })
  }

  function updateQuestion(index, field, value) {
    const newQuestions = [...form.questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setForm({ ...form, questions: newQuestions })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setStatus(null)

    if (!form.title) {
      setErrors({ title: 'Title is required' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create survey')
      }

      setStatus({ type: 'success', message: 'Survey created successfully' })
      if (onSuccess) onSuccess()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FluentProvider theme={teamsLightTheme}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {status && (
          <MessageBar intent={status.type === 'success' ? 'success' : 'error'}>
            {status.message}
          </MessageBar>
        )}

        <Field label="Title" required validationMessage={errors.title}>
          <Input
            value={form.title}
            onChange={(e, data) => setForm({ ...form, title: data.value })}
            maxLength={200}
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e, data) => setForm({ ...form, description: data.value })}
            rows={3}
            maxLength={2000}
          />
        </Field>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <Text weight="semibold">Questions</Text>
            <Button
              appearance="secondary"
              icon={<Add24Regular />}
              onClick={addQuestion}
              disabled={form.questions.length >= 20}
            >
              Add Question
            </Button>
          </div>

          {form.questions.map((q, idx) => (
            <div key={idx} className="border p-3 mb-3 rounded" data-testid={`question-form-${idx}`}>
              <Field label={`Question ${idx + 1}`}>
                <Input
                  value={q.questionText}
                  onChange={(e, data) => updateQuestion(idx, 'questionText', data.value)}
                  maxLength={500}
                />
              </Field>

              <Field label="Type">
                <Dropdown
                  value={q.type}
                  onOptionSelect={(e, data) => updateQuestion(idx, 'type', data.optionValue)}
                >
                  <Option value="Text">Text</Option>
                  <Option value="MultipleChoice">Multiple Choice</Option>
                  <Option value="Rating">Rating</Option>
                </Dropdown>
              </Field>

              <Button
                appearance="subtle"
                icon={<Delete24Regular />}
                onClick={() => removeQuestion(idx)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <Button
          appearance="primary"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create Survey'}
        </Button>
      </form>
    </FluentProvider>
  )
}
```

---

### Step 2.3: Create SurveysPage and Add Route (30 minutes)

**File**: `src/client/src/pages/SurveysPage.jsx` (new)

```jsx
import React, { useState } from 'react'
import SurveysList from '../components/SurveysList'
import SurveyForm from '../components/SurveyForm'
import AppShell from '../components/shell/AppShell'
import { Dismiss24Regular } from '@fluentui/react-icons'

export default function SurveysPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <AppShell>
      <SurveysList onCreateSurvey={() => setShowCreateForm(true)} />

      {/* Create Survey Drawer */}
      <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity ${showCreateForm ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowCreateForm(false)} />

      <aside className={`fixed right-0 top-0 h-full w-full sm:w-[52%] md:w-[35.33%] bg-white shadow-lg transform transition-transform flex flex-col ${showCreateForm ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b flex items-center justify-between bg-[#6264A7] text-white">
          <h2 className="text-lg font-semibold">Create Survey</h2>
          <button onClick={() => setShowCreateForm(false)} className="text-white hover:bg-white/20 p-1 rounded">
            <Dismiss24Regular />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <SurveyForm onSuccess={() => setShowCreateForm(false)} />
        </div>
      </aside>
    </AppShell>
  )
}
```

**File**: `src/client/src/App.jsx` (modify)

Add import:
```jsx
import SurveysPage from './pages/SurveysPage'
```

Add route:
```jsx
<Route path="/surveys" element={<RequireAuth><SurveysPage /></RequireAuth>} />
```

---

### Step 2.4: Update Navigation (15 minutes)

**File**: `src/client/src/components/shell/TopNav.jsx` (modify)

Add surveys navigation link:
```jsx
<Link to="/surveys" className="...">Surveys</Link>
```

---

## Phase 3: Response Submission (3-4 hours)

### Step 3.1: Add Response Submission Endpoint (1 hour)

**File**: `src/server/Controllers/SurveysController.cs` (modify)

Add method:
```csharp
[HttpPost("{id}/responses")]
public async Task<IActionResult> SubmitResponse(int id, [FromBody] SubmitResponseRequest request)
{
    var survey = await _db.Surveys
        .Include(s => s.Questions)
        .Include(s => s.Responses)
        .FirstOrDefaultAsync(s => s.Id == id);

    if (survey == null)
        return NotFound(new { error = "Survey not found" });

    if (survey.Status != SurveyStatus.Active)
        return BadRequest(new { error = "Survey not active" });

    if (survey.Responses.Count >= 500)
        return BadRequest(new { error = "Survey has reached maximum responses (500)" });

    var userId = request.IsAnonymous ? null : (User?.Identity?.Name ?? "system");

    // Check for duplicate response (non-anonymous only)
    if (!request.IsAnonymous && userId != null)
    {
        var existing = await _db.SurveyResponses
            .FirstOrDefaultAsync(r => r.SurveyId == id && r.UserId == userId);
        if (existing != null)
            return BadRequest(new { error = "You have already responded to this survey" });
    }

    // Validate required questions
    var requiredQuestions = survey.Questions.Where(q => q.IsRequired).Select(q => q.Id).ToHashSet();
    var answeredQuestions = request.Responses.Select(r => r.QuestionId).ToHashSet();
    if (!requiredQuestions.IsSubsetOf(answeredQuestions))
        return BadRequest(new { error = "Required question not answered" });

    var response = new SurveyResponse
    {
        SurveyId = id,
        UserId = userId,
        SubmittedAt = DateTime.UtcNow
    };

    foreach (var r in request.Responses)
    {
        var questionResponse = new QuestionResponse
        {
            QuestionId = r.QuestionId,
            AnswerText = r.AnswerText,
            AnswerOption = r.AnswerOption,
            AnswerRating = r.AnswerRating
        };
        response.QuestionResponses.Add(questionResponse);
    }

    _db.SurveyResponses.Add(response);
    await _db.SaveChangesAsync();

    return Ok(new { message = "Response submitted successfully" });
}

public class SubmitResponseRequest
{
    public bool IsAnonymous { get; set; }
    public List<QuestionResponseRequest> Responses { get; set; } = new();
}

public class QuestionResponseRequest
{
    public int QuestionId { get; set; }
    public string? AnswerText { get; set; }
    public string? AnswerOption { get; set; }
    public int? AnswerRating { get; set; }
}
```

---

### Step 3.2: Create SurveyResponseForm Component (1.5 hours)

**File**: `src/client/src/components/SurveyResponseForm.jsx` (new)

```jsx
import React, { useState, useEffect } from 'react'
import {
  FluentProvider,
  teamsLightTheme,
  Field,
  Textarea,
  RadioGroup,
  Radio,
  Rating,
  Checkbox,
  Button,
  MessageBar,
  Spinner
} from '@fluentui/react-components'

export default function SurveyResponseForm({ surveyId, onSuccess }) {
  const [survey, setSurvey] = useState(null)
  const [responses, setResponses] = useState({})
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alreadyResponded, setAlreadyResponded] = useState(false)

  useEffect(() => {
    loadSurvey()
  }, [surveyId])

  async function loadSurvey() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`)
      if (!response.ok) throw new Error('Failed to load survey')
      const data = await response.json()
      setSurvey(data)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  function handleResponseChange(questionId, value) {
    setResponses({ ...responses, [questionId]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setStatus(null)

    // Validate required questions
    const requiredQuestions = survey.questions.filter(q => q.isRequired)
    for (const q of requiredQuestions) {
      if (!responses[q.id]) {
        setErrors({ [q.id]: 'This question is required' })
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        isAnonymous,
        responses: Object.entries(responses).map(([questionId, value]) => {
          const question = survey.questions.find(q => q.id === parseInt(questionId))
          if (question.type === 'Text') return { questionId: parseInt(questionId), answerText: value }
          if (question.type === 'MultipleChoice') return { questionId: parseInt(questionId), answerOption: value }
          if (question.type === 'Rating') return { questionId: parseInt(questionId), answerRating: value }
        })
      }

      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.error.includes('already responded')) {
          setAlreadyResponded(true)
        }
        throw new Error(error.error || 'Failed to submit response')
      }

      setStatus({ type: 'success', message: 'Response submitted successfully' })
      if (onSuccess) onSuccess()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner label="Loading survey..." />
  if (alreadyResponded) return <MessageBar intent="warning">You have already responded to this survey</MessageBar>
  if (!survey) return null

  return (
    <FluentProvider theme={teamsLightTheme}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {status && (
          <MessageBar intent={status.type === 'success' ? 'success' : 'error'}>
            {status.message}
          </MessageBar>
        )}

        <div>
          <h2 className="text-xl font-semibold">{survey.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
        </div>

        {survey.questions.map((question, idx) => (
          <Field
            key={question.id}
            label={`${idx + 1}. ${question.questionText}`}
            required={question.isRequired}
            validationMessage={errors[question.id]}
          >
            {question.type === 'Text' && (
              <Textarea
                value={responses[question.id] || ''}
                onChange={(e, data) => handleResponseChange(question.id, data.value)}
                rows={3}
                maxLength={2000}
              />
            )}

            {question.type === 'MultipleChoice' && (
              <RadioGroup
                value={responses[question.id] || ''}
                onChange={(e, data) => handleResponseChange(question.id, data.value)}
              >
                {question.options.map(option => (
                  <Radio key={option} value={option} label={option} />
                ))}
              </RadioGroup>
            )}

            {question.type === 'Rating' && (
              <Rating
                value={responses[question.id] || 0}
                onChange={(e, data) => handleResponseChange(question.id, data.value)}
                max={5}
              />
            )}
          </Field>
        ))}

        <Checkbox
          label="Submit anonymously"
          checked={isAnonymous}
          onChange={(e, data) => setIsAnonymous(data.checked)}
          data-testid="anonymous-checkbox"
        />

        <Button
          appearance="primary"
          type="submit"
          disabled={submitting}
          data-testid="submit-response-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Response'}
        </Button>
      </form>
    </FluentProvider>
  )
}
```

---

## Phase 4: Results & Lifecycle (3-4 hours)

### Step 4.1: Add Results Endpoint (1 hour)

**File**: `src/server/Controllers/SurveysController.cs` (modify)

Add method:
```csharp
[HttpGet("{id}/results")]
public async Task<IActionResult> GetResults(int id)
{
    var survey = await _db.Surveys
        .Include(s => s.Questions)
        .Include(s => s.Responses)
            .ThenInclude(r => r.QuestionResponses)
        .FirstOrDefaultAsync(s => s.Id == id);

    if (survey == null)
        return NotFound(new { error = "Survey not found" });

    var questionResults = survey.Questions.OrderBy(q => q.Order).Select(q =>
    {
        var responses = survey.Responses.SelectMany(r => r.QuestionResponses.Where(qr => qr.QuestionId == q.Id)).ToList();

        object result = new { questionId = q.Id, questionText = q.QuestionText, type = q.Type.ToString() };

        if (q.Type == QuestionType.Rating)
        {
            var ratings = responses.Select(r => r.AnswerRating ?? 0).ToList();
            var avg = ratings.Any() ? ratings.Average() : 0;
            var dist = new Dictionary<int, int> { {1, 0}, {2, 0}, {3, 0}, {4, 0}, {5, 0} };
            foreach (var r in ratings) if (r >= 1 && r <= 5) dist[r]++;
            
            result = new { questionId = q.Id, questionText = q.QuestionText, type = "Rating", ratingAverage = avg, ratingDistribution = dist };
        }
        else if (q.Type == QuestionType.MultipleChoice)
        {
            var optionCounts = responses.GroupBy(r => r.AnswerOption).Select(g => new { option = g.Key, count = g.Count() }).ToList();
            var total = responses.Count;
            var options = optionCounts.Select(o => new { option = o.option, count = o.count, percentage = total > 0 ? (o.count / (double)total * 100) : 0 }).ToList();
            
            result = new { questionId = q.Id, questionText = q.QuestionText, type = "MultipleChoice", options };
        }
        else if (q.Type == QuestionType.Text)
        {
            var textResponses = responses.Select(r => new { response = r.AnswerText, submittedAt = r.SurveyResponse.SubmittedAt, isAnonymous = r.SurveyResponse.UserId == null }).ToList();
            
            result = new { questionId = q.Id, questionText = q.QuestionText, type = "Text", textResponses };
        }

        return result;
    }).ToList();

    return Ok(new
    {
        surveyId = survey.Id,
        surveyTitle = survey.Title,
        totalResponses = survey.Responses.Count,
        questions = questionResults
    });
}
```

---

### Step 4.2: Add Publish/Unpublish/Delete Endpoints (1 hour)

**File**: `src/server/Controllers/SurveysController.cs` (modify)

Add methods:
```csharp
[HttpPost("{id}/publish")]
public async Task<IActionResult> Publish(int id)
{
    var survey = await _db.Surveys.Include(s => s.Questions).FirstOrDefaultAsync(s => s.Id == id);
    if (survey == null) return NotFound(new { error = "Survey not found" });

    if (survey.Questions.Count == 0)
        return BadRequest(new { error = "Survey must have at least 1 question" });

    survey.Status = SurveyStatus.Active;
    survey.PublishedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    return Ok(new { message = "Survey published successfully" });
}

[HttpPost("{id}/unpublish")]
public async Task<IActionResult> Unpublish(int id)
{
    var survey = await _db.Surveys.FindAsync(id);
    if (survey == null) return NotFound(new { error = "Survey not found" });

    survey.Status = SurveyStatus.Inactive;
    await _db.SaveChangesAsync();

    return Ok(new { message = "Survey unpublished successfully" });
}

[HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id)
{
    var survey = await _db.Surveys.Include(s => s.Responses).FirstOrDefaultAsync(s => s.Id == id);
    if (survey == null) return NotFound(new { error = "Survey not found" });

    if (survey.Responses.Count > 0)
        return BadRequest(new { error = "Cannot delete survey with existing responses. Unpublish first." });

    _db.Surveys.Remove(survey);
    await _db.SaveChangesAsync();

    return Ok(new { message = "Survey deleted successfully" });
}
```

---

### Step 4.3: Create SurveyResults Component (1 hour)

**File**: `src/client/src/components/SurveyResults.jsx` (new)

```jsx
import React, { useState, useEffect } from 'react'
import {
  FluentProvider,
  teamsLightTheme,
  Card,
  Text,
  Spinner
} from '@fluentui/react-components'

export default function SurveyResults({ surveyId }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadResults()
  }, [surveyId])

  async function loadResults() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/results`)
      if (!response.ok) throw new Error('Failed to load results')
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner label="Loading results..." />
  if (error) return <Text>Error: {error}</Text>
  if (!results) return null

  return (
    <FluentProvider theme={teamsLightTheme}>
      <div className="p-6">
        <h2 className="text-2xl font-bold">{results.surveyTitle}</h2>
        <Text size={300} className="block mt-2">Total Responses: {results.totalResponses}</Text>

        <div className="mt-6 space-y-6">
          {results.questions.map(q => (
            <Card key={q.questionId} data-testid={`results-chart-${q.questionId}`}>
              <div className="p-4">
                <Text weight="semibold">{q.questionText}</Text>

                {q.type === 'Rating' && (
                  <div className="mt-3">
                    <Text>Average: {q.ratingAverage.toFixed(2)}</Text>
                    {Object.entries(q.ratingDistribution).map(([rating, count]) => (
                      <div key={rating} className="flex items-center gap-2">
                        <Text>{rating} stars:</Text>
                        <div className="flex-1 bg-gray-200 h-4">
                          <div className="bg-blue-500 h-4" style={{ width: `${(count / results.totalResponses) * 100}%` }} />
                        </div>
                        <Text>{count}</Text>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'MultipleChoice' && (
                  <div className="mt-3">
                    {q.options.map(opt => (
                      <div key={opt.option} className="flex items-center gap-2 mb-2">
                        <Text className="w-32">{opt.option}:</Text>
                        <div className="flex-1 bg-gray-200 h-4">
                          <div className="bg-green-500 h-4" style={{ width: `${opt.percentage}%` }} />
                        </div>
                        <Text>{opt.count} ({opt.percentage.toFixed(1)}%)</Text>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'Text' && (
                  <div className="mt-3 space-y-2">
                    {q.textResponses.map((resp, idx) => (
                      <div key={idx} className="border-l-2 border-gray-300 pl-3">
                        <Text size={200}>{resp.response}</Text>
                        <Text size={100} className="text-gray-500">
                          {resp.isAnonymous ? 'Anonymous' : 'User'} • {new Date(resp.submittedAt).toLocaleString()}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </FluentProvider>
  )
}
```

---

## Testing

### Backend Integration Tests

```powershell
cd src/tests/MeetingRequests.IntegrationTests
dotnet test
```

**Expected**: All tests pass (8+ tests)

### Frontend E2E Tests

**File**: `src/client/e2e/tests/survey.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test'

test('admin creates and publishes survey', async ({ page }) => {
  await page.goto('/surveys')
  await page.click('[data-testid="create-survey-btn"]')
  
  await page.fill('input[name="title"]', 'Test Survey')
  await page.fill('textarea[name="description"]', 'Test Description')
  
  await page.click('text=Add Question')
  await page.fill('[data-testid="question-form-0"] input', 'How satisfied are you?')
  
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Survey created successfully')).toBeVisible()
})

test('user submits survey response', async ({ page }) => {
  // Assumes survey ID 1 exists
  await page.goto('/surveys/1/respond')
  
  await page.fill('textarea', 'Great survey!')
  await page.click('[data-testid="submit-response-btn"]')
  
  await expect(page.locator('text=Response submitted successfully')).toBeVisible()
})

test('user cannot submit duplicate response', async ({ page }) => {
  await page.goto('/surveys/1/respond')
  await page.fill('textarea', 'Another response')
  await page.click('[data-testid="submit-response-btn"]')
  
  await expect(page.locator('text=already responded')).toBeVisible()
})
```

Run E2E tests:
```powershell
cd src/client
npm run e2e
```

---

## Verification Checklist

- [ ] Backend: 4 entities (Survey, Question, SurveyResponse, QuestionResponse) created
- [ ] Backend: EF Core migration applied successfully
- [ ] Backend: 9 API endpoints implemented (List, Get, Create, Update, Delete, Publish, Unpublish, SubmitResponse, GetResults)
- [ ] Backend: 8+ integration tests pass
- [ ] Frontend: SurveysList component displays surveys
- [ ] Frontend: SurveyForm creates surveys with questions
- [ ] Frontend: SurveyResponseForm submits responses
- [ ] Frontend: SurveyResults displays aggregated results
- [ ] Frontend: /surveys route added to App.jsx
- [ ] Frontend: Navigation link added to TopNav
- [ ] E2E: 3+ Playwright tests pass

---

## Commit & Git

```bash
git add .
git commit -m "feat(008): Implement survey component

- Add Survey, Question, SurveyResponse, QuestionResponse entities
- Add EF Core migration for survey tables
- Implement SurveysController with 9 endpoints
- Add SurveysList, SurveyForm, SurveyResponseForm, SurveyResults components
- Add /surveys route and navigation
- Add backend integration tests (xUnit)
- Add E2E tests (Playwright)
- Support anonymous and attributed responses
- Implement duplicate response prevention
- Add publish/unpublish/delete lifecycle actions
- Display aggregated results (percentages, averages, text responses)

Closes #008"
```

---

## Next Steps

After merging this feature:
1. Run `/speckit.tasks` to generate task decomposition (tasks.md)
2. Consider enhancements: survey scheduling, response editing, advanced analytics
3. Add email notifications for new surveys (future PR)
4. Implement export results as CSV (future PR)

**Feature is complete and ready for production!** 🎉
