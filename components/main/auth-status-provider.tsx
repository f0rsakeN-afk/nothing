"use client";

import * as React from "react";
import { useAuthStatus } from "@/hooks/use-auth-status";

interface AuthStatusContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
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
    }),
    [authStatus?.authenticated, isLoading],
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