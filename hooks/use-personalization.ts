/**
 * Personalization hook - only uses cookies/storage if personalization consent is given
 * Usage: const { setPreference, getPreference } = usePersonalization();
 */

import { useCallback } from "react";
import { useCookieCategory } from "./use-cookie-consent";

const PREFIX = "eryx_personalization_";

export function usePersonalization() {
  const canPersonalize = useCookieCategory("personalization");

  const setPreference = useCallback(
    (key: string, value: string) => {
      if (!canPersonalize) return;

      try {
        // Store in localStorage for persistence
        localStorage.setItem(`${PREFIX}${key}`, value);

        // Also set a cookie for SSR hydration
        document.cookie = `${PREFIX}${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      } catch {
        // localStorage might be full or disabled
      }
    },
    [canPersonalize]
  );

  const getPreference = useCallback((key: string): string | null => {
    if (!canPersonalize) return null;

    try {
      // Try localStorage first
      const value = localStorage.getItem(`${PREFIX}${key}`);
      if (value) return value;

      // Fallback to cookie
      const match = document.cookie.match(new RegExp(`${PREFIX}${key}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }, [canPersonalize]);

  const removePreference = useCallback((key: string) => {
    if (!canPersonalize) return;

    try {
      localStorage.removeItem(`${PREFIX}${key}`);
      document.cookie = `${PREFIX}${key}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
      // Ignore
    }
  }, [canPersonalize]);

  return {
    setPreference,
    getPreference,
    removePreference,
    isEnabled: canPersonalize,
  };
}
