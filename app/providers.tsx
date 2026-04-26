"use client";

import React from "react";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WebHapticsProvider } from "@/components/providers/web-haptics-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <WebHapticsProvider>{children}</WebHapticsProvider>
    </QueryClientProvider>
  );
}
