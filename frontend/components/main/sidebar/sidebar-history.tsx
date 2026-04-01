"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Plus } from "lucide-react"
import { ChatHistoryItem } from "./chat-history-item"
import { ProjectHistoryItem } from "./project-history-item"
import { HISTORY, PROJECTS, type TabId } from "./data"

interface SidebarHistoryProps {
  activeTab: TabId
  onCreateProject?: () => void
  onRenameProject?: (project: { id: string; name: string }) => void
  onDeleteProject?: (project: { id: string; name: string }) => void
}

export function SidebarHistory({
  activeTab,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: SidebarHistoryProps) {
  if (activeTab === "archive") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-4">
        <p className="text-[11px] text-sidebar-foreground/25 font-medium capitalize">
          No {activeTab} yet
        </p>
      </div>
    )
  }

  const groups = activeTab === "projects" ? PROJECTS : HISTORY

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label} className="py-1 px-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/30 h-6">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {group.items.map((item) =>
                activeTab === "projects" ? (
                  <ProjectHistoryItem
                    key={item.id}
                    item={item}
                    onRename={onRenameProject!}
                    onDelete={onDeleteProject!}
                  />
                ) : (
                  <ChatHistoryItem key={item.id} item={item} />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      {activeTab === "projects" && (
        <SidebarGroup className="py-2 px-2 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onCreateProject}
                className="w-full justify-center gap-2 h-9 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[12px] font-semibold">Create Project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  )
}
