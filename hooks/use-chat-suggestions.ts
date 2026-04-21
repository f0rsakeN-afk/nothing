"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface UseChatSuggestionsProps {
  input: string;
  onSelect: (suggestion: string) => void;
  enabled?: boolean;
}

const RECENT_SEARCHES_KEY = "recent-searches";
const MAX_RECENT = 5;

async function fetchSuggestions(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions || [];
}

async function trackSuggestion(prompt: string): Promise<void> {
  try {
    await fetch("/api/suggest/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } catch {
    // Silently fail tracking
  }
}

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available
  }
}

export function useChatSuggestions({ input, onSelect, enabled = true }: UseChatSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Longer debounce (500ms) - only fetch after user pauses typing
  // This reduces canceled requests significantly while still being responsive
  const debouncedInput = useDebounce(input, 500);

  // Only show suggestions after debounced input settles (user paused)
  // and input has meaningful length (at least 2 chars)
  const shouldFetchSuggestions = enabled && debouncedInput.trim().length >= 2;

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions", debouncedInput],
    queryFn: () => fetchSuggestions(debouncedInput),
    enabled: shouldFetchSuggestions,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 1000, // 1 minute cache
  });

  // Show suggestions UI only after debounce settles and input has content
  useEffect(() => {
    if (debouncedInput.trim().length >= 2 && enabled) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedInput, enabled]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
        case "Tab":
          // Tab only works if there's a selection (first suggestion)
          if (e.key === "Tab" && selectedIndex === -1) return;
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
            addRecentSearch(suggestions[selectedIndex]);
            trackSuggestion(suggestions[selectedIndex]);
            setRecentSearches(getRecentSearches());
          } else if (suggestions.length > 0) {
            // Enter with no selection = accept first suggestion
            onSelect(suggestions[0]);
            addRecentSearch(suggestions[0]);
            trackSuggestion(suggestions[0]);
            setRecentSearches(getRecentSearches());
          }
          setShowSuggestions(false);
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, onSelect]
  );

  const handleSelect = useCallback(
    (suggestion: string) => {
      onSelect(suggestion);
      addRecentSearch(suggestion);
      trackSuggestion(suggestion);
      setRecentSearches(getRecentSearches());
      setShowSuggestions(false);
      setSelectedIndex(-1);
    },
    [onSelect]
  );

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  }, []);

  return {
    suggestions,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    handleSelect,
    recentSearches,
    clearRecentSearches,
  };
}
