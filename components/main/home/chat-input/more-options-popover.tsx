"use client";

import * as React from "react";
import {
  Plus,
  FileText,
  FolderOpenDot,
  Loader2,
  Check,
  PlusCircle,
  X
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
import { useCreateProject } from "@/hooks/use-projects";

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
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");

  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();

  const projects = projectsData?.projects || [];
  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const result = await createProject.mutateAsync({ name: newProjectName.trim() });
      setNewProjectName("");
      setCreateProjectOpen(false);
      onProjectSelect?.(result.id);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

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

            {/* Create new project */}
            {createProjectOpen ? (
              <div className="flex items-center gap-1 px-1 py-1">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="flex-1 h-7 px-2 text-[12px] rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                    if (e.key === "Escape") {
                      setCreateProjectOpen(false);
                      setNewProjectName("");
                    }
                  }}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || createProject.isPending}
                  className="h-7 px-2 text-[11px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createProject.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            ) : (
              <DropdownMenuItem
                onClick={() => setCreateProjectOpen(true)}
                className="gap-2 border border-dashed border-border/50"
              >
                <PlusCircle className="h-[14px] w-[14px] text-muted-foreground" />
                <span>Create new project</span>
              </DropdownMenuItem>
            )}
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
