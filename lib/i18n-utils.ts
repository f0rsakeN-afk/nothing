/**
 * i18n Utilities
 *
 * Server-side functions for locale detection and user preference
 */

import { routing, type Locale } from "@/routing";

/**
 * Get locale from cookie
 */
export function getLocaleFromCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const locale = cookies["NEXT_LOCALE"] as Locale | undefined;
  if (locale && routing.locales.includes(locale)) {
    return locale;
  }

  return null;
}

/**
 * Detect locale from Accept-Language header
 */
export function detectLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return routing.defaultLocale;
  }

  // Parse Accept-Language header
  // Format: "en-US,en;q=0.9,es;q=0.8"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [locale, quality = "q=1"] = lang.trim().split(";");
      const qualityValue = parseFloat(quality.replace("q=", "")) || 1;
      return { locale: locale.split("-")[0], quality: qualityValue };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first matching locale
  for (const { locale } of languages) {
    if (routing.locales.includes(locale as Locale)) {
      return locale as Locale;
    }
  }

  return routing.defaultLocale;
}

/**
 * Get messages for a locale
 * Used in server components
 */
export async function getMessages(locale: string) {
  try {
    // Dynamic import for locale-specific messages
    const messages = await import(`../messages/${locale}.json`);
    return messages.default;
  } catch {
    // Fallback to English
    const messages = await import("../messages/en.json");
    return messages.default;
  }
}

/**
 * Check if locale is RTL
 */
export function isRTL(locale: Locale): boolean {
  return false; // No RTL locales currently supported (en, es, fr are all LTR)
}
