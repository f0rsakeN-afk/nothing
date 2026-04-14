"use client";

/**
 * useTranslations Hook
 *
 * Type-safe internationalization hook for Next.js
 * Provides translations with automatic type inference from translation files
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * const t = useTranslations();
 * t("common.save") // "Save"
 *
 * // With variables
 * t("chat.members", { count: 5 }) // "5 members"
 *
 * // Pluralization
 * t("time.minutesAgo", { count: 3 }) // "3 minutes ago"
 *
 * // Namespaced
 * const t = useTranslations("settings");
 * t("language") // "Language"
 *
 * // Combined
 * const t = useTranslations("chat");
 * t("members", { count: userCount })
 * ```
 */

import { useTranslations as useNextIntlTranslations } from "next-intl";

/**
 * Namespace type for type-safe translations
 */
export type Namespace = "common" | "auth" | "chat" | "project" | "settings" | "notifications" | "errors" | "validation" | "credits" | "files" | "search" | "ai" | "time" | "pagination" | "accessibility";

/**
 * Extended useTranslations hook with namespace support
 */
export function useTranslations(namespace?: Namespace) {
  return useNextIntlTranslations(namespace);
}
