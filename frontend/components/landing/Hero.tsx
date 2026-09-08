"use client";

import Link from "next/link";
import Image from "next/image";
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

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full min-h-[calc(100dvh-4rem)] grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center pt-16 lg:pt-20 pb-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <div className="text-[10px] uppercase tracking-widest text-text-2 mb-4">
            Campus Election Platform
          </div>

          <h1 className="font-[var(--font-display)] font-black text-text-1 text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.04] mb-5">
            Democracy, <span className="text-gold">end-to-end</span> encrypted.
          </h1>

          <p className="text-base text-text-2 leading-relaxed max-w-[52ch] mb-7">
            iVote secures every campus ballot with homomorphic encryption and face verified identity from casting to final tally.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-void bg-gold px-5 py-2.5 rounded-[var(--radius-md)] hover:bg-gold-bright hover:shadow-[0_0_20px_var(--color-gold-glow)] transition-all active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="font-[var(--font-display)] font-bold text-[11px] uppercase tracking-wider text-cyan border border-cyan hover:bg-cyan-dim rounded-[var(--radius-md)] px-5 py-2.5 transition-all active:scale-[0.98]"
            >
              Create account
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl justify-self-end"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-xl)] border border-border bg-deep shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <Image
              src="/images/ivotehero.jpeg"
              alt="Abstract encrypted ballot moving through a secure civic voting network"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 46vw"
              className="object-cover object-[68%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/15 to-transparent" />
            <div className="absolute left-5 bottom-5 right-5 h-px bg-cyan/40" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-3 -left-3 hidden sm:block w-20 h-20 border-l border-b border-gold/50" aria-hidden="true" />
          <div className="absolute -top-3 -right-3 hidden sm:block w-20 h-20 border-r border-t border-cyan/50" aria-hidden="true" />
        </motion.div>
      </div>
    </section>
  );
}
