/**
 * Auth API — Login, Signup, Token management.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'asyncpulse_access_token';
const REFRESH_KEY = 'asyncpulse_refresh_token';
const USER_KEY = 'asyncpulse_user';

/**
 * Save tokens + user to localStorage.
 */
export function saveAuth({ access, refresh, user }) {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get current access token.
 */
export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get current user (from localStorage).
 */
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear all auth data (logout).
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Login: email + password → tokens.
 */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.error || 'Login failed');
  }

  return data; // { access, refresh }
}

/**
 * Register: new user signup.
 */
export async function register({ username, email, password }) {
  const res = await fetch(`${API_BASE}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
      data.detail ||
      Object.values(data).flat().join(', ') ||
      'Registration failed'
    );
  }

  return data;
}

/**
 * Check if user is currently logged in.
 */
export function isLoggedIn() {
  return !!getAccessToken();
}