"use client";
import { useState, useEffect } from "react";
import { getToken } from "@/lib/store";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const AVATAR_COLORS = [
  { bg: "bg-cyan/20",    text: "text-cyan"    },
  { bg: "bg-gold/20",    text: "text-gold"    },
  { bg: "bg-[#a78bfa]/20", text: "text-[#a78bfa]" },
  { bg: "bg-success/20", text: "text-success" },
  { bg: "bg-warning/20", text: "text-warning" },
  { bg: "bg-[#fb7185]/20", text: "text-[#fb7185]" },
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function toInitials(str: string) {
  const parts = str.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  url: string;
  alt: string;
  className?: string;
  initials?: string;
  contain?: boolean;
}

export default function ProtectedImage({ url, alt, className = "", initials = "?", contain = false }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    setSrc(null);
    setStatus("loading");
    if (!url) { setStatus("failed"); return; }

    let cancelled = false;
    let objectUrl: string | null = null;

    const token = getToken();
    const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

    fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setStatus("loaded");
      })
      .catch(() => { if (!cancelled) setStatus("failed"); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (status === "loading") {
    return <div className={`animate-pulse bg-surface-2 ${className}`} />;
  }

  if (status === "failed" || !src) {
    const label = toInitials(initials);
    const { bg, text } = avatarColor(initials);
    return (
      <div className={`flex items-center justify-center ${bg} ${text} font-[var(--font-display)] font-bold select-none leading-none ${className}`}
        style={{ fontSize: "clamp(10px, 35%, 22px)" }}>
        {label}
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={`${contain ? "object-contain" : "object-cover"} ${className}`} />
  );
}
