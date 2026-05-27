import { formatDistanceToNow, format, parseISO, differenceInSeconds, isValid } from "date-fns";

function parseDate(iso: string | Date | undefined | null): Date | null {
  if (!iso) return null;
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export const fmtDate = (iso?: string | Date | null) => {
  const d = parseDate(iso ?? null);
  return d ? format(d, "d MMM yyyy") : "—";
};

export const fmtDateTime = (iso?: string | Date | null) => {
  const d = parseDate(iso ?? null);
  return d ? format(d, "d MMM yyyy, HH:mm") : "—";
};

export const fmtRelative = (iso?: string | Date | null) => {
  const d = parseDate(iso ?? null);
  if (!d) return "—";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
};

export const timeRemaining = (endIso?: string | Date | null) => {
  const d = parseDate(endIso ?? null);
  if (!d) return "Unknown";
  const totalSecs = differenceInSeconds(d, new Date());
  if (totalSecs <= 0) return "Ended";
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
};

export const initials = (name?: string) => {
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
  n == null ? "—" : Number(n).toLocaleString();

export const fmtPercent = (n?: number | null, decimals = 1) =>
  n == null ? "—" : `${Number(n).toFixed(decimals)}%`;
