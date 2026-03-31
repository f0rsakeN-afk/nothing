"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { ChatHistoryItem } from "./chat-history-item"
import { HISTORY, type TabId } from "./data"

interface SidebarHistoryProps {
  activeTab: TabId
}

export function SidebarHistory({ activeTab }: SidebarHistoryProps) {
  if (activeTab !== "chats") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-4">
        <p className="text-[11px] text-sidebar-foreground/25 font-medium capitalize">
          No {activeTab} yet
        </p>
      </div>
    )
  }

  return (
    <>
      {HISTORY.map((group) => (
        <SidebarGroup key={group.label} className="py-1 px-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/30 h-6">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {group.items.map((item) => (
                <ChatHistoryItem key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
