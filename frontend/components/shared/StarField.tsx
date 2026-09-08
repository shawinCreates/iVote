"use client";

import { useEffect, useState } from "react";

function seededValue(index: number, salt: number) {
  const value = Math.sin((index + 1) * (salt + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  top: seededValue(i, 1) * 100,
  left: seededValue(i, 2) * 100,
  size: seededValue(i, 3) < 0.7 ? 1 : 2,
  delay: seededValue(i, 4) * 4,
  dur: 2.5 + seededValue(i, 5) * 3,
}));

export default function StarField({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // This is decorative only. Rendering it after hydration avoids making the
  // page's initial HTML depend on browser-side style serialization.
  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`star-field absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`.trim()}
    >
      {STARS.map((s) => (
        <div
          key={s.id}
          className="star-dot absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: 0.15,
            animation: `twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
