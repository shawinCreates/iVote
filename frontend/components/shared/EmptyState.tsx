"use client";

export default function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="font-[var(--font-display)] text-[15px] font-bold text-white mb-2 tracking-wider">{title}</div>
      <div className="text-sm text-text-3 mb-5 max-w-[340px] mx-auto leading-relaxed">{message}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
