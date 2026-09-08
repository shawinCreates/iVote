"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import StarField from "@/components/shared/StarField";

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative min-h-[100dvh] bg-void overflow-hidden"
      aria-label="Hero"
    >
      <StarField />
      <div className="grain-overlay" />

      {/* Left copy */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full lg:grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center pt-24 pb-16">
        {/* Eyebrow */}
        <div className="text-[10px] uppercase tracking-widest text-text-2 mb-4">
          Campus Election Platform
        </div>

        {/* Headline */}
        <h1 className="font-[var(--font-display)] font-black text-white text-5xl md:text-6xl lg:text-7xl tracking-tight leading-none mb-4">
          Democracy, <span className="text-gold">end-to-end</span> encrypted.
        </h1>

        {/* Subtext */}
        <p className="font-base text-text-3 leading-relaxed mb-6">
          iVote secures every campus ballot with homomorphic encryption and face verified identity from casting to final tally
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
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

      {/* Right visual */}
      <div className="relative lg:absolute lg:inset-0 lg:w-full lg:h-[520px] overflow-hidden bg-deep rounded-[var(--radius-xl)]">
        {/* TODO: replace placeholder */}
        <img
          src="https://picsum.photos/seed/ivote-hero/1200/1400"
          alt="Hero image for iVote landing page"
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent rounded-[var(--radius-xl)]"
        />
      </div>
    </section>
  );
}