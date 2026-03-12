"use client";
import { useState } from "react";
import { FaLock, FaCheckCircle, FaEnvelope } from "react-icons/fa";
import { MdOutlinePassword } from "react-icons/md";
import TypewriterBanner from "../reusable_components/TypewriterBanner"; // adjust path if needed

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res: Response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "user", email, password }),
      });
      if (!res.ok) throw new Error(`Login failed: ${res.statusText}`);
      const data: { message: string } = await res.json();
      alert(data.message);
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };

  return (
    <div
      className="flex h-screen items-center justify-center text-foreground px-4"
      style={{
        backgroundImage: `
          radial-gradient(circle at center, #000 1px, transparent 1px),
          linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #dcdcdc 100%)
        `,
        backgroundSize: "20px 20px, cover",
      }}
    >
      <div className="relative w-full max-w-xl"> {/* not too wide, just right */}
        {/* Geometric patterned background block behind the form */}
        <div
          className="absolute inset-0 translate-x-6 translate-y-6 rounded-tr-[60px] rounded-bl-[60px]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 6px),
              linear-gradient(to bottom right, #000000, #333333)
            `,
            backgroundSize: "12px 12px, cover",
            zIndex: 0,
          }}
        ></div>

        {/* Main form */}
        <div
          className="relative w-full rounded-xl p-8 text-center animate-fadeIn
                     transition-all duration-500 hover:scale-[1.01]"
          style={{
            background: "linear-gradient(to bottom right, #ffffff, #f9f9f9)",
            border: "2px solid rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          {/* Decorative vote image with micro-interactions */}
          <img
            src="/vote.png"
            alt="Vote Emblem"
            className="absolute -top-10 -right-10 h-20 w-20 opacity-90
                       transition-transform duration-500 ease-in-out
                       animate-pulse hover:rotate-6 active:scale-95"
          />

          {/* University / Election Branding */}
          <img
            src="/university-logo.png"
            alt="University Logo"
            className="mx-auto mb-4 h-16 w-16 transition-transform duration-300 hover:scale-110 relative z-10"
          />

          <h2 className="mb-6 text-2xl font-semibold tracking-wide font-sans relative z-10">
            Student Login
          </h2>

          {/* Countdown Banner with Typewriter Effect */}
          <TypewriterBanner message="Voting closes in 2d 4h" speed={120} pause={1500} />

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            {/* Email Input */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 transition-all duration-300 focus-within:border-foreground focus-within:scale-105">
                <FaEnvelope className="mr-2" />
                <input
                  type="email"
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent p-2 text-sm placeholder-gray-400 outline-none font-sans"
                />
              </div>
              {errors.email && <span className="mt-1 text-xs text-red-600">{errors.email}</span>}
            </div>

            {/* Password Input */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 transition-all duration-300 focus-within:border-foreground focus-within:scale-105">
                <FaLock className="mr-2" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent p-2 text-sm placeholder-gray-400 outline-none font-sans"
                />
              </div>
              {errors.password && <span className="mt-1 text-xs text-red-600">{errors.password}</span>}
            </div>

            {/* Options */}
            <div className="flex justify-between text-xs">
              <label className="flex items-center space-x-1">
                <input type="checkbox" className="accent-black" /> 
                <span>Remember me</span>
              </label>
              <a href="#" className="flex items-center space-x-1 hover:underline">
                <MdOutlinePassword /> <span>Forgot Password?</span>
              </a>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              className="w-full rounded-lg bg-foreground py-2 font-semibold text-background transition-transform duration-300 hover:scale-105 hover:bg-black font-sans"
            >
              LOGIN & VOTE
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-6 text-sm relative z-10">
            Don’t have an account?{" "}
            <a href="/register" className="font-semibold hover:underline">
              Register
            </a>
          </p>

          {/* Trust Badge */}
          <div className="mt-4 text-xs font-bold relative z-10 flex items-center justify-center space-x-1">
            <FaCheckCircle className="text-green-600" />
            <span>Verified by Student Election Commission</span>
          </div>
        </div>
      </div>
    </div>
  );
}