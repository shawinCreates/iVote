import { getToken, clearStore } from "./store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

const NO_REPLAY_PATHS = new Set(["/api/vote", "/api/voting/verify-face"]);

function isWakeStatus(status: number) {
  return status === 502 || status === 503 || status === 504;
}

function isReplayable(path: string) {
  return !NO_REPLAY_PATHS.has(path);
}

async function fetchWithWake(
  path: string,
  options: RequestInit
): Promise<Response> {
  const doFetch = () => fetch(buildUrl(path), options);
  let res: Response;
  try {
    res = await doFetch();
  } catch {
    const ok = await (await import("@/lib/backendHealth")).waitForBackend();
    if (!ok) throw new Error("The server is taking too long to wake.");
    if (!isReplayable(path)) throw new Error("Connection restored. Please try again.");
    return await doFetch();
  }
  if (isWakeStatus(res.status) && isReplayable(path)) {
    const { waitForBackend } = await import("@/lib/backendHealth");
    const ok = await waitForBackend();
    if (!ok) throw new Error("The server is taking too long to wake.");
    if (!isReplayable(path)) throw new Error("Connection restored. Please try again.");
    return await doFetch();
  }
  return res;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function extractError(err: any): string {
  if (err instanceof ApiError) return err.message;
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (err?.message && err.message !== "Network Error") return err.message;
  if (err?.message === "Network Error") return "Unable to reach the server.";
  return "An unexpected error occurred.";
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetchWithWake(path, { ...options, headers });

  if (res.status === 401) {
    clearStore();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail?.message ?? body?.detail ?? body?.msg ?? detail;
      if (Array.isArray(detail)) {
        detail = (detail as any[]).map((e: any) => e.msg || String(e)).join(". ");
      }
    } catch {}
    throw new ApiError(String(detail), res.status);
  }

  if (res.status === 204) return null as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) return res.json();
  return (await res.text()) as unknown as T;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetchWithWake(path, { ...options, headers });

  if (res.status === 401) {
    let message = "Invalid email or password.";
    try {
      const b = await res.json();
      message = b?.detail?.message ?? b?.detail ?? message;
    } catch {}
    clearStore();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.href = "/login";
    throw new ApiError(message, 401);
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      detail = b?.detail?.message ?? b?.detail ?? detail;
    } catch {}
    throw new ApiError(String(detail), res.status);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

function toFormData(obj: Record<string, any>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) fd.append(key, value);
  }
  return fd;
}

/* ── Auth ─── */
export const login = (email: string, password: string) =>
  apiFetch("/api/auth/login", { method: "POST", body: toFormData({ username: email, password }) });

export const registerStage1 = (tu_registration_number: string, email: string, password: string) =>
  apiFetch("/api/auth/register/stage1", { method: "POST", body: toFormData({ tu_registration_number, email, password }) });

export const registerStage2 = (stageToken: string, data: Record<string, any>) =>
  apiFetch("/api/auth/register/stage2", { method: "POST", headers: { Authorization: `Bearer ${stageToken}` }, body: toFormData(data) });

export const registerStage3 = (stageToken: string, idCardFile: File) => {
  const fd = new FormData();
  fd.append("id_card", idCardFile);
  return apiFetch("/api/auth/register/stage3", { method: "POST", headers: { Authorization: `Bearer ${stageToken}` }, body: fd });
};

export const registerStage4 = (stageToken: string, photoDataUri: string) =>
  apiFetch("/api/auth/register/stage4", { method: "POST", headers: { Authorization: `Bearer ${stageToken}` }, body: toFormData({ photo_data: photoDataUri }) });

export const resumeRegistration = (email: string, password: string) =>
  apiFetch("/api/auth/register/resume", { method: "POST", body: toFormData({ email, password }) });

export const forgotPassword = (email: string) =>
  apiFetch("/api/auth/forgot-password", { method: "POST", body: toFormData({ email }) });

export const resetPassword = (token: string, password: string) =>
  apiFetch("/api/auth/reset-password", { method: "POST", body: toFormData({ token, password }) });

export const getMe = () => api("/api/auth/me");
export const getNotifications = () => api("/api/auth/notifications");
export const markNotificationsRead = () => api("/api/auth/notifications/read", { method: "POST" });

/* ── Elections ─── */
export const getElections = () => api("/api/elections");
export const getActiveElections = () => api("/api/elections/active");
export const getHEPublicKey = (id: number) => api(`/api/elections/${id}/he-public-key`);
export const hasVoted = (electionId: number) => api(`/api/elections/${electionId}/has-voted`);
export const getElectionResults = (electionId: number) => api(`/api/elections/${electionId}/results`);

/* ── Candidates ─── */
export const getCandidatesForPosition = (positionId: number) => api(`/api/positions/${positionId}/candidates`);
export const getCandidatePhotoUrl = (candidateId: number) => `/api/candidates/${candidateId}/photo`;
export const getMyCandidacy = () => api("/api/my-candidacy");
export const applyForCandidacy = (positionId: number, manifesto: string, photoFile?: File | null) => {
  const fd = new FormData();
  fd.append("position_id", String(positionId));
  fd.append("manifesto", manifesto);
  if (photoFile) fd.append("photo", photoFile);
  return apiFetch("/api/candidates/apply", { method: "POST", body: fd });
};

/* ── Voting ─── */
export const verifyFace = (liveImageB64: string, livenessFrames: string[]) =>
  api("/api/voting/verify-face", { method: "POST", body: JSON.stringify({ live_image_b64: liveImageB64, liveness_frames: livenessFrames }) });

export const castVote = (ballot: any) =>
  api("/api/vote", { method: "POST", body: JSON.stringify(ballot) });

/* ── Admin ─── */
export const adminGetStats = () => api("/api/admin/stats");
export const adminGetElections = () => api("/api/admin/elections");
export const adminCreateElection = (data: any) => api("/api/admin/elections", { method: "POST", body: JSON.stringify(data) });
export const adminUpdateStatus = (electionId: number, status: string) =>
  api(`/api/admin/elections/${electionId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
export const adminLockCandidates = (electionId: number) =>
  api(`/api/admin/elections/${electionId}/lock-candidates`, { method: "POST" });
export const adminGetResults = (electionId: number) => api(`/api/admin/elections/${electionId}/results`);
export const adminGetAuditLogs = (skip = 0, limit = 100) => api(`/api/admin/audit-logs?skip=${skip}&limit=${limit}`);
export const adminGetElectionAuditLogs = (electionId: number) => api(`/api/admin/elections/${electionId}/audit-logs`);

export const getPendingStudents = () => api("/api/admin/students/pending");
export const getAllStudents = () => api("/api/admin/students/all");
export const verifyStudent = (id: number) => api(`/api/admin/students/${id}/verify`, { method: "POST" });
export const rejectStudent = (id: number, reason?: string | null) =>
  api(`/api/admin/students/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const adminGetPendingCandidates = (electionId?: number | null) =>
  api(electionId ? `/api/admin/candidates/pending?election_id=${electionId}` : "/api/admin/candidates/pending");
export const adminGetAllCandidates = (electionId?: number | null) =>
  api(electionId ? `/api/admin/candidates/all?election_id=${electionId}` : "/api/admin/candidates/all");
export const adminApproveCandidate = (id: number) => api(`/api/admin/candidates/${id}/approve`, { method: "POST" });
export const adminRejectCandidate = (id: number, reason?: string | null) =>
  api(`/api/admin/candidates/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const getStudentIdCardUrl = (id: number) => `/api/admin/students/${id}/id-card`;
export const getStudentPhotoUrl = (id: number) => `/api/admin/students/${id}/profile-photo`;

export async function openProtectedFile(url: string) {
  const token = getToken();
  const res = await fetch(buildUrl(url), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Could not load file");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

export async function adminExportAuditCSV() {
  const token = getToken();
  const res = await fetch(buildUrl("/api/admin/audit-logs/export"), { headers: { Authorization: `Bearer ${token}` } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}