/**
 * i18n Routing Configuration
 *
 * Defines supported locales and routing behavior
 */

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Supported locales (add new locales here)
  locales: [
    "en", // English (source of truth)
    "es", // Spanish
    "fr", // French
    "ne", // Nepali
    "hi", // Hindi
  ] as const,

  // Default locale when no locale is detected
  defaultLocale: "en",

  // Locale prefix strategy:
  // 'always' - /en/chat, /es/chat (SEO friendly, clear)
  // 'never' - /chat, locale via cookie/header (clean URLs)
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];

/**
 * Supported locales with metadata
 */
export const SUPPORTED_LOCALES: {
  code: Locale;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  flag: string;
}[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr", flag: "🇫🇷" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", dir: "ltr", flag: "🇳🇵" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", dir: "ltr", flag: "🇮🇳" },
];

/**
 * Get locale metadata by code
 */
export function getLocaleMetadata(code: Locale) {
  return SUPPORTED_LOCALES.find((l) => l.code === code) || SUPPORTED_LOCALES[0];
}
