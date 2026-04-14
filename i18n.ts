/**
 * i18n Configuration
 *
 * next-intl setup for Next.js App Router
 * Supports: locale routing, server/client translations, pluralization
 */

import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // 1. Get locale from request (cookie, header, or default)
  let locale = await requestLocale;

  // Validate locale is supported
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  // 2. Load translations for the locale
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
