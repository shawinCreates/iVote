"use client";

import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import { useState } from "react";
import Reveal from "@/components/landing/Reveal";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
];

export default function Nav() {
  const [mobile, setMobile] = useState(false);

  return (
    <header className="border-b border-border bg-deep/80 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-display)] font-black text-2xl text-white tracking-wider">
            i<span className="text-gold">Vote</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.25em] text-text-3 font-body font-medium">
            University Elections
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-text-2 hover:text-white transition-colors cursor-pointer"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-gold hover:bg-gold-bright hover:shadow-[0_0_20px_var(--color-gold-glow)] px-4 py-2 rounded-[var(--radius-md)] transition-all"
          >
            Sign In
          </Link>
        </nav>

        <button
          className="md:hidden flex items-center gap-2 p-2 rounded-[var(--radius-md)] bg-border hover:bg-border-bright transition-colors"
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? <FiX size={20} className="text-cyan" /> : <FiMenu size={20} className="text-cyan" />}
        </button>
      </div>

      {mobile && (
        <div className="mt-6 max-w-full border-t border-border bg-deep px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] text-text-2 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-gold"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-cyan font-semibold hover:underline"
          >
            Create account
          </Link>
        </div>
      )}
    </header>
  );
}