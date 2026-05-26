"use client";

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }[size];
  return (
    <span
      role="status"
      className={`inline-block ${sz} rounded-full border-2 border-cyan/20 border-t-cyan animate-spin shrink-0`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-void/80 flex items-center justify-center z-[9999]">
      <Spinner size="lg" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block bg-gradient-to-r from-surface via-surface-2 to-surface bg-[length:400px_100%] animate-[shimmer_1.5s_infinite] rounded-[var(--radius-sm)] ${className}`}
    />
  );
}
