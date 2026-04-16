"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/hooks/use-auth-status";

interface OnboardingGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function OnboardingGuard({ children, fallback }: OnboardingGuardProps) {
  const router = useRouter();
  const { data: status, isLoading } = useAuthStatus();

  useEffect(() => {
    if (status && status.authenticated && !status.seenOnboarding) {
      router.push("/onboarding");
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status && !status.authenticated) {
    router.push("/login");
    return fallback || null;
  }

  if (status && status.authenticated && !status.seenOnboarding) {
    return fallback || null;
  }

  return <>{children}</>;
}
