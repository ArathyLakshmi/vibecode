# Azure AD Authentication Setup

## Problem
After clicking "Sign In", you're redirected to Azure AD, authenticate successfully, but then get sent back to the login page instead of the home page.

## Root Cause
1. **Missing Active Account**: After Azure AD redirects back, MSAL needs to explicitly set the active account
2. **Redirect URI Mismatch**: The redirect URI in your Azure AD app registration might not match `http://localhost:5173`

## Fixes Applied

### 1. Updated `main.jsx`
- Added code to set the active account after processing the redirect response from Azure AD
- This ensures `useIsAuthenticated()` returns `true` immediately after sign-in

### 2. Created `.env.local`
- Added explicit MSAL configuration with proper redirect URI
- **You MUST update this file with your Azure AD app registration details**

## Required Actions

### Step 1: Update `.env.local`
Edit `src/client/.env.local` and replace these values:

```bash
VITE_MSAL_CLIENT_ID=your-actual-client-id-here
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
VITE_MSAL_REDIRECT_URI=http://localhost:5173
```

### Step 2: Configure Azure AD App Registration
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your app
3. Go to **Authentication** → **Platform configurations** → **Single-page application**
4. Add redirect URI: `http://localhost:5173`
5. Enable **ID tokens** and **Access tokens**
6. Click **Save**

### Step 3: Restart Dev Server
Since we updated environment variables:

```powershell
# Stop the current dev server (Ctrl+C in the terminal)
# Or kill the process
Stop-Process -Id 29804 -Force

# Start it again
cd src/client
npm run dev -- --port 5173
```

### Step 4: Test
1. Navigate to http://localhost:5173
2. Click "Sign In"
3. Authenticate with Azure AD
4. You should be redirected back to the home page (not login page)

## Common Issues

### Still redirecting to login?
- **Check browser console** for MSAL errors
- **Verify redirect URI** in Azure AD matches exactly: `http://localhost:5173` (no trailing slash)
- **Clear browser cache** and local storage
- **Check tenant ID** in VITE_MSAL_AUTHORITY is correct

### "AADSTS50011: The reply URL does not match"
- The redirect URI in your code doesn't match what's configured in Azure AD
- Add `http://localhost:5173` to your Azure AD app registration's redirect URIs

### Infinite redirect loop?
- Clear browser local storage: `localStorage.clear()` in browser console
- Check that you're not in an Azure AD tenant that requires additional permissions

## Debugging

Check browser console logs - you should see:
```
Auth: initializing MSAL and handling redirect promise
Auth: MSAL initialized successfully
Auth: handleRedirectPromise resolved
Auth: current MSAL accounts
Auth: setting active account
Login: useEffect accounts/isAuthenticated
Login: setting active account from accounts[0]
```

If accounts array is empty after redirect, the redirect wasn't processed correctly.
