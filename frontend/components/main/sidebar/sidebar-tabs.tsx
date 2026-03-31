"use client"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { TABS, type TabId } from "./data"

interface SidebarTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
    )
  }

  return (
    <SidebarGroup className="py-1 px-2">
      <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-sidebar-accent/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-2 text-[11px] font-medium transition-all duration-150",
              activeTab === tab.id
                ? "bg-sidebar text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
    </SidebarGroup>
  )
}
