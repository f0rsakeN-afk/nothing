"use client";

import * as React from "react";

const PENDING_PROMPT_KEY = "eryx_pending_prompt";

export function usePendingPrompt() {
  const [pendingPrompt, setPendingPromptState] = React.useState<string>("");

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(PENDING_PROMPT_KEY);
    if (stored) setPendingPromptState(stored);
  }, []);

  const setPendingPrompt = React.useCallback((prompt: string) => {
    if (prompt) {
      localStorage.setItem(PENDING_PROMPT_KEY, prompt);
    } else {
      localStorage.removeItem(PENDING_PROMPT_KEY);
    }
    setPendingPromptState(prompt);
  }, []);

  const clearPendingPrompt = React.useCallback(() => {
    localStorage.removeItem(PENDING_PROMPT_KEY);
    setPendingPromptState("");
  }, []);

  return { pendingPrompt, setPendingPrompt, clearPendingPrompt };
}