"use client";

import { useCallback } from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { TABS, type TabId } from "./data";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useHaptics } from "@/hooks/use-web-haptics";

interface SidebarTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TAB_KEYS = {
  chats: "chatExtended.chats",
  projects: "chatExtended.projects",
  archive: "chatExtended.archive",
} as const;

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const t = useTranslations();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { trigger } = useHaptics();

  const handleTabClick = useCallback((tabId: TabId) => {
    trigger("nudge");
    onTabChange(tabId);
  }, [onTabChange, trigger]);

  if (isCollapsed) {
    return (
      <SidebarGroup className="py-1 px-1.5">
        <SidebarMenu className="gap-0.5">
          {TABS.map((tab) => (
            <SidebarMenuItem key={tab.id}>
              <SidebarMenuButton
                tooltip={t(TAB_KEYS[tab.id])}
                isActive={activeTab === tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="py-1 px-2">
      <div className="grid grid-cols-3 rounded-lg bg-sidebar-accent/30 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md py-2 text-[11px] font-medium transition-colors duration-150",
                isActive
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-tab-pill"
                  className="absolute inset-0 rounded-md bg-sidebar shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <tab.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 font-semibold tracking-wider">{t(TAB_KEYS[tab.id])}</span>
            </button>
          );
        })}
      </div>
    </SidebarGroup>
  );
}
