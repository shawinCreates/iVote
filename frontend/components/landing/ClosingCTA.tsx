"use client";

import Link from "next/link";
import Image from "next/image";

export default function ClosingCTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-12 bg-deep">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/images/closing.jpeg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/85 via-deep/80 to-deep" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <div className="text-center">
          <h2 className="font-[var(--font-display)] font-black text-2xl md:text-3xl text-text-1 mb-4">
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
      <footer className="mt-10 border-t border-border-bright bg-deep/90 px-6 pb-2 pt-7 text-center text-sm text-text-1 backdrop-blur-sm">
        <nav aria-label="Footer navigation" className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px] font-medium">
          <a
            href="#features"
            className="text-text-1 underline-offset-4 transition-colors hover:text-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-text-1 underline-offset-4 transition-colors hover:text-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
          >
            How it works
          </a>
          <a
            href="#security"
            className="text-text-1 underline-offset-4 transition-colors hover:text-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
          >
            Security
          </a>
          <Link
            href="/login"
            className="text-text-1 underline-offset-4 transition-colors hover:text-cyan hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
          >
            Sign In
          </Link>
        </nav>
        <p className="text-[14px] font-medium text-text-1">
          <span className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-gold">iVote</span>
          <span className="mx-2 text-gold/80" aria-hidden="true">|</span>
          <span>Secure University Election Platform</span>
        </p>
        <p className="mt-2 text-xs text-text-2">
          © 2025 iVote. All rights reserved.
        </p>
      </footer>
    </section>
  );
}
