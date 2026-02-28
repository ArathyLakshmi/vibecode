import { PublicClientApplication } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || "YOUR_CLIENT_ID";
const authority = import.meta.env.VITE_MSAL_AUTHORITY || "https://login.microsoftonline.com/common";
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin;
const rawScopes = import.meta.env.VITE_MSAL_SCOPES || "";
const scopes = rawScopes ? rawScopes.split(',').map(s => s.trim()).filter(Boolean) : ["openid", "profile", "offline_access"];

const msalConfig = {
  auth: {
    clientId,
    authority,
    redirectUri
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes
};

export const logoutRequest = {
  postLogoutRedirectUri: `${redirectUri}/login`
};

export const pca = new PublicClientApplication(msalConfig)

export default pca
