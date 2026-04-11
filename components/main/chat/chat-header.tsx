"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderPlus, FolderOpen, MoreVertical, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useChat } from "@/hooks/use-chat";
import { updateChat } from "@/services/chat.service";
import type { Project } from "@/types/project";

interface ChatHeaderProps {
  chatId: string;
  onProjectChange?: () => void;
}

export function ChatHeader({ chatId, onProjectChange }: ChatHeaderProps) {
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
  const { data: chat, isLoading: isChatLoading } = useChat(chatId);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const handleAddToProject = async (project: Project) => {
    try {
      await updateChat(chatId, { projectId: project.id });
      setProjectDialogOpen(false);
      onProjectChange?.();
    } catch (error) {
      console.error("Failed to add chat to project:", error);
    }
  };

  const handleRemoveFromProject = async () => {
    try {
      await updateChat(chatId, { projectId: null });
      onProjectChange?.();
    } catch (error) {
      console.error("Failed to remove chat from project:", error);
    }
  };

  if (isChatLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
    );
  }

  const projects = projectsData?.projects || [];
  const currentProjectId = chat?.projectId;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <h1 className="text-sm font-semibold truncate">{chat?.title || "Untitled Chat"}</h1>

        {currentProjectId ? (
          <Link
            href={`/project/${currentProjectId}`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
          >
            <FolderOpen className="h-3 w-3" />
            <span className="hidden sm:inline">Project</span>
          </Link>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
          <DialogTrigger className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground">
            <FolderPlus className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>Add to Project</DialogTitle>
            </DialogHeader>
            <div className="pt-4 space-y-2">
              {isProjectsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-6 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <Link
                    href="/project"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                    onClick={() => setProjectDialogOpen(false)}
                  >
                    Create a project
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {currentProjectId && (
                    <>
                      <button
                        onClick={handleRemoveFromProject}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left text-sm text-muted-foreground"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>Remove from project</span>
                      </button>
                      <div className="h-px bg-border/60 my-2" />
                    </>
                  )}
                  {projects
                    .filter((p) => p.id !== currentProjectId)
                    .map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleAddToProject(project)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <FolderOpen className="h-4 w-4 text-primary/60" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem
              className="gap-2"
              onClick={() => window.open(`/chat/${chatId}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Open in new tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
