"use client";

import Link from "next/link";
import { PanelLeft } from "lucide-react";

import {
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { SidebarToggleIcon } from "@/src/components/unlumen-ui/sidebar-toggle-icon";

export function AppSidebarHeader() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarHeader className={cn("gap-0", isCollapsed ? "p-2" : "p-3")}>
      <div
        className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {isCollapsed ? (
          // Collapsed: logo toggles the sidebar open
          <button
            onClick={toggleSidebar}
            className="group/logo flex items-center gap-2 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer"
            aria-label="Open sidebar"
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-primary-foreground group-hover/logo:text-sidebar-accent-foreground">
              {/* <span className="transition-opacity duration-150 group-hover/logo:opacity-0">
                E
              </span> */}
              <Image
                src={"/logo.png"}
                alt="eryx logo"
                height={20}
                width={20}
                priority
                className="dark:invert transition-opacity duration-150 group-hover/logo:opacity-0"
              />
              <PanelLeft className="absolute h-3.5 w-3.5 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100" />
            </span>
          </button>
        ) : (
          // Expanded: logo navigates to /home, trigger on the right handles collapse
          <Link
            href="/home"
            className="flex items-center gap-2 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {/* <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold tracking-tight">
              E
            </span>
            <span className="text-[13px] font-semibold text-sidebar-foreground tracking-tight">
              Eryx
            </span> */}
            <Image
              src={"/logo.png"}
              alt="eryx logo"
              height={20}
              width={20}
              priority
              className="dark:invert"
            />
          </Link>
        )}

        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent flex items-center justify-center rounded-md"
            aria-label="Close sidebar"
          >
            <SidebarToggleIcon isOpen={false} />
          </button>
        )}
      </div>
    </SidebarHeader>
  );
}
