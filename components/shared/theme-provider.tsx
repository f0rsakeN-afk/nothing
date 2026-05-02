"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const THEMES = [
  "system",
  "light",
  "dark",
  "theme-1",
  "theme-2",
  "theme-3",
  "theme-4",
  "theme-5",
  "theme-6",
  "theme-7",
  "theme-8",
  "theme-9",
  "theme-10",
] as string[];

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props} themes={THEMES}>
      {children}
    </NextThemesProvider>
  );
}
