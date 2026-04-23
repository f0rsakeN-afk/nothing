"use client";

import { StackClientApp } from "@stackframe/stack";

let stackClientApp: StackClientApp<true, string> | null = null;

export function getStackClientApp(): StackClientApp<true, string> {
  if (!stackClientApp) {
    stackClientApp = new StackClientApp({
      tokenStore: "nextjs-cookie",
      publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    });
  }
  return stackClientApp;
}
