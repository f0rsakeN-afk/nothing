"use client";

import Link from "next/link";
import { FolderOpen, Plus, Search, Library, Trash2 } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    id: "new-chat",
    label: "New Chat",
    icon: Plus,
    href: "/home",
    primary: true,
    comingSoon: false,
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    href: null,
    primary: false,
    comingSoon: false,
  },
  {
    id: "context",
    label: "Context",
    icon: Library,
    href: "/context",
    primary: false,
    comingSoon: true,
  },
  {
    id: "files",
    label: "Files",
    icon: FolderOpen,
    href: "/files",
    primary: false,
    comingSoon: false,
  },
  {
    id: "trash",
    label: "Trash",
    icon: Trash2,
    href: "/trash",
    primary: false,
    comingSoon: false,
  },
] as const;

interface SidebarNavProps {
  onSearchOpen: () => void;
}

export function SidebarNav({ onSearchOpen }: SidebarNavProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarGroup className={cn("py-2", isCollapsed ? "px-1.5" : "px-2")}>
      <SidebarMenu className="gap-0.5">
        {NAV_ITEMS.map(
          ({ id, label, icon: Icon, href, primary, comingSoon }) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                tooltip={
                  comingSoon && isCollapsed ? `${label} — Coming soon` : label
                }
                render={href ? <Link href={href} /> : undefined}
                onClick={id === "search" ? onSearchOpen : undefined}
                className={cn(
                  " ",
                  primary && !isCollapsed
                    ? "h-9 border border-sidebar-border bg-sidebar-accent/20 hover:bg-sidebar-accent/50 font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="text-[13px] flex-1">{label}</span>
                    {comingSoon && (
                      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/40 shrink-0">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
