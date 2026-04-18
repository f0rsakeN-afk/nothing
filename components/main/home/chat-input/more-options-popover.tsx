"use client";

import * as React from "react";
import {
  Plus,
  FileText,
  FolderOpenDot,
  Loader2,
  Check,
  PlusCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/use-projects";
import { useCreateProjectDialog } from "@/components/main/sidebar/dialogs/projects/create-project-context";

export type ResponseStyle = "normal" | "learning" | "concise" | "explanatory" | "formal";

const RESPONSE_STYLES: { value: ResponseStyle; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "learning", label: "Learning" },
  { value: "concise", label: "Concise" },
  { value: "explanatory", label: "Explanatory" },
  { value: "formal", label: "Formal" },
];

interface MoreOptionsPopoverProps {
  onFileSelect: () => void;
  onProjectSelect?: (projectId: string | null) => void;
  onStyleSelect?: (style: ResponseStyle) => void;
  currentProjectId?: string | null;
  currentStyle?: ResponseStyle;
}

export function MoreOptionsPopover({
  onFileSelect,
  onProjectSelect,
  onStyleSelect,
  currentProjectId,
  currentStyle = "normal",
}: MoreOptionsPopoverProps) {
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { openCreateProjectDialog } = useCreateProjectDialog();

  const projects = projectsData?.projects || [];
  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleProjectSelect = (projectId: string | null) => {
    onProjectSelect?.(projectId);
  };

  const handleStyleSelect = (style: ResponseStyle) => {
    onStyleSelect?.(style);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
              currentProjectId || currentStyle !== "normal"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/70"
            )}
          >
            <Plus className="h-[14px] w-[14px]" />
          </button>
        }
      />

      <DropdownMenuContent align="start" sideOffset={8} className="w-48 p-1">
        {/* Add file */}
        <DropdownMenuItem onClick={onFileSelect} className="gap-2">
          <FileText className="h-[14px] w-[14px] text-muted-foreground" />
          <span>Add file</span>
        </DropdownMenuItem>

        {/* Add to project - Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <FolderOpenDot className="h-[14px] w-[14px] text-muted-foreground" />
            <span>{currentProject ? currentProject.name : "Add to project"}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48 p-1" alignOffset={0} sideOffset={-4}>
            {/* None option */}
            <DropdownMenuItem
              onClick={() => handleProjectSelect(null)}
              className="gap-2"
            >
              {currentProjectId === null ? (
                <Check className="h-[14px] w-[14px] text-primary" />
              ) : (
                <span className="w-[14px]" />
              )}
              <span>No project</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Project list */}
            {projectsLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="px-2 py-2">
                <p className="text-[11px] text-muted-foreground text-center">No projects</p>
              </div>
            ) : (
              projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  className="gap-2"
                >
                  {currentProjectId === project.id ? (
                    <Check className="h-[14px] w-[14px] text-primary" />
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            {/* Create new project - opens dialog */}
            <DropdownMenuItem
              onClick={() => {
                openCreateProjectDialog();
              }}
              className="gap-2 border border-dashed border-border/50"
            >
              <PlusCircle className="h-[14px] w-[14px] text-muted-foreground" />
              <span>Create new project</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Style - Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <span className="w-[14px]" />
            <span>{RESPONSE_STYLES.find(s => s.value === currentStyle)?.label || "Style"}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40 p-1" alignOffset={0} sideOffset={-4}>
            {RESPONSE_STYLES.map((style) => (
              <DropdownMenuItem
                key={style.value}
                onClick={() => handleStyleSelect(style.value)}
                className="gap-2"
              >
                {currentStyle === style.value ? (
                  <Check className="h-[14px] w-[14px] text-primary" />
                ) : (
                  <span className="w-[14px]" />
                )}
                <span>{style.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
