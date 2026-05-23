import { securityMiddleware, tokenValidator, SecurityHeaders, ErrorHandlingMiddleware } from './middleware';

// Type assertion for Next.js environment variables
const API_BASE = (globalThis as any).process?.env?.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('ivote_token');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('ivote_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setStoredUser(user: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ivote_user', JSON.stringify(user));
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ivote_token', token);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('ivote_token');
  window.localStorage.removeItem('ivote_user');
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  
  // Validate URL security
  try {
    SecurityHeaders.sanitizeUrl(url);
  } catch (error) {
    throw new Error('Invalid URL provided');
  }

  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  
  // Validate token before making request
  if (token && !tokenValidator.validateToken(token)) {
    console.warn('[Security] Invalid token detected, clearing auth');
    clearAuth();
    throw new Error('Your session has expired. Please log in again.');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Add security headers
  const secureHeaders = SecurityHeaders.addSecurityHeaders(headers);

  // Log request start
  const startTime = securityMiddleware.logRequest(options.method || 'GET', url);

  try {
    const response = await fetch(url, { ...options, headers: secureHeaders });
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const body = contentType.includes('json') ? await response.json().catch(() => null) : null;
      const message = body?.detail || body?.message || `HTTP ${response.status}`;
      
      // Handle error with middleware
      ErrorHandlingMiddleware.handleError({ status: response.status, message }, url);
      
      // Check for auth-specific errors
      const authError = ErrorHandlingMiddleware.getAuthError({ status: response.status, message });
      if (authError) {
        if (response.status === 401) {
          clearAuth();
        }
        throw new Error(authError);
      }
      
      throw new Error(message);
    }

    // Log successful response
    securityMiddleware.logResponse(startTime, options.method || 'GET', url, response.status);

    if (contentType.includes('json')) {
      return await response.json();
    }

    return (await response.text()) as unknown as T;
  } catch (error: any) {
    // Log error response
    securityMiddleware.logResponse(startTime, options.method || 'GET', url, 0, error?.message);
    throw error;
  }
}

export async function login(email: string, password: string) {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  const response = await fetch(`${API_BASE}/api/auth/login`, { method: 'POST', body: form });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || 'Login failed');
  }
  return response.json();
}

export async function register(formData: FormData) {
  const response = await fetch(`${API_BASE}/api/auth/register`, { method: 'POST', body: formData });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || 'Registration failed');
  }
  return response.json();
}

export async function fetchNotifications() {
  return api('/api/auth/notifications');
}

export async function markNotificationsRead() {
  return api('/api/auth/notifications/read', { method: 'POST' });
}

export async function fetchAdminStats() {
  return api('/api/admin/stats');
}

export async function fetchPendingStudents() {
  return api('/api/admin/students/pending');
}

export async function fetchPendingCandidates() {
  return api('/api/admin/candidates/pending');
}

export async function fetchAdminElections() {
  return api('/api/admin/elections');
}

export async function verifyStudent(id: number) {
  return api(`/api/admin/students/${id}/verify`, { method: 'POST' });
}
