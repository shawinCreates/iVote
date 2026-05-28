import { formatDistanceToNow, parseISO, differenceInSeconds, isValid } from "date-fns";

// Nepal Standard Time — UTC+5:45 (Asia/Kathmandu)
const NPT = "Asia/Kathmandu";
const NPT_OFFSET = "+05:45";

function parseDate(iso: string | Date | undefined | null): Date | null {
  if (!iso) return null;
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Format using Intl in Nepal timezone. */
function _nptFmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: NPT, ...opts }).format(d);
}

// ── Public display formatters ─────────────────────────────────────────────────

/** "26 May 2026" */
export const fmtDate = (iso?: string | Date | null): string => {
  const d = parseDate(iso ?? null);
  if (!d) return "—";
  return _nptFmt(d, { day: "numeric", month: "short", year: "numeric" });
};

/** "26 May 2026, 6:38 PM NPT" */
export const fmtDateTime = (iso?: string | Date | null): string => {
  const d = parseDate(iso ?? null);
  if (!d) return "—";
  const datePart = _nptFmt(d, { day: "numeric", month: "short", year: "numeric" });
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: NPT,
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart}, ${timePart} NPT`;
};

/** "2 hours ago", "in 3 days" — relative to now (no TZ conversion needed) */
export const fmtRelative = (iso?: string | Date | null): string => {
  const d = parseDate(iso ?? null);
  if (!d) return "—";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
};

/** Countdown string — pure time difference, no TZ conversion needed */
export const timeRemaining = (endIso?: string | Date | null): string => {
  const d = parseDate(endIso ?? null);
  if (!d) return "Unknown";
  const totalSecs = differenceInSeconds(d, new Date());
  if (totalSecs <= 0) return "Ended";
  const days    = Math.floor(totalSecs / 86400);
  const hours   = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs    = totalSecs % 60;
  if (days > 0)  return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
};

// ── NPT ↔ datetime-local conversions (for <input type="datetime-local">) ──────

/**
 * Convert a datetime-local string the admin typed (treated as Nepal Time)
 * into a UTC ISO-8601 string ready for the API.
 *
 * Example: "2026-06-01T09:00" (NPT)  →  "2026-06-01T03:15:00.000Z" (UTC)
 */
export function nptToISO(localValue: string): string {
  if (!localValue) return "";
  // Appending "+05:45" makes the browser parse it as NPT and gives correct UTC
  return new Date(localValue + NPT_OFFSET).toISOString();
}

/**
 * Convert a UTC ISO string back to datetime-local format in Nepal Time,
 * so inputs are pre-filled correctly when editing an election.
 *
 * Example: "2026-06-01T03:15:00Z" (UTC)  →  "2026-06-01T09:00" (NPT)
 */
export function isoToNPTLocal(iso: string): string {
  const d = parseDate(iso);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NPT,
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // Some environments emit "24" for midnight — normalise to "00"
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

export const initials = (name?: string): string => {
  if (!name?.trim()) return "??";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
};

export const photoUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return "/" + path.replace(/^\/+/, "");
};

const ELECTION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  nomination_open: "Nominations Open",
  nomination_closed: "Nominations Closed",
  voting_open: "Voting Open",
  closed: "Closed",
  results_published: "Results Published",
};

export const electionStatusLabel = (status?: string) =>
  ELECTION_STATUS_LABELS[status ?? ""] ?? status ?? "—";

const STRENGTH_LEVELS = [
  { label: "", color: "text-muted" },
  { label: "Very Weak", color: "text-danger" },
  { label: "Weak", color: "text-orange-500" },
  { label: "Fair", color: "text-warning" },
  { label: "Good", color: "text-cyan" },
  { label: "Strong ✓", color: "text-success" },
];

export const passwordStrength = (password: string) => {
  if (!password) return { score: 0, ...STRENGTH_LEVELS[0] };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return { score, ...STRENGTH_LEVELS[score] };
};

export const fmtNumber = (n?: number | null) =>
  n == null ? "-" : Number(n).toLocaleString();

export const fmtPercent = (n?: number | null, decimals = 1) =>
  n == null ? "-" : `${Number(n).toFixed(decimals)}%`;
