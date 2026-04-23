"use client";

import { useSidebar } from "@/components/ui/sidebar";

export function MobileHeader() {
  const { isMobile, setOpenMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-2">
      <button
        onClick={() => setOpenMobile(true)}
        className="h-8 w-8 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src="/logo.png"
          alt="eryx logo"
          height={20}
          width={20}
          className="dark:invert"
        />
      </button>
    </header>
  );
}
