"use client";

/**
 * Language Dropdown for Sidebar
 *
 * Compact language selector that works within a DropdownMenu
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransition } from "react";
import { toast } from "sonner";
import { SUPPORTED_LOCALES, type Locale } from "@/routing";

interface LanguageDropdownProps {
  trigger?: React.ReactNode;
}

export function LanguageDropdown({ trigger }: LanguageDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState<Locale>(
    (typeof window !== "undefined"
      ? document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1]
      : null) as Locale || "en"
  );

  const handleLocaleChange = async (locale: Locale) => {
    setCurrentLocale(locale);

    // Set cookie immediately
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // Update user settings
    try {
      await fetch("/api/settings/locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale }),
      });
      toast.success("Language updated", {
        description: SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeName,
      });
    } catch {
      toast.error("Failed to save language preference");
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const defaultTrigger = (
    <button
      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-[13px] hover:bg-sidebar-accent cursor-pointer"
      disabled={isPending}
    >
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 text-left">
        {SUPPORTED_LOCALES.find((l) => l.code === currentLocale)?.nativeName || "English"}
      </span>
      <span className="text-xs">{SUPPORTED_LOCALES.find((l) => l.code === currentLocale)?.flag}</span>
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-48">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code as Locale)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-base">{locale.flag}</span>
            <span className="flex-1">{locale.nativeName}</span>
            {currentLocale === locale.code && (
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
