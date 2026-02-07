# Frontend Development Guide

Complete guide for developing the Board Meeting Request & Voting System React SPA.

## Quick Start (5 min)

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Create environment config
echo 'VITE_API_URL=http://localhost:5000/v1' > .env.development.local

# 3. Start dev server (auto-opens http://localhost:5173)
npm run dev
```

## Project Structure

```
frontend/
├── src/
│   ├── components/              # Reusable React components
│   │   ├── MeetingRequestForm/  # P1: Create/list requests
│   │   ├── DocumentUpload/      # P2: Upload meeting docs
│   │   ├── VoteCreate/          # P2: Create votes
│   │   └── VoteCast/            # P3: Cast votes (external)
│   ├── pages/                   # Full-page route components
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── MeetingDetail.tsx    # Meeting + docs + votes
│   │   └── VotingPage.tsx       # Vote interface
│   ├── services/                # API clients & utilities
│   │   ├── api.ts               # HTTP client setup
│   │   ├── authService.ts       # Auth (Azure AD, magic links)
│   │   ├── meetingService.ts    # Meeting API calls
│   │   ├── documentService.ts   # Document API calls
│   │   └── voteService.ts       # Vote creation & submission
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts           # Auth state
│   │   ├── useMeetings.ts       # Fetch meetings
│   │   └── useVotes.ts          # Vote state
│   ├── types/                   # TypeScript interfaces
│   │   └── index.ts             # Shared types from API
│   ├── App.tsx                  # Router configuration
│   ├── main.tsx                 # React DOM entry
│   └── index.css                # Global styles
├── index.html                   # HTML root + Vite placeholders
├── vite.config.ts               # Vite build configuration
├── tsconfig.json                # TypeScript strict mode
├── package.json                 # 176 npm packages installed
└── .env.example                 # Template for .env files
```

## Development Workflow

### 1. Running the Dev Server

```bash
cd frontend
npm run dev
```

**Expected output**:
```
  VITE v7.3.1  ready in 317 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

The dev server includes:
- ✅ **Hot Module Replacement (HMR)**: Changes auto-reload (no page refresh)
- ✅ **Source maps**: TypeScript debugging in DevTools
- ✅ **File watching**: Automatic reload on file save

### 2. Debugging in Browser

**Open DevTools** (F12):

**Sources tab**:
- Set breakpoints in TypeScript files
- Step through code
- Inspect variables

**Console tab**:
- `console.log()` output
- Error messages
- Network errors

**Network tab**:
- Inspect API requests/responses
- Check request/response headers
- Verify CORS

**React DevTools extension** (install from Chrome Web Store):
- Inspect component tree
- View props/state
- Track re-renders
- Profile performance

### 3. Working with Components

**Create a new component**:
```bash
mkdir -p src/components/MyComponent
touch src/components/MyComponent/MyComponent.tsx
touch src/components/MyComponent/__tests__/MyComponent.test.tsx
```

**Component template** (src/components/MeetingRequestForm/MeetingRequestForm.tsx):
```typescript
import { FC, useState } from 'react';
import { meetingApi } from '../../services/meetingService';
import './MeetingRequestForm.css';

export interface MeetingRequestFormProps {
  onSuccess?: (requestId: string) => void;
}

export const MeetingRequestForm: FC<MeetingRequestFormProps> = ({ onSuccess }) => {
  const [proposedDate, setProposedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await meetingApi.createRequest({ proposedDate });
      console.log('Request created:', result.id);
      onSuccess?.(result.id);
      setProposedDate('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to create request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="meeting-request-form">
      <h2>Request Board Meeting</h2>
      
      <div className="form-group">
        <label htmlFor="date">Proposed Date *</label>
        <input
          id="date"
          type="datetime-local"
          value={proposedDate}
          onChange={(e) => setProposedDate(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Submit Request'}
      </button>
    </form>
  );
};
```

### 4. API Integration

**Service pattern** (src/services/meetingService.ts):
```typescript
import { MeetingRequest, CreateMeetingRequestInput } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const meetingApi = {
  createRequest: (data: CreateMeetingRequestInput) =>
    request<MeetingRequest>('/meeting-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listRequests: (status?: string) =>
    request<MeetingRequest[]>(
      `/meeting-requests${status ? `?status=${status}` : ''}`
    ),

  approveRequest: (requestId: string, meetingDate: string) =>
    request<MeetingRequest>(`/meeting-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ meetingDate }),
    }),

  rejectRequest: (requestId: string, reason: string) =>
    request<void>(`/meeting-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
```

**Using in component**:
```typescript
const handleApprove = async () => {
  try {
    const updated = await meetingApi.approveRequest(requestId, newDate);
    console.log('Approved:', updated);
    // Update UI state
  } catch (error) {
    console.error('Failed to approve:', error);
  }
};
```

### 5. Testing

**Run tests**:
```bash
npm run test
```

**Test file structure** (src/components/MeetingRequestForm/__tests__/MeetingRequestForm.test.tsx):
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MeetingRequestForm } from '../MeetingRequestForm';
import * as meetingService from '../../../services/meetingService';

vi.mock('../../../services/meetingService');

describe('MeetingRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders form with date input', () => {
    render(<MeetingRequestForm />);
    expect(screen.getByLabelText(/proposed date/i)).toBeInTheDocument();
  });

  test('submits form with proposed date', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: '123' });
    vi.mocked(meetingService.meetingApi.createRequest).mockImplementation(mockCreate);

    const onSuccess = vi.fn();
    render(<MeetingRequestForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/proposed date/i), {
      target: { value: '2026-02-15T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        proposedDate: '2026-02-15T10:00',
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('123');
  });

  test('displays error on API failure', async () => {
    const error = new Error('Network error');
    vi.mocked(meetingService.meetingApi.createRequest).mockRejectedValue(error);

    render(<MeetingRequestForm />);

    fireEvent.change(screen.getByLabelText(/proposed date/i), {
      target: { value: '2026-02-15T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
```

## Build & Deployment

### Development Build
```bash
npm run dev
```
- Unminified for easy debugging
- Hot module reloading
- Source maps for TypeScript

### Production Build
```bash
npm run build
```

Creates optimized `dist/` folder:
- Minified JavaScript & CSS
- Asset hashing (long-term caching)
- Tree-shaking (unused code removed)
- Optimal chunk splitting

### Preview Production Build
```bash
npm run preview
```
Serves optimized build on http://localhost:4173 for local testing.

### Deploy to Azure Static Web Apps

```bash
# 1. Build frontend
npm run build

# 2. Deploy via Azure CLI
az staticwebapp create \
  --name ubs-board-meeting \
  --resource-group my-rg \
  --source ./dist \
  --location eastus
```

Or connect GitHub for automatic CI/CD:
```bash
az staticwebapp create \
  --name ubs-board-meeting \
  --resource-group my-rg \
  --source https://github.com/YOUR_REPO \
  --branch main \
  --login-with-github
```

## Environment Configuration

### Development (.env.development.local)

```env
VITE_API_URL=http://localhost:5000/v1
VITE_AUTH_ENABLED=false
VITE_LOG_LEVEL=debug
```

### Staging (.env.staging)

```env
VITE_API_URL=https://api-staging.ubs.example.com/v1
VITE_AUTH_ENABLED=true
VITE_AUTH_AUTHORITY=https://login.microsoftonline.com/TENANT_ID
VITE_AUTH_CLIENT_ID=STAGING_CLIENT_ID
VITE_SCOPES=api://api-staging/api.access
```

### Production (.env.production)

```env
VITE_API_URL=https://api.ubs.example.com/v1
VITE_AUTH_ENABLED=true
VITE_AUTH_AUTHORITY=https://login.microsoftonline.com/PROD_TENANT_ID
VITE_AUTH_CLIENT_ID=PROD_CLIENT_ID
VITE_SCOPES=api://api-prod/api.access
```

## Authentication

### Development Mode
No authentication required. All requests proceed.

```typescript
// authService.ts in dev mode
export const useAuth = () => ({
  isAuthenticated: true,
  user: { id: 'dev-user', email: 'dev@example.com' },
  login: async () => {},
  logout: async () => {},
  getToken: async () => 'dev-token',
});
```

### Production: Azure AD (Internal Users)

```typescript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
    authority: import.meta.env.VITE_AUTH_AUTHORITY,
    redirectUri: window.location.origin,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

### Production: Magic Link (External Voters)

JWT in URL: `https://voting.ubs.example.com/?token=eyJhbGc...`

```typescript
export const useVotingLink = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      const decoded = JSON.parse(atob(token.split('.')[1])); // JWT decode
      setUser({
        email: decoded.email,
        meetingId: decoded.meetingId,
      });
    }
  }, []);

  return user;
};
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE: address already in use :::5173` | Port 5173 in use | `npm run dev -- --port 3000` |
| `CORS error: Access-Control-Allow-Origin` | Backend CORS not configured | Check backend `Program.cs` CORS policy |
| `fetch failed: (API_URL)` | Backend not running | Run backend in separate terminal |
| `API returns 401 Unauthorized` | Invalid/missing token | Check auth headers, verify token valid |
| `TypeError: Cannot read property X of undefined` | Component not waiting for data | Add loading state, use optional chaining `?.` |
| `Module not found: '@/services/...'` | Path alias not configured | Check `tsconfig.json` `compilerOptions.paths` |
| Slow builds | Large node_modules | Clear `.vite/` cache: `rm -rf node_modules/.vite && npm install` |

## Performance Tips

1. **Code splitting**: Lazy-load route components
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   const Voting = lazy(() => import('./pages/Voting'));
   
   <Suspense fallback={<Loading />}>
     <Routes>
       <Route path="/" element={<Dashboard />} />
       <Route path="/vote" element={<Voting />} />
     </Routes>
   </Suspense>
   ```

2. **Memoization**: Prevent re-renders
   ```typescript
   import { memo } from 'react';
   
   export const MeetingCard = memo(({ meeting }) => (
     <div>{meeting.title}</div>
   ));
   ```

3. **Image optimization**: Use Vite plugin
   ```bash
   npm install vite-plugin-compression
   ```

4. **Bundling**: Check sizes
   ```bash
   npm run build
   npx vite-plugin-compression analyze
   ```

## Next Steps

1. **Read spec**: [spec.md](../../specs/001-meeting-requests/spec.md)
   - User stories P1-P3
   - Acceptance criteria
   - Feature priorities

2. **Study data model**: [data-model.md](../../specs/001-meeting-requests/data-model.md)
   - 8 entities
   - Relationships
   - Validation rules

3. **Review API contracts**: [contracts/](../../specs/001-meeting-requests/contracts/)
   - meetings.openapi.yaml (5 endpoints)
   - documents.openapi.yaml (7 endpoints)
   - votes.openapi.yaml (8 endpoints)

4. **Start P1 implementation** (Meeting Requests):
   - Create MeetingRequestForm component
   - Implement meetingService API calls
   - Test form submission

5. **Verify backend running**:
   ```bash
   cd ../backend
   dotnet run --project src/BoardMeeting.Api --launch-profile Development
   # Should be listening on https://localhost:5001 or http://localhost:5000
   ```

## Resources

- [React 18 Docs](https://react.dev)
- [Vite 7 Guide](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library](https://testing-library.com/)
- [MDN Web Docs](https://developer.mozilla.org/)
