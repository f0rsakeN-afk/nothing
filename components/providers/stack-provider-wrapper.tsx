"use client";

import { StackProvider, StackTheme } from "@stackframe/stack";
import { getStackClientApp } from "@/src/stack/client";

export function StackProviderWrapper({ children }: { children: React.ReactNode }) {
  const app = getStackClientApp();
  return (
    <StackProvider app={app}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  );
}
