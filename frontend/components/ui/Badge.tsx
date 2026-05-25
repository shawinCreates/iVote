"use client";

const BADGE_MAP: Record<string, string> = {
  draft: "bg-surface-2 text-text-3 border-border",
  nomination_open: "bg-gold-dim text-gold border-gold/30",
  nomination_closed: "bg-surface-2 text-text-2 border-border",
  voting_open: "bg-cyan-dim text-cyan border-cyan/30",
  closed: "bg-surface-2 text-muted border-border",
  results_published: "bg-success-dim text-success border-success/30",
  pending: "bg-warning-dim text-warning border-warning/30",
  approved: "bg-success-dim text-success border-success/30",
  rejected: "bg-danger-dim text-danger border-danger/30",
  candidate: "bg-cyan-dim text-cyan border-cyan/30",
  verified: "bg-success-dim text-success border-success/30",
  unverified: "bg-warning-dim text-warning border-warning/30",
};

const PULSE_STATUSES = new Set(["voting_open"]);

interface BadgeProps {
  status?: string;
  children?: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Badge({ status = "draft", children, dot, className = "" }: BadgeProps) {
  const colorClass = BADGE_MAP[status] ?? BADGE_MAP.draft;
  const label = children ?? status?.replace(/_/g, " ");
  const showPulse = PULSE_STATUSES.has(status) || dot;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold font-[var(--font-display)] tracking-wider uppercase whitespace-nowrap ${colorClass} ${className}`}>
      {showPulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />}
      {label}
    </span>
  );
}
