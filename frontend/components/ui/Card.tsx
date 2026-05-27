"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "gold" | "cyan";
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", glow, hover, onClick }: CardProps) {
  const hoverClass = glow === "gold"
    ? "hover:border-gold hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_var(--color-gold-glow)]"
    : glow === "cyan"
    ? "hover:border-cyan hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_var(--color-cyan-glow)]"
    : hover ? "hover:border-border-bright" : "";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-surface border border-border rounded-[var(--radius-lg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
        overflow-hidden transition-all duration-200 ${hover || onClick ? "cursor-pointer hover:-translate-y-0.5" : ""} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
      <div>
        <div className="font-[var(--font-display)] text-[13px] font-bold text-white tracking-wider uppercase">
          {title}
        </div>
        {subtitle && <div className="text-xs text-text-3 mt-0.5">{subtitle}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
