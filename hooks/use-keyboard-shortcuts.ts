"use client";

import { useEffect, useCallback } from "react";

interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur
        if (e.key === "Escape" && target.blur) {
          target.blur();
          return;
        }
        return;
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcut keys
export const SHORTCUT_KEYS = {
  NEW_CHAT: "n",
  SEARCH: "k",
  SETTINGS: ",",
  ESCAPE: "Escape",
  ENTER: "Enter",
  SLASH: "/",
} as const;