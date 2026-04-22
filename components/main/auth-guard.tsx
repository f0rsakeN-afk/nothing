"use client";

import { usePathname } from "next/navigation";
import { useAuthStatusContext } from "./auth-status-provider";

const PUBLIC_ROUTES = ["/", "/home"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStatusContext();

  // Show nothing while checking auth to prevent flash
  if (isLoading) {
    return null;
  }

  // Middleware handles redirect, but we still gate rendering for extra safety
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}