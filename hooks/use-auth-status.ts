/**
 * Auth Status Hook using TanStack Query
 * Caches auth status to avoid repeated fetches on in-app navigation
 */

import { useQuery } from "@tanstack/react-query";

export interface AuthStatus {
  authenticated: boolean;
  email?: string;
  seenOnboarding?: boolean;
  isActive?: boolean;
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status");
  if (!res.ok) {
    throw new Error("Failed to fetch auth status");
  }
  return res.json();
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: fetchAuthStatus,
    staleTime: 60_000, // 1 minute - cache auth status for in-app navigations
    refetchOnWindowFocus: false,
    placeholderData: (prev: AuthStatus | undefined) => prev,
  });
}
