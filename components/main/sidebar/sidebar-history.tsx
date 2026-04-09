"use client";

import * as React from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus, Loader2 } from "lucide-react";
import { ChatHistoryItem } from "./chat-history-item";
import { ProjectHistoryItem } from "./project-history-item";
import { useChatEvents } from "@/hooks/useChatEvents";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import { Skeleton } from "@/components/ui/skeleton";
import type { TabId } from "./data";

interface SidebarHistoryProps {
  activeTab: TabId;
  onCreateProject?: () => void;
  onRenameProject?: (project: { id: string; name: string }) => void;
  onDeleteProject?: (project: { id: string; name: string }) => void;
}

interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  messageCount: number;
  firstMessagePreview: string | null;
}

function groupChatsByDate(chats: ChatItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ChatItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.createdAt);
    if (chatDate >= today) groups[0].items.push(chat);
    else if (chatDate >= yesterday) groups[1].items.push(chat);
    else if (chatDate >= weekAgo) groups[2].items.push(chat);
    else groups[3].items.push(chat);
  });

  return groups.filter((g) => g.items.length > 0);
}

// =========================================
// Skeleton components
// =========================================

function SidebarSkeleton({ type }: { type: "chats" | "projects" }) {
  const items = type === "chats" ? 5 : 3;

  return (
    <div className="py-1 px-2 space-y-1">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 h-8 px-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </div>
  );
}

function SidebarErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <p className="text-xs text-destructive font-medium">Failed to load</p>
      <button
        onClick={onRetry}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function SidebarEmptyState({ type }: { type: "chats" | "projects" | "archive" }) {
  const messages = {
    chats: "No chats yet",
    projects: "No projects yet",
    archive: "No archive yet",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
      <p className="text-xs text-muted-foreground/40 font-medium capitalize">
        {messages[type]}
      </p>
    </div>
  );
}

// =========================================
// Main component
// =========================================

export function SidebarHistory({
  activeTab,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: SidebarHistoryProps) {
  // Subscribe to SSE events for real-time updates
  useChatEvents();

  // Use sidebar chats hook
  const {
    chats,
    isLoading,
    isError,
    refetch,
    renameChat,
    deleteChatById,
  } = useSidebarChats();

  // Archive tab
  if (activeTab === "archive") {
    return <SidebarEmptyState type="archive" />;
  }

  // Loading state
  if (activeTab === "chats" && isLoading) {
    return <SidebarSkeleton type="chats" />;
  }

  if (activeTab === "projects" && isLoading) {
    return <SidebarSkeleton type="projects" />;
  }

  // Error state
  if (activeTab === "chats" && isError) {
    return <SidebarErrorState onRetry={refetch} />;
  }

  if (activeTab === "projects" && isError) {
    return <SidebarErrorState onRetry={refetch} />;
  }

  // Empty state
  if (activeTab === "chats" && chats.length === 0) {
    return <SidebarEmptyState type="chats" />;
  }

  // Chats tab
  if (activeTab === "chats") {
    const groups = groupChatsByDate(chats);

    return (
      <>
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1 px-2">
            <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/30 h-6">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {group.items.map((item) => (
                  <ChatHistoryItem
                    key={item.id}
                    item={item}
                    onDelete={async (id) => { await deleteChatById(id); }}
                    onRename={async (id, title) => { await renameChat(id, title); }}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </>
    );
  }

  // Projects tab (placeholder for now)
  if (activeTab === "projects") {
    return (
      <>
        <SidebarEmptyState type="projects" />
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
      </>
    );
  }

  return null;
}
