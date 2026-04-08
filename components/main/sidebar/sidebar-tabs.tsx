"use client";

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

interface SidebarTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return (
      <SidebarGroup className="py-1 px-1.5">
        <SidebarMenu className="gap-0.5">
          {TABS.map((tab) => (
            <SidebarMenuItem key={tab.id}>
              <SidebarMenuButton
                tooltip={tab.label}
                isActive={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
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
              onClick={() => onTabChange(tab.id)}
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
              <span className="relative z-10 font-semibold tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarGroup>
  );
}
