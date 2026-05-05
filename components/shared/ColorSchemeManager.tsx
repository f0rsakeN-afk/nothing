"use client";

import * as React from "react";

const COLOR_SCHEMES = ["civic", "studio", "dawn", "dusk", "code", "nebula", "ember", "aura", "pulse", "forge"] as const;
const STORAGE_KEY = "eryx-settings";
const COLOR_SCHEME_EVENT = "eryx-color-scheme-change";

function getStoredColorScheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.colorScheme === "string" && parsed.colorScheme.length > 0) {
        return parsed.colorScheme;
      }
    }
  } catch {}
  return "civic";
}

export function ColorSchemeManager() {
  const colorScheme = React.useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => onStoreChange();
      window.addEventListener(COLOR_SCHEME_EVENT, handler);
      return () => window.removeEventListener(COLOR_SCHEME_EVENT, handler);
    },
    getStoredColorScheme,
    () => "civic"
  );

  React.useEffect(() => {
    const root = document.documentElement;
    const classList = root.classList;
    COLOR_SCHEMES.forEach((scheme) => classList.remove(scheme));
    classList.add(colorScheme);
  }, [colorScheme]);

  return null;
}
