"use client";

import Reveal from "@/components/landing/Reveal";

export default function SecuritySection() {
  return (
    <section id="security" className="py-14">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-[1.2fr_0.9fr] gap-12 items-start">
          {/* Copy left */}
          <div>
            <h2 className="font-[var(--font-display)] font-black text-2xl md:text-3xl text-white mb-4">
              Your ballot, private by design
            </h2>
            <p className="text-base text-text-3 mb-6">
              iVote protects every ballot with layered security built on cryptography and verification.
            </p>
            <ul className="space-y-3 text-sm text-text-3">
              <li className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-cyan mr-1">●</span>
                <span>Paillier homomorphic encryption keeps ballots as ciphertext from cast to count.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-cyan mr-1">●</span>
                <span>Ballots are tallied without ever decrypting individual votes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-cyan mr-1">●</span>
                <span>Every system action lands in an immutable audit log, exportable as CSV.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-cyan mr-1">●</span>
                <span>Face and liveness checks bind each vote to a verified voter.</span>
              </li>
            </ul>
          </div>

          {/* Photo right */}
          <div className="relative rounded-[var(--radius-xl)] overflow-hidden border border-border">
            <img
              src="https://picsum.photos/seed/ivote-security/1600/1000"
              alt="iVote security illustration"
              className="w-full h-[300px] object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent rounded-[var(--radius-xl)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}