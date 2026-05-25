"use client";
import { useState, useEffect } from "react";
import { timeRemaining } from "@/lib/formatters";

export default function ElectionCountdown({ endTime, label = "Time Remaining" }: { endTime?: string; label?: string }) {
  const [remaining, setRemaining] = useState(() => timeRemaining(endTime));

  useEffect(() => {
    const tick = () => setRemaining(timeRemaining(endTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const ended = remaining === "Ended";

  return (
    <div>
      <div className={`font-[var(--font-mono)] text-[22px] font-medium tracking-widest ${ended ? "text-danger" : "text-white"}`}>
        {remaining}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-3 mt-0.5 font-[var(--font-display)]">{label}</div>
    </div>
  );
}
