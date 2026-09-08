"use client";
import { useState } from "react";
import Link from "next/link";
import { forgotPassword, extractError } from "@/lib/api";
import { Input } from "@/components/ui/FormControls";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import StarField from "@/components/shared/StarField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await forgotPassword(email); setSuccess(true); }
    catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative p-4">
      <StarField />
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-[var(--radius-xl)] p-7 relative z-10 animate-fade-up">
        <div className="text-center mb-5">
          <div className="font-[var(--font-display)] text-2xl font-black text-white mb-1">Secure <span className="text-gold">Online Voting System</span></div>
          <h1 className="font-[var(--font-display)] text-base font-bold text-white">Reset Password</h1>
          <p className="text-sm text-text-3 mt-1">Enter your email for a reset link.</p>
        </div>
        {success ? (
          <Alert type="success">Check your email for a password reset link.</Alert>
        ) : (
          <>
            {error && <Alert type="danger" className="mb-4">{error}</Alert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@tu.edu.np" required />
              <Button type="submit" isLoading={loading} className="w-full">Send Reset Link</Button>
            </form>
          </>
        )}
        <div className="text-center mt-5 text-sm text-text-3">
          <Link href="/login" className="text-cyan hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
