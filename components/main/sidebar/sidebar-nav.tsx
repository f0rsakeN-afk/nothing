"use client";

import { useMemo } from "react";
import React from "react";
import Link from "next/link";
import { FolderOpen, Plus, Search, Library, Trash2, Brain, Blocks, FileText, ShieldCheck, Info } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUser } from "@stackframe/stack";

type NavItem = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string | null;
  primary: boolean;
  comingSoon: boolean;
  authOnly: boolean;
  unauthOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "new-chat",
    labelKey: "nav.newChat",
    icon: Plus,
    href: "/home",
    primary: true,
    comingSoon: false,
    authOnly: false,
  },
  {
    id: "search",
    labelKey: "nav.search",
    icon: Search,
    href: null,
    primary: false,
    comingSoon: false,
    authOnly: true,
  },
  {
    id: "memory",
    labelKey: "nav.memory",
    icon: Brain,
    href: "/memory",
    primary: false,
    comingSoon: false,
    authOnly: true,
  },
  {
    id: "files",
    labelKey: "nav.files",
    icon: FolderOpen,
    href: "/files",
    primary: false,
    comingSoon: false,
    authOnly: true,
  },
  {
    id: "apps",
    labelKey: "nav.apps",
    icon: Blocks,
    href: "/apps",
    primary: false,
    comingSoon: false,
    authOnly: false,
  },
  {
    id: "terms",
    labelKey: "sidebar.termsOfService",
    icon: FileText,
    href: "/legal/terms",
    primary: false,
    comingSoon: false,
    authOnly: false,
    unauthOnly: true,
  },
  {
    id: "privacy",
    labelKey: "sidebar.privacyPolicy",
    icon: ShieldCheck,
    href: "/legal/policy",
    primary: false,
    comingSoon: false,
    authOnly: false,
    unauthOnly: true,
  },
  {
    id: "about",
    labelKey: "nav.about",
    icon: Info,
    href: "/about",
    primary: false,
    comingSoon: false,
    authOnly: false,
    unauthOnly: true,
  },
  {
    id: "contact",
    labelKey: "nav.contact",
    icon: FileText,
    href: "/contact",
    primary: false,
    comingSoon: false,
    authOnly: false,
    unauthOnly: true,
  },
];

interface SidebarNavProps {
  onSearchOpen: () => void;
}

export function SidebarNav({ onSearchOpen }: SidebarNavProps) {
  const t = useTranslations();
  const { state, closeMobileSidebar } = useSidebar();
  const user = useUser();
  const isCollapsed = state === "collapsed";

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => {
      if (item.authOnly) return !!user;
      if (item.unauthOnly) return !user;
      return true;
    }),
    [user],
  );

  return (
    <SidebarGroup className={cn("py-2", isCollapsed ? "px-1.5" : "px-2")}>
      <SidebarMenu className="gap-0.5">
        {visibleItems.map(
          ({ id, labelKey, icon: Icon, href, primary, comingSoon }) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                tooltip={
                  comingSoon && isCollapsed ? `${t(labelKey)} — ${t("nav.comingSoon")}` : t(labelKey)
                }
                render={href ? <Link href={href} /> : undefined}
                onClick={() => {
                  if (id === "search") {
                    onSearchOpen();
                  }
                  closeMobileSidebar();
                }}
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
                    <span className="text-[13px] flex-1 font-semibold tracking-wider">
                      {t(labelKey)}
                    </span>
                    {comingSoon && (
                      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/40 shrink-0">
                        {t("nav.comingSoon")}
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
