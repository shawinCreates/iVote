"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { extractError } from "@/lib/api";
import { Input, PasswordInput } from "@/components/ui/FormControls";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import StarField from "@/components/shared/StarField";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(isAdmin ? "/admin/dashboard" : "/student/dashboard");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name?.split(" ")[0] ?? ""}!`);
      router.push(user.role === "election_head" ? "/admin/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 bg-void items-center justify-center relative">
        <StarField />
        <div className="relative z-10 text-center px-12">
          <div className="font-[var(--font-display)] text-5xl font-black text-white mb-3">
            Secure<span className="text-gold"> Online Voting System</span>
          </div>
          <div className="max-w-[320px] mx-auto space-y-4 text-sm text-text-3 leading-relaxed">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan shrink-0" />
              <span>End-to-end ballot encryption</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
              <span>Face-verified identity</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-success shrink-0" />
              <span>Tamper-proof audit trail</span>
            </div>
          </div>
        </div>
        <div className="grain-overlay" />
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center bg-deep p-6 relative">
        <div className="grain-overlay" />
        <div className="w-full max-w-[380px] relative z-10">
          <div className="lg:hidden text-center mb-8">
            <div className="font-[var(--font-display)] text-3xl font-black text-white">
              i<span className="text-gold">Vote</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-text-3 font-[var(--font-display)] mt-1">
              Secure University Elections
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="font-[var(--font-display)] text-xl font-bold text-white tracking-wide">Sign In</h1>
            <p className="text-sm text-text-3 mt-1">Access your election dashboard</p>
          </div>

          {error && <Alert type="danger" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@tu.edu.np"
              required
              autoComplete="email"
            />
            <PasswordInput
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-cyan hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" isLoading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <div className="text-center mt-6">
            <span className="text-sm text-text-3">
              No account?{" "}
              <Link href="/register" className="text-gold font-semibold hover:underline">
                Register
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
