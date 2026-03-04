# User Management Components

This directory contains React components for user management functionality.

## Components

### AddUserDialog

Modal dialog for creating new users (admin-only feature).

**Import:**
```jsx
import AddUserDialog from './users/AddUserDialog'
```

**Usage:**
```jsx
const [showDialog, setShowDialog] = useState(false)

<button onClick={() => setShowDialog(true)}>Add User</button>
<AddUserDialog 
  open={showDialog} 
  onClose={() => setShowDialog(false)} 
/>
```

**Props:**
- `open` (boolean, required): Controls dialog visibility
- `onClose` (function, required): Callback when dialog should close

**Form Fields:**
- **Name**: Required text field for user's full name
- **Email**: Required email field (must contain `@`, unique in database)
- **Password**: Required password field with strength validation:
  - Minimum 8 characters
  - At least 1 uppercase letter  
  - At least 1 lowercase letter
  - At least 1 number

**API Integration:**
- Endpoint: `POST /api/users`
- Request Body: `{ name, email, password }`
- Success Response: `201 Created` with UserResponse
- Error Responses:
  - `409 Conflict`: Duplicate email
  - `400 Bad Request`: Validation errors

**Features:**
- Client-side validation with real-time feedback
- Server-side error handling
- Loading state during submission
- Success message with auto-close (1.5s)
- Form reset on close
- Keyboard navigation support
- WCAG 2.1 AA accessible

**Validation Rules:**

| Field    | Rule                                                   | Error Message                                          |
|----------|--------------------------------------------------------|--------------------------------------------------------|
| Name     | Required, non-empty                                    | "Name is required"                                     |
| Email    | Required, must contain `@`                             | "Email is required" / "Invalid email format"           |
| Password | Min 8 chars, 1 uppercase, 1 lowercase, 1 number        | "Password must be at least 8 characters..." (detailed) |

**Accessibility:**
- Dialog role with proper ARIA attributes
- Keyboard support (Tab, Enter, Escape)
- Focus management
- Screen reader friendly error messages
- Form field labels and hints

**Security:**
- Password never logged or exposed
- HTTPS recommended for production
- CSRF protection via framework defaults

## File Structure

```
users/
├── AddUserDialog.jsx       # Main dialog component
└── README.md               # This file
```

## Dependencies

- `@fluentui/react-components` ^9.72.11
- `@fluentui/react-icons` ^2.0.318
- React 18.2.0

## Testing

- **E2E Tests**: `src/client/e2e/tests/add-user.spec.ts`
- **Integration Tests**: Backend API tested in `src/server/MeetingRequests.IntegrationTests/`

## Related Files

- **Backend Controller**: `src/server/Controllers/UsersController.cs`
- **User Entity**: `src/server/Models/User.cs`
- **DTOs**: `src/server/Models/CreateUserRequest.cs`, `UserResponse.cs`
- **Navigation Integration**: `src/client/src/components/shell/TopNav.jsx`

## Future Enhancements

- [ ] Edit user functionality
- [ ] Delete user functionality
- [ ] User list/search
- [ ] Password reset capability
- [ ] Bulk user import
- [ ] Role assignment
- [ ] Email verification

---

**Feature**: 002-add-user-link  
**Status**: ✅ Complete  
**Last Updated**: February 14, 2026
