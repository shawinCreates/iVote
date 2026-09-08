"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword, extractError } from "@/lib/api";
import { PasswordInput } from "@/components/ui/FormControls";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import StarField from "@/components/shared/StarField";
import toast from "react-hot-toast";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try { await resetPassword(token, password); toast.success("Password reset!"); router.push("/login"); }
    catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  return (
    <>
      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput label="New Password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} showStrength required />
        <PasswordInput label="Confirm Password" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" isLoading={loading} className="w-full">Reset Password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative p-4">
      <StarField />
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-[var(--radius-xl)] p-7 relative z-10 animate-fade-up">
        <div className="text-center mb-5">
          <div className="font-[var(--font-display)] text-2xl font-black text-white mb-1">i<span className="text-gold">Vote</span></div>
          <h1 className="font-[var(--font-display)] text-base font-bold text-white">Set New Password</h1>
        </div>
        <Suspense fallback={<div className="text-text-3 text-center py-4">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
