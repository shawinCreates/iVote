"use client";

import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import { FiMenu, FiUserCheck, FiZap, FiCheck } from "react-icons/fi";

const STEPS = [
  {
    number: "01",
    title: "Register",
    body: "Create your student account and upload your ID card.",
  },
  {
    number: "02",
    title: "Verify",
    body: "Confirm your identity with a face and liveness check.",
  },
  {
    number: "03",
    title: "Vote",
    body: "Cast an encrypted ballot — one student, one vote.",
  },
  {
    number: "04",
    title: "Results",
    body: "Verified tally published after the polls close.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 bg-deep">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-[var(--font-display)] font-black text-2xl md:text-3xl text-white mb-3">
            From signup to final tally
          </h2>
          <p className="text-base text-text-3 max-w-md mx-auto">
            A quick look at how iVote secures every vote from start to finish.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <Reveal key={step.number} delay={Number(step.number.replace("0", "")) * 0.1}>
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-2">
                  <span className="font-mono text-[24px]">{step.number}</span>
                </div>
                <icon className="w-5 h-5 text-cyan mb-1">{step.title === "Register" ? FiMenu : step.title === "Verify" ? FiUserCheck : step.title === "Vote" ? FiZap : FiCheck}</icon>
                <h3 className="font-[var(--font-display)] text-xs font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-text-3 line-clamp-1">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}