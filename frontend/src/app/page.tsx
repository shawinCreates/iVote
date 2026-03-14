"use client";
import Link from "next/link";
import { FaUserPlus, FaSignInAlt, FaShieldAlt, FaCheckDouble, FaIdCard } from "react-icons/fa";
import { MdHowToVote } from "react-icons/md";
import TypewriterBanner from "@/app/reusable_components/TypewriterBanner";

export default function Home() {
  return (
    <div
      className="min-h-screen text-foreground flex flex-col font-sans relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at center, #000 1px, transparent 1px),
                          linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #dcdcdc 100%)`,
        backgroundSize: "20px 20px, cover",
      }}
    >
      <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
        <MdHowToVote className="h-64 w-64 text-black -rotate-12 animate-pulse" />
      </div>

      <nav className="flex items-center justify-between p-6 md:px-12 z-10 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/university-logo.png"
            alt="University Logo"
            className="h-12 w-12 transition-transform duration-300 hover:scale-110"
          />
          <h1 className="text-2xl font-bold tracking-tighter">iVote</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2 rounded-lg font-semibold hover:bg-foreground/10 transition-colors hidden sm:block">
            Login
          </Link>
          <Link href="/signup" className="px-5 py-2 rounded-lg bg-foreground text-background font-semibold transition-transform duration-300 hover:scale-105 hover:bg-black flex items-center gap-2 shadow-lg shadow-black/20">
            <FaUserPlus /> Sign Up
          </Link>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-center text-center p-6 z-10 w-full max-w-7xl mx-auto mt-12 md:mt-24">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/20 bg-foreground/5 mb-8 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:scale-105">
          <FaShieldAlt className="text-sm text-green-700" />
          <span className="text-xs font-semibold tracking-wide text-foreground/80">
            Verified by Student Election Commission
          </span>
        </div>

        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-black to-neutral-600 drop-shadow-sm">
          Shape Your Campus Future
        </h2>

        <div className="text-lg md:text-2xl font-medium text-foreground/70 mb-10 max-w-2xl h-16 flex items-start justify-center">
          <TypewriterBanner message="Secure, transparent, and seamless student elections at your fingertips." speed={60} pause={2500} />
        </div>

        <div className="flex flex-col sm:flex-row gap-5 mb-24 mt-4">
          <Link href="/signup" className="px-8 py-3 rounded-xl bg-foreground text-background font-semibold text-lg transition-transform duration-300 hover:scale-[1.03] hover:bg-black shadow-xl shadow-black/20 flex items-center justify-center gap-2">
            Get Started
          </Link>
          <Link href="/login" className="px-8 py-3 rounded-xl border-2 border-foreground/20 bg-transparent text-foreground font-semibold text-lg transition-all duration-300 hover:border-foreground hover:bg-foreground/5 flex items-center justify-center gap-2 group">
            <FaSignInAlt className="group-hover:translate-x-1 transition-transform" /> Faculty Login
          </Link>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-12 mb-20 text-left">
          <div className="bg-white/60 backdrop-blur-md border border-black/5 p-8 rounded-2xl shadow-xl shadow-black/5 transition-transform duration-300 hover:-translate-y-2 group">
            <div className="h-12 w-12 bg-black/5 rounded-xl flex items-center justify-center text-xl text-black mb-6 group-hover:scale-110 transition-transform">
              <FaIdCard />
            </div>
            <h3 className="text-xl font-bold mb-3">1. Fast Registration</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Sign up with your university ID securely in less than 2 minutes. We accept multiple ID formats with immediate processing.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-black/5 p-8 rounded-2xl shadow-xl shadow-black/5 transition-transform duration-300 hover:-translate-y-2 group">
            <div className="h-12 w-12 bg-black/5 rounded-xl flex items-center justify-center text-xl text-black mb-6 group-hover:scale-110 transition-transform">
              <FaCheckDouble />
            </div>
            <h3 className="text-xl font-bold mb-3">2. Identity Verification</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Dual-layer authentication ensures only active students and faculty can participate, maintaining 100% electoral integrity.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-black/5 p-8 rounded-2xl shadow-xl shadow-black/5 transition-transform duration-300 hover:-translate-y-2 group">
            <div className="h-12 w-12 bg-gradient-to-br from-black to-neutral-700 rounded-xl flex items-center justify-center text-xl text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <MdHowToVote />
            </div>
            <h3 className="text-xl font-bold mb-3">3. Cast Your Vote</h3>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Vote anytime from your mobile or PC. A tamper-proof digital ballot securely submits and registers your voice.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-foreground/10 text-sm text-foreground/50 z-10 backdrop-blur-sm bg-white/30">
        <p>© {new Date().getFullYear()} University Election Commission. All rights reserved.</p>
      </footer>
    </div>
  );
}