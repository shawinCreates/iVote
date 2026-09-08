"use client";

import Nav from "./Nav";
import Hero from "./Hero";
import FeatureBento from "./FeatureBento";
import HowItWorks from "./HowItWorks";
import SecuritySection from "./SecuritySection";
import ClosingCTA from "./ClosingCTA";

export default function Landing() {
  return (
    <div className="min-h-screen bg-void text-text-1">
      <Nav />
      <main>
        <Hero />
        <FeatureBento />
        <HowItWorks />
        <SecuritySection />
        <ClosingCTA />
      </main>
    </div>
  );
}