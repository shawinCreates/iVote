"use client";

import Link from "next/link";
import Reveal from "@/components/landing/Reveal";

export default function ClosingCTA() {
  return (
    <section id="cta" className="py-12 bg-deep">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center">
          <h2 className="font-[var(--font-display)] font-black text-2xl md:text-3xl text-white mb-4">
            Ready to run your election?
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/login"
              className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-white bg-gold px-5 py-2.5 rounded-[var(--radius-md)] hover:bg-gold-bright hover:shadow-[0_0_20px_var(--color-gold-glow)] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-cyan border-cyan hover:bg-cyan-dim rounded-[var(--radius-md)] px-5 py-2.5 transition-all"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-text-3">
        <p>
          <span className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-gold">iVote</span>
          — Secure University Election Platform
        </p>
        <p className="mt-2">© 2025 iVote. All rights reserved.</p>
      </footer>
    </section>
  );
}