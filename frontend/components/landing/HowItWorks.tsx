"use client";

import Reveal from "@/components/landing/Reveal";
import Image from "next/image";
import { FiMenu, FiUserCheck, FiZap, FiCheck } from "react-icons/fi";
import type { IconType } from "react-icons";

const STEPS: Array<{
  number: string;
  title: string;
  body: string;
  icon: IconType;
}> = [
  {
    number: "01",
    title: "Register",
    body: "Create your student account and upload your ID card.",
    icon: FiMenu,
  },
  {
    number: "02",
    title: "Verify",
    body: "Confirm your identity with a face and liveness check.",
    icon: FiUserCheck,
  },
  {
    number: "03",
    title: "Vote",
    body: "Cast an encrypted ballot, one student, one vote.",
    icon: FiZap,
  },
  {
    number: "04",
    title: "Results",
    body: "Verified tally published after the polls close.",
    icon: FiCheck,
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

        <Reveal className="mb-10">
          <div className="relative h-40 sm:h-52 lg:h-60 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-void">
            <Image
              src="/images/how%20does%20it%20work.jpeg"
              alt="Visual sequence of registration, identity verification, encrypted voting, and verified tally"
              fill
              sizes="(max-width: 767px) 100vw, 1200px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/75 via-transparent to-deep/10" />
          </div>
        </Reveal>

        <div className="relative">
          <div className="hidden lg:block absolute left-[12.5%] right-[12.5%] top-7 h-px bg-border" aria-hidden="true" />
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <Reveal key={step.number} delay={index * 0.1}>
                <div className="flex flex-col items-center gap-2 pt-2 text-center relative z-[1]">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-deep border border-cyan/20 flex items-center justify-center mb-2">
                    <span className="font-mono text-[24px]">{step.number}</span>
                  </div>
                  <StepIcon className="w-5 h-5 text-cyan mb-1" aria-hidden="true" />
                  <h3 className="font-[var(--font-display)] text-xs font-bold text-text-1 mb-1">{step.title}</h3>
                  <p className="text-sm text-text-2">{step.body}</p>
                </div>
              </Reveal>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
