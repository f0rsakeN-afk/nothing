"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type CookieCategory = "analytics" | "personalization";

export interface CookieConsent {
  analytics: boolean;
  personalization: boolean;
}

export interface CookieConsentContextValue {
  consent: CookieConsent;
  hasConsented: boolean;
  isLoading: boolean;
  updateConsent: (consent: CookieConsent) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  showBanner: boolean;
  hideBanner: () => void;
}

const DEFAULT_CONSENT: CookieConsent = {
  analytics: false,
  personalization: true,
};

const COOKIE_KEY = "eryx_cookie_consent";
const CONSENT_COOKIE = "eryx_cookie_consent_data";

function getConsentFromCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as CookieConsent;
  } catch {
    return null;
  }
}

function setConsentCookie(consent: CookieConsent): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE_KEY}=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function getHasConsented(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(new RegExp(`${CONSENT_COOKIE}=([^;]+)`));
  return match ? match[1] === "true" : false;
}

function setHasConsentedCookie(value: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent from cookie on mount
  useEffect(() => {
    const savedConsent = getConsentFromCookie();
    const previouslyConsented = getHasConsented();

    if (savedConsent) {
      setConsent(savedConsent);
      setHasConsented(previouslyConsented);
    } else {
      // First visit - show banner
      setShowBanner(true);
    }

    setIsLoading(false);
  }, []);

  const updateConsent = useCallback((newConsent: CookieConsent) => {
    setConsent(newConsent);
    setHasConsented(true);
    setConsentCookie(newConsent);
    setHasConsentedCookie(true);
    setShowBanner(false);

    // Sync to API for logged-in users (fire and forget)
    fetch("/api/cookie-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConsent),
    }).catch(() => {
      // Ignore API errors
    });
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookieConsent = {
      analytics: true,
      personalization: true,
    };
    updateConsent(allAccepted);
  }, [updateConsent]);

  const rejectAll = useCallback(() => {
    const allRejected: CookieConsent = {
      analytics: false,
      personalization: true,
    };
    updateConsent(allRejected);
  }, [updateConsent]);

  const hideBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        hasConsented,
        isLoading,
        updateConsent,
        acceptAll,
        rejectAll,
        showBanner,
        hideBanner,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}

// Hook to check if a specific cookie category is allowed
// Returns false if not consented yet (safe default)
export function useCookieCategory(category: CookieCategory): boolean {
  const { consent, hasConsented } = useCookieConsent();
  if (!hasConsented) return false;
  return consent[category];
}
