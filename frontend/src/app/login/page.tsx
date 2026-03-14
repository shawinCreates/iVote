"use client";
import { useState } from "react";
import { FaLock, FaEnvelope, FaCheckCircle } from "react-icons/fa";
import TypewriterBanner from "@/app/reusable_components/TypewriterBanner";

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) newErrors.email = "Email is required.";
    else if (!emailRegex.test(email)) newErrors.email = "Enter a valid email.";
    if (!password) newErrors.password = "Password is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);
      const data = await res.json();
      alert(`Login successful! Welcome back.`);
      console.log("Login response:", data);

      setEmail(""); setPassword(""); setErrors({});
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  }; return (
    <div className="flex min-h-screen items-center justify-center text-foreground px-4"
      style={{
        backgroundImage: `radial-gradient(circle at center, #000 1px, transparent 1px),
                          linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #dcdcdc 100%)`,
        backgroundSize: "20px 20px, cover",
      }}
    >
      <div className="relative w-full max-w-md">
        {/* Pattern block */}
        <div className="absolute inset-0 translate-x-6 translate-y-6 rounded-tr-[60px] rounded-bl-[60px]"
          style={{
            backgroundImage: `repeating-linear-gradient(
                                45deg,
                                rgba(255,255,255,0.1) 0px,
                                rgba(255,255,255,0.1) 2px,
                                transparent 2px,
                                transparent 6px
                              ),
                              linear-gradient(to bottom right, #000000, #333333)`,
            backgroundSize: "12px 12px, cover",
            zIndex: 0,
          }}
        ></div>        {/* Form */}
        <div className="relative w-full rounded-xl p-8 text-center transition-all duration-500 hover:scale-[1.01]"
          style={{
            background: "linear-gradient(to bottom right, #ffffff, #f9f9f9)",
            border: "2px solid rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          <img src="/vote.png" alt="Vote Emblem" className="absolute -top-10 -right-10 h-20 w-20 opacity-90 animate-pulse" />
          <img src="/university-logo.png" alt="University Logo" className="mx-auto mb-4 h-16 w-16 transition-transform duration-300 hover:scale-110" />

          <h2 className="mb-4 text-2xl font-semibold tracking-wide">Faculty Login</h2>
          <TypewriterBanner message="Access your voting dashboard" speed={120} pause={1500} />

          <form onSubmit={handleLogin} className="space-y-6 mt-6">
            {/* Email */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground">
                <FaEnvelope className="mr-2" />
                <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.email && <span className="text-xs text-red-600 mt-1">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground">
                <FaLock className="mr-2" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.password && <span className="text-xs text-red-600 mt-1">{errors.password}</span>}
            </div>

            {/* Submit */}
            <button type="submit" className="w-full rounded-lg bg-foreground py-2 font-semibold text-background transition-transform duration-300 hover:scale-105 hover:bg-black">
              LOGIN
            </button>
          </form>

          {/* Signup Link */}
          <p className="mt-6 text-sm">
            Don’t have an account?{" "}
            <a href="/signup" className="font-semibold hover:underline">
              Sign Up
            </a>
          </p>

          {/* Trust Badge */}
          <div className="mt-4 text-xs font-bold flex items-center justify-center gap-2">
            <FaCheckCircle className="text-green-600" />
            Verified by Student Election Commission
          </div>
        </div>
      </div>
    </div>
  );
}