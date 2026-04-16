"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts, SHORTCUT_KEYS } from "@/hooks/use-keyboard-shortcuts";

interface ShortcutHandlerProps {
  onNewChat?: () => void;
}

export function ShortcutHandler({ onNewChat }: ShortcutHandlerProps) {
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts = [
    {
      key: SHORTCUT_KEYS.SLASH,
      action: () => {
        // Focus chat input
        const input = document.querySelector<HTMLTextAreaElement>("textarea");
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      description: "Focus chat",
    },
    {
      key: SHORTCUT_KEYS.NEW_CHAT,
      meta: true,
      action: () => {
        router.push("/home");
      },
      description: "New chat",
    },
    {
      key: SHORTCUT_KEYS.SEARCH,
      meta: true,
      action: () => {
        // Could open search dialog
        setShowShortcuts(true);
        setTimeout(() => setShowShortcuts(false), 2000);
      },
      description: "Search",
    },
    {
      key: SHORTCUT_KEYS.ESCAPE,
      action: () => {
        setShowShortcuts(false);
      },
      description: "Close",
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Show shortcuts hint on ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          setShowShortcuts(true);
          setTimeout(() => setShowShortcuts(false), 3000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!showShortcuts) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-popover border border-border rounded-lg shadow-lg px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">/</kbd>
            <span className="text-muted-foreground">Focus chat</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘K</kbd>
            <span className="text-muted-foreground">Search</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">?</kbd>
            <span className="text-muted-foreground">Show shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
}