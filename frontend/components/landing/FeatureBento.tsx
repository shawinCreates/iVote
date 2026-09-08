"use client";

import Reveal from "@/components/landing/Reveal";
import Image from "next/image";
import { FiBarChart2, FiLock, FiShield, FiUserCheck } from "react-icons/fi";
import type { IconType } from "react-icons";

type BentoItem = {
  id: string;
  title: string;
  body: string;
  bg: "void" | "cyan" | "gold" | "gradient";
  span: string;
  icon: IconType;
  image?: string;
};

const BENTO_ITEMS: BentoItem[] = [
  {
    id: "encryption",
    title: "End-to-end ballot encryption",
    body:
      "Paillier homomorphic encryption keeps ballots as ciphertext from cast to count, with no plaintext ever exposed.",
    bg: "void",
    span: "md:col-span-4",
    icon: FiLock,
    image: "/images/featureencryption.jpeg",
  },
  {
    id: "identity",
    title: "Face-verified identity",
    body: "Liveness + face match before casting ensures each vote belongs to a verified voter.",
    bg: "cyan",
    span: "md:col-span-2",
    icon: FiUserCheck,
  },
  {
    id: "audit",
    title: "Immutable audit trail",
    body:
      "Every system action is logged and exportable as a tamper-proof CSV for full transparency.",
    bg: "gold",
    span: "md:col-span-2",
    icon: FiShield,
  },
  {
    id: "results",
    title: "Live results",
    body: "Verified tallies published after polls close, audit-ready and publicly verifiable.",
    bg: "gradient",
    span: "md:col-span-4",
    icon: FiBarChart2,
  },
];

function BentoCell({
  id,
  title,
  body,
  bg,
  icon: Icon,
  image,
}: {
  id: string;
  title: string;
  body: string;
  bg: BentoItem["bg"];
  icon: IconType;
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
      className={`h-full min-h-[250px] rounded-[var(--radius-lg)] overflow-hidden border border-border ${bgClasses} transition-colors hover:border-cyan/30 flex flex-col`}
    >
      {image && (
        <div className="relative h-48 shrink-0">
          <Image
            src={image}
            alt={`${title} visualization`}
            fill
            sizes="(max-width: 767px) 100vw, 66vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/60" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-[var(--radius-sm)] bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-cyan" aria-hidden="true" />
          </span>
          <span className="text-sm font-[var(--font-display)] font-bold text-text-1">{title}</span>
        </div>
        <p className="text-sm text-text-2 leading-relaxed max-w-[48ch]">{body}</p>
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
          {BENTO_ITEMS.map((item, index) => (
            <Reveal key={item.id} delay={index * 0.08} className={item.span}>
              <BentoCell
                id={item.id}
                title={item.title}
                body={item.body}
                bg={item.bg}
                icon={item.icon}
                image={item.image}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
