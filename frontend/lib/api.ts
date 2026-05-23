import { securityMiddleware, tokenValidator, SecurityHeaders, ErrorHandlingMiddleware } from './middleware';

// Use Next.js injected environment variables in client code.
const rawApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, '') : '';

if (typeof window !== 'undefined' && !API_BASE) {
  console.warn('[iVote] NEXT_PUBLIC_API_BASE_URL is not defined. Frontend API requests will use relative paths.');
}

function buildUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

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
  const url = buildUrl(path);
  
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
      const rawMessage = body?.detail || body?.message || body?.error || `HTTP ${response.status}`;
      const message = Array.isArray(rawMessage) ? rawMessage.map((e: any) => e.msg || String(e)).join('. ') : String(rawMessage);

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
    // Try to get actual status from the response if available
    const status = error?.status || error?.response?.status || 0;
    securityMiddleware.logResponse(startTime, options.method || 'GET', url, status, error?.message);
    throw error;
  }
}

export async function login(email: string, password: string) {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  const response = await fetch(buildUrl('/api/auth/login'), { method: 'POST', body: form });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || 'Login failed');
  }
  return response.json();
}

export async function register(formData: FormData) {
  const response = await fetch(buildUrl('/api/auth/register'), { method: 'POST', body: formData });
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

export async function fetchAllStudents(skip = 0, limit = 100) {
  return api(`/api/admin/students/all?skip=${skip}&limit=${limit}`);
}

export async function rejectStudent(id: number, reason = '') {
  return api(`/api/admin/students/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdminCandidates(electionId?: number) {
  const params = electionId ? `?election_id=${electionId}` : '';
  return api(`/api/admin/candidates/pending${params}`);
}

export async function fetchAllAdminCandidates(electionId?: number) {
  const params = electionId ? `?election_id=${electionId}` : '';
  return api(`/api/admin/candidates/all${params}`);
}

export async function approveCandidate(id: number) {
  return api(`/api/admin/candidates/${id}/approve`, { method: 'POST' });
}

export async function rejectCandidate(id: number, reason = '') {
  return api(`/api/admin/candidates/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function createElection(data: any) {
  return api('/api/admin/elections', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateElectionStatus(id: number, status: string) {
  return api(`/api/admin/elections/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function lockCandidates(id: number) {
  return api(`/api/admin/elections/${id}/lock-candidates`, { method: 'POST' });
}

export async function fetchAuditLogs(skip = 0, limit = 100) {
  return api(`/api/admin/audit-logs?skip=${skip}&limit=${limit}`);
}

export async function exportAuditLogs() {
  return api('/api/admin/audit-logs/export');
}

export async function fetchAdminElectionResults(electionId: number) {
  return api(`/api/admin/elections/${electionId}/results`);
}

export async function publishResults(electionId: number) {
  return api(`/api/admin/elections/${electionId}/publish-results`, { method: 'POST' });
}

export async function fetchElectionResults(electionId: number) {
  return api(`/api/elections/${electionId}/results`);
}

export async function fetchHECandidates(positionId: number) {
  return api(`/api/positions/${positionId}/candidates`);
}

export async function fetchMyCandidacy() {
  return api('/api/my-candidacy');
}

export async function applyForCandidacy(formData: FormData) {
  return api('/api/candidates/apply', {
    method: 'POST',
    body: formData,
  });
}

export async function castPlainVote(electionId: number, positions: { position_id: number; candidate_ids: number[] }[]) {
  return api('/api/vote/plain', {
    method: 'POST',
    body: JSON.stringify({ election_id: electionId, positions }),
  });
}

export async function checkHasVoted(electionId: number) {
  return api(`/api/elections/${electionId}/has-voted`);
}

export async function fetchHEPublicKey(electionId: number) {
  return api(`/api/elections/${electionId}/he-public-key`);
}
