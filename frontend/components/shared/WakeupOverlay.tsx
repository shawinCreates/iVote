"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import StarField from "@/components/shared/StarField";
import { getWakeState, retryWake, subscribeWake } from "@/lib/backendHealth";

const STATUS_LINES = [
  "Contacting the voting server…",
  "Render free tier spins down when idle",
  "Waking the instance — usually under a minute",
  "Restoring your secure session…",
];

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function WakeupOverlay() {
  const [status, setStatus] = useState<"idle" | "waking" | "ready" | "failed">(
    () => getWakeState().status
  );
  const [elapsed, setElapsed] = useState(() => getWakeState().elapsed);
  const [lineIdx, setLineIdx] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const unsub = subscribeWake((s) => {
      setStatus(s.status);
      setElapsed(s.elapsed);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (status !== "waking") return;
    const t = window.setInterval(() => {
      setLineIdx((l) => (l + 1) % STATUS_LINES.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [status]);

  const failed = status === "failed";

  return (
    <div
      key="wake"
      className="fixed inset-0 z-[70] bg-void flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <StarField className="pointer-events-none" />
      <div className="grain-overlay" />
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
          {!reduce && !failed && (
            <>
              <span className="absolute inset-0 rounded-full border border-cyan/40 animate-ping" />
              <span className="absolute inset-3 rounded-full border border-cyan/25 animate-ping [animation-delay:0.6s]" />
            </>
          )}
          <span className="w-4 h-4 rounded-full bg-cyan shadow-[0_0_20px_var(--color-cyan-glow)]" />
        </div>

        <div className="font-[var(--font-display)] text-2xl font-black text-white">
          i<span className="text-gold">Vote</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-text-3 font-[var(--font-display)] mt-1 mb-6">
          Secure University Elections
        </div>

        <div className="mb-4">
          {!failed
            ? (/* rotating status lines via AnimatePresence */ null)
            : (
              <p
                className="text-sm text-text-2 min-h-[44px] flex items-center justify-center"
              >
                {STATUS_LINES[lineIdx]}
              </p>
            )}
        </div>

        <div className="mt-2 font-mono text-[11px] tracking-[0.2em] text-cyan tabular-nums">
          {failed ? "CONNECTION TIMED OUT" : `CONNECTING · ${formatElapsed(elapsed)}`}
        </div>

        {failed && (
          <button
            onClick={() => retryWake()}
            className="mt-6 inline-flex items-center justify-center gap-2 border border-gold text-gold px-6 py-2.5 rounded-[var(--radius-md)] font-[var(--font-display)] text-[11px] font-bold uppercase tracking-wider hover:bg-gold-dim transition-all active:scale-[0.98]"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}