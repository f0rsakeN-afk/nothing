"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { ChatHistoryItem } from "./chat-history-item";
import { ProjectHistoryItem } from "./project-history-item";
import { useChatEvents } from "@/hooks/useChatEvents";
import { useSidebarChats } from "@/hooks/use-sidebar-chats";
import {
  useProjects,
  useArchivedProjects,
  useArchiveProject,
  useUnarchiveProject,
  usePinProject,
  useUnpinProject,
} from "@/hooks/use-projects";
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
  parentChatId?: string | null;
  visibility?: "public" | "private";
  archivedAt?: string | null;
  pinnedAt?: string | null;
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
      <p className="text-xs text-destructive tracking-wide font-semibold">Failed to load</p>
      <button
        onClick={onRetry}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function SidebarEmptyState({
  type,
}: {
  type: "chats" | "projects" | "archive";
}) {
  const messages = {
    chats: "No chats yet",
    projects: "No projects yet",
    archive: "No archived items",
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
    archivedChats,
    isLoading: isChatsLoading,
    isError: isChatsError,
    refetch: refetchChats,
    renameChat,
    deleteChatById,
    archiveChat,
    unarchiveChat,
    pinChat,
    unpinChat,
    shareChat,
  } = useSidebarChats();

  // Projects hooks
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useProjects();
  const {
    data: archivedProjectsData,
    isLoading: isArchiveProjectsLoading,
    isError: isArchiveProjectsError,
    refetch: refetchArchiveProjects,
  } = useArchivedProjects();

  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const pinProject = usePinProject();
  const unpinProject = useUnpinProject();

  const handleArchiveChat = async (chatId: string) => {
    try {
      await archiveChat(chatId);
    } catch (error) {
      console.error("Failed to archive chat:", error);
    }
  };

  const handleUnarchiveChat = async (chatId: string) => {
    try {
      await unarchiveChat(chatId);
    } catch (error) {
      console.error("Failed to unarchive chat:", error);
    }
  };

  const handleShareChat = async (
    chatId: string,
    visibility: "public" | "private",
  ) => {
    try {
      await shareChat(chatId, visibility);
    } catch (error) {
      console.error("Failed to share chat:", error);
    }
  };

  const handlePinChat = async (chatId: string) => {
    try {
      await pinChat(chatId);
    } catch (error) {
      console.error("Failed to pin chat:", error);
    }
  };

  const handleUnpinChat = async (chatId: string) => {
    try {
      await unpinChat(chatId);
    } catch (error) {
      console.error("Failed to unpin chat:", error);
    }
  };

  const handleArchiveProject = async (project: {
    id: string;
    name: string;
  }) => {
    try {
      await archiveProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to archive project:", error);
    }
  };

  const handleUnarchiveProject = async (project: {
    id: string;
    name: string;
  }) => {
    try {
      await unarchiveProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to unarchive project:", error);
    }
  };

  const handlePinProject = async (project: { id: string; name: string }) => {
    try {
      await pinProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to pin project:", error);
    }
  };

  const handleUnpinProject = async (project: { id: string; name: string }) => {
    try {
      await unpinProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to unpin project:", error);
    }
  };

  // Archive tab - show both archived chats and projects
  if (activeTab === "archive") {
    const isLoadingChats = isChatsLoading;
    const isLoadingProjects = isArchiveProjectsLoading;
    const isLoading = isLoadingChats || isLoadingProjects;
    const hasChats = archivedChats.length > 0;
    const hasProjects = (archivedProjectsData?.projects || []).length > 0;

    if (isLoading) {
      return <SidebarSkeleton type="projects" />;
    }

    if (!hasChats && !hasProjects) {
      return <SidebarEmptyState type="archive" />;
    }

    return (
      <>
        {/* Archived Chats */}
        {hasChats && (
          <SidebarGroup className="py-1 px-2">
            <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/30 h-6">
              Chats
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {archivedChats.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    item={chat}
                    onDelete={deleteChatById}
                    onRename={renameChat}
                    onArchive={handleArchiveChat}
                    onUnarchive={handleUnarchiveChat}
                    onShare={handleShareChat}
                    onPin={handlePinChat}
                    onUnpin={handleUnpinChat}
                    isArchived
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Archived Projects */}
        {hasProjects && (
          <SidebarGroup className="py-1 px-2">
            <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/30 h-6">
              Projects
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {(archivedProjectsData?.projects || []).map((project) => (
                  <ProjectHistoryItem
                    key={project.id}
                    item={{
                      id: project.id,
                      title: project.name,
                      pinnedAt: project.pinnedAt,
                    }}
                    onRename={onRenameProject || (() => {})}
                    onDelete={onDeleteProject || (() => {})}
                    onArchive={handleUnarchiveProject}
                    onPin={handlePinProject}
                    onUnpin={handleUnpinProject}
                    isArchived
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </>
    );
  }

  // Loading state
  if (activeTab === "chats" && isChatsLoading) {
    return <SidebarSkeleton type="chats" />;
  }

  if (activeTab === "projects" && isProjectsLoading) {
    return <SidebarSkeleton type="projects" />;
  }

  // Error state
  if (activeTab === "chats" && isChatsError) {
    return <SidebarErrorState onRetry={refetchChats} />;
  }

  if (activeTab === "projects" && isProjectsError) {
    return <SidebarErrorState onRetry={refetchProjects} />;
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
                    onDelete={deleteChatById}
                    onRename={renameChat}
                    onArchive={handleArchiveChat}
                    onUnarchive={handleUnarchiveChat}
                    onShare={handleShareChat}
                    onPin={handlePinChat}
                    onUnpin={handleUnpinChat}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </>
    );
  }

  // Projects tab
  if (activeTab === "projects") {
    const projects = projectsData?.projects || [];

    if (projects.length === 0) {
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
                  <span className="text-[12px] font-semibold">
                    Create Project
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </>
      );
    }

    return (
      <>
        <SidebarGroup className="py-1 px-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {projects.map((project) => (
                <ProjectHistoryItem
                  key={project.id}
                  item={{
                    id: project.id,
                    title: project.name,
                    pinnedAt: project.pinnedAt,
                  }}
                  onRename={onRenameProject || (() => {})}
                  onDelete={onDeleteProject || (() => {})}
                  onArchive={handleArchiveProject}
                  onPin={handlePinProject}
                  onUnpin={handleUnpinProject}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="py-2 px-2 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onCreateProject}
                className="w-full justify-center gap-2 h-9 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-xl transition-all shadow-sm active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[12px] font-semibold">
                  Create Project
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </>
    );
  }

  return null;
}
