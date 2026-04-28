"use client";

import * as React from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";

interface AuthStatusContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId?: string;
  email?: string;
}

export const AuthStatusContext = React.createContext<AuthStatusContextValue>({
  isAuthenticated: false,
  isLoading: true,
});

export function AuthStatusProvider({ children }: { children: React.ReactNode }) {
  const { data: authStatus, isLoading } = useAuthStatus();

  // Memoize to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({
      isAuthenticated: !!authStatus?.authenticated,
      isLoading,
      userId: authStatus?.userId,
      email: authStatus?.email,
    }),
    [authStatus?.authenticated, authStatus?.userId, authStatus?.email, isLoading],
  );

  return (
    <AuthStatusContext.Provider value={value}>
      {children}
    </AuthStatusContext.Provider>
  );
}

export function useAuthStatusContext() {
  return React.useContext(AuthStatusContext);
}