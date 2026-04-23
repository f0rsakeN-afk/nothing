import { useState, useEffect } from "react";

const PROFESSION_KEY = "eryx_profession";
const PROFESSION_COOKIE = "eryx_profession";

function getProfessionFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${PROFESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

function setProfessionCookie(profession: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PROFESSION_COOKIE}=${profession}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

async function fetchProfessionFromApi(): Promise<string | null> {
  try {
    const res = await fetch("/api/onboarding");
    if (res.ok) {
      const data = await res.json();
      return data.profession || null;
    }
  } catch {
    // Ignore API errors
  }
  return null;
}

/**
 * Hook to get user's profession for personalization
 * Checks in order: localStorage -> cookie -> API (database)
 * Syncs back to localStorage and cookie when found via API
 */
export function useProfession() {
  const [profession, setProfession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfession = async () => {
      // 1. Try localStorage
      const saved = localStorage.getItem(PROFESSION_KEY);
      if (saved) {
        setProfession(saved);
        setIsLoading(false);
        return;
      }

      // 2. Try cookie
      const cookieValue = getProfessionFromCookie();
      if (cookieValue) {
        setProfession(cookieValue);
        localStorage.setItem(PROFESSION_KEY, cookieValue);
        setIsLoading(false);
        return;
      }

      // 3. Fetch from API (database)
      const apiProfession = await fetchProfessionFromApi();
      if (apiProfession) {
        setProfession(apiProfession);
        localStorage.setItem(PROFESSION_KEY, apiProfession);
        setProfessionCookie(apiProfession);
      }

      setIsLoading(false);
    };

    loadProfession();
  }, []);

  return { profession, isLoading };
}
