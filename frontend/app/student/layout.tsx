"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useEffect } from "react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
    if (!isLoading && isAdmin) router.push("/admin/dashboard");
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || !isAuthenticated) return <FullPageSpinner />;
  return <AppShell>{children}</AppShell>;
}
