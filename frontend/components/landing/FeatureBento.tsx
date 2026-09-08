"use client";

import Link from "next/link";
import Reveal from "@/components/landing/Reveal";

const BENTO_ITEMS = [
  {
    id: "encryption",
    title: "End-to-end ballot encryption",
    body:
      "Paillier homomorphic encryption keeps ballots as ciphertext from cast to count, with no plaintext ever exposed.",
    bg: "void",
    image: "https://picsum.photos/seed/ivote-bento-enc/800/500",
  },
  {
    id: "identity",
    title: "Face-verified identity",
    body: "Liveness + face match before casting ensures each vote belongs to a verified voter.",
    bg: "cyan",
  },
  {
    id: "audit",
    title: "Immutable audit trail",
    body:
      "Every system action is logged and exportable as a tamper-proof CSV for full transparency.",
    bg: "gold",
  },
  {
    id: "results",
    title: "Live results",
    body: "Verified tallies published after polls close, audit-ready and publicly verifiable.",
    bg: "gradient",
  },
];

function BentoCell({
  id,
  title,
  body,
  bg,
  image,
}: {
  id: string;
  title: string;
  body: string;
  bg: string;
  image?: string;
}) {
  const bgClasses =
    bg === "void"
      ? "bg-gradient-to-b from-void to-void/20"
      : bg === "cyan"
      ? "bg-cyan-dim"
      : bg === "gold"
      ? "bg-gold-dim"
      : "bg-gradient-to-b from-void to-void/30";

  return (
    <div
      className={`rounded-[var(--radius-lg)] overflow-hidden border border-border ${bgClasses} transition-colors hover:border-cyan/20`}
    >
      {image && (
        <img
          src={image}
          alt={`${id} background`}
          className="h-48 w-full object-cover"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded bg-cyan/20" />
          <span className="text-xs uppercase tracking-widest text-text-2">{title}</span>
        </div>
        <p className="text-sm text-text-3 line-clamp-2">{body}</p>
      </div>
    </div>
  );
}

export default function FeatureBento() {
  return (
    <section id="features" className="py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="font-[var(--font-display)] font-black text-3xl md:text-4xl text-white mb-8">
          Every vote, protected
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {BENTO_ITEMS.map((item) => (
            <Reveal key={item.id} delay={item.id === "encryption" ? 0 : item.id === "identity" ? 0.1 : item.id === "audit" ? 0.2 : 0.3}>
              <BentoCell
                id={item.id}
                title={item.title}
                body={item.body}
                bg={item.bg}
                image={item.image}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}