"use client";

import * as React from "react";

const COLOR_SCHEMES = ["civic", "studio", "dawn", "dusk", "code", "nebula", "ember", "aura", "pulse", "forge"] as const;
const STORAGE_KEY = "eryx-settings";

interface StoredSettings {
  colorScheme?: string;
  mode?: string;
}

function getStoredColorScheme(): string {
  if (typeof window === "undefined") return "civic";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: StoredSettings = JSON.parse(stored);
      return parsed.colorScheme || "civic";
    }
  } catch {}
  return "civic";
}

export function ColorSchemeManager() {
  const [colorScheme, setColorScheme] = React.useState<string>("civic");

  // Read from localStorage on mount
  React.useEffect(() => {
    setColorScheme(getStoredColorScheme());
  }, []);

  // Apply to <html> whenever colorScheme changes
  React.useEffect(() => {
    const root = document.documentElement;
    COLOR_SCHEMES.forEach((scheme) => root.classList.remove(scheme));
    root.classList.add(colorScheme);
  }, [colorScheme]);

  return null;
}
