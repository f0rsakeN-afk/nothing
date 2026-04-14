"use client";

/**
 * Language Switcher Component
 *
 * Allows users to change their language preference
 * Persists selection to cookie and updates server settings
 *
 * Usage:
 * ```tsx
 * <LanguageSwitcher />
 * ```
 */

import { useRouter } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { SUPPORTED_LOCALES, type Locale } from "@/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export function LanguageSwitcher({
  currentLocale,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);

  const handleLocaleChange = useCallback((newLocale: string | null) => {
    if (!newLocale) return;

    const locale = newLocale as Locale;
    setSelectedLocale(locale);

    // Set cookie immediately for client-side persistence
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // Update user settings in database (fire and forget)
    fetch("/api/settings/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale }),
    })
      .then(() => {
        toast.success("Language updated", {
          description: SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeName,
        });
      })
      .catch(() => {
        toast.error("Failed to save language preference");
      });

    // Trigger navigation to refresh with new locale
    startTransition(() => {
      router.refresh();
    });
  }, [currentLocale, router]);

  return (
    <Select value={selectedLocale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-[140px]" disabled={isPending}>
        <SelectValue placeholder={SUPPORTED_LOCALES.find((l) => l.code === currentLocale)?.nativeName} />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            <span className="flex items-center gap-2">
              <span>{locale.flag}</span>
              <span>{locale.nativeName}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
