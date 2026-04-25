/**
 * i18n Configuration
 *
 * next-intl setup for Next.js App Router
 * Supports: locale routing, server/client translations, pluralization
 */

import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { cookies } from "next/headers";

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from cookie first (for localePrefix: "never")
  const cookieStore = await cookies();
  const localeFromCookie = cookieStore.get("NEXT_LOCALE")?.value;

  // Fall back to requestLocale (from headers/accept-language)
  let locale = await requestLocale;

  // If cookie has valid locale, use it
  if (localeFromCookie && routing.locales.includes(localeFromCookie as typeof routing.locales[number])) {
    locale = localeFromCookie;
  }

  // Validate locale is supported
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  // Load translations for the locale
  const messages = await loadTranslations(locale);

  return {
    locale,
    messages,
    timeZone: "UTC",
    now: new Date(),
  };
});

/**
 * Load translations with lazy loading per namespace
 * Only loads namespaces actually used in the request
 */
async function loadTranslations(locale: string) {
  const { default: messages } = await import(`./messages/${locale}.json`);
  return messages;
}
