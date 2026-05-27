"use client";
import { useState } from "react";
import { FiLock } from "react-icons/fi";

export default function HEBadge({ fingerprint }: { fingerprint?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="relative inline-flex">
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-border rounded-[var(--radius-sm)] font-[var(--font-mono)] text-[11px] text-gold cursor-default select-none"
      >
        <FiLock size={11} />
        <span>Paillier HE</span>
        {fingerprint && <span className="text-text-3 ml-0.5">···{fingerprint.slice(-8)}</span>}
      </span>
      {hover && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-void border border-border rounded-[var(--radius-md)] px-3.5 py-2.5 text-xs text-text-2 whitespace-nowrap z-50 shadow-lg pointer-events-none leading-relaxed">
          Your ballot is encrypted in-browser before transmission.
          <br />The server only ever receives ciphertexts.
        </div>
      )}
    </div>
  );
}
