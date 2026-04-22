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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/use-projects";
import { useProjectDialogs } from "@/components/main/sidebar/dialogs/projects/create-project-context";
import { useUser } from "@stackframe/stack";

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

function ProjectSubmenu({
  projects,
  currentProjectId,
  projectsLoading,
  onProjectSelect,
  onCreateProject,
}: {
  projects: { id: string; name: string }[];
  currentProjectId?: string | null;
  projectsLoading: boolean;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: () => void;
}) {
  const { openCreateProjectDialog } = useProjectDialogs();

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="px-2 py-2">
          <p className="text-[11px] text-muted-foreground text-center">No projects</p>
        </div>
        <button
          onClick={() => {
            openCreateProjectDialog();
            onCreateProject();
          }}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all rounded-md cursor-pointer"
        >
          <PlusCircle className="h-[14px] w-[14px] shrink-0" />
          <span className="font-medium">Create new project</span>
        </button>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => onProjectSelect(null)}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-[12px] rounded-md cursor-pointer transition-all",
          currentProjectId === null
            ? "text-primary font-medium bg-primary/10"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        {currentProjectId === null ? (
          <Check className="h-[14px] w-[14px] text-primary shrink-0" />
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <span>No project</span>
      </button>

      <div className="border-t border-border/40 my-1" />

      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onProjectSelect(project.id)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-[12px] rounded-md cursor-pointer transition-all",
            currentProjectId === project.id
              ? "text-primary font-medium bg-primary/10"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          {currentProjectId === project.id ? (
            <Check className="h-[14px] w-[14px] text-primary shrink-0" />
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          <span className="truncate">{project.name}</span>
        </button>
      ))}

      <div className="border-t border-border/40 my-1" />

      <button
        onClick={() => {
          openCreateProjectDialog();
          onCreateProject();
        }}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all rounded-md cursor-pointer"
      >
        <PlusCircle className="h-[14px] w-[14px] shrink-0" />
        <span className="font-medium">Create new project</span>
      </button>
    </>
  );
}

function StyleSubmenu({
  currentStyle,
  onStyleSelect,
}: {
  currentStyle: ResponseStyle;
  onStyleSelect: (style: ResponseStyle) => void;
}) {
  return (
    <>
      {RESPONSE_STYLES.map((style) => (
        <button
          key={style.value}
          onClick={() => onStyleSelect(style.value)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-[12px] rounded-md cursor-pointer transition-all",
            currentStyle === style.value
              ? "text-primary font-medium bg-primary/10"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          {currentStyle === style.value ? (
            <Check className="h-[14px] w-[14px] text-primary shrink-0" />
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          <span>{style.label}</span>
        </button>
      ))}
    </>
  );
}

export const MoreOptionsPopover = React.memo(function MoreOptionsPopover({
  onFileSelect,
  onProjectSelect,
  onStyleSelect,
  currentProjectId,
  currentStyle = "normal",
}: MoreOptionsPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [projectSubmenuOpen, setProjectSubmenuOpen] = React.useState(false);
  const [styleSubmenuOpen, setStyleSubmenuOpen] = React.useState(false);
  const user = useUser();
  const isAuthenticated = !!user;
  const { data: projectsData, isLoading: projectsLoading } = useProjects();

  const projects = projectsData?.projects || [];

  const handleOpenChange = (newOpen: boolean) => {
    if (!isAuthenticated && newOpen) return;
    setOpen(newOpen);
  };

  const handleProjectSelect = React.useCallback((projectId: string | null) => {
    onProjectSelect?.(projectId);
    setOpen(false);
  }, [onProjectSelect]);

  const handleStyleSelect = React.useCallback((style: ResponseStyle) => {
    onStyleSelect?.(style);
    setOpen(false);
  }, [onStyleSelect]);

  const handleFileSelect = React.useCallback(() => {
    onFileSelect();
    setOpen(false);
  }, [onFileSelect]);

  const handleCreateProject = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
          !isAuthenticated
            ? "text-muted-foreground/30 hover:text-muted-foreground/50"
            : currentProjectId || currentStyle !== "normal"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70"
        )}
      >
        <Tooltip>
          <TooltipTrigger render={<div className="flex items-center justify-center h-full w-full"><Plus className="h-[14px] w-[14px]" /></div>} />
          <TooltipContent side="bottom" sideOffset={8}>
            {isAuthenticated ? "Add file, project, or style" : "Sign in to access options"}
          </TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={12}
        className="w-48 p-1.5"
      >
        {/* Add file */}
        <button
          onClick={handleFileSelect}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md cursor-pointer"
        >
          <FileText className="h-[14px] w-[14px] shrink-0" />
          <span className="font-medium">Add file</span>
        </button>

        {/* Add to project - Submenu */}
        <div className="relative">
          <button
            onMouseEnter={() => setProjectSubmenuOpen(true)}
            onMouseLeave={() => setProjectSubmenuOpen(false)}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all rounded-md cursor-pointer"
          >
            <FolderOpenDot className="h-[14px] w-[14px] shrink-0" />
            <span className="flex-1 text-left font-medium">
              Add to project
            </span>
          </button>

          {projectSubmenuOpen && (
            <div className="absolute left-full top-0 ml-1 w-48 bg-popover border border-border rounded-lg shadow-lg p-1.5">
              <ProjectSubmenu
                projects={projects}
                currentProjectId={currentProjectId}
                projectsLoading={projectsLoading}
                onProjectSelect={handleProjectSelect}
                onCreateProject={handleCreateProject}
              />
            </div>
          )}
        </div>

        {/* Style - Submenu */}
        <div className="relative">
          <button
            onMouseEnter={() => setStyleSubmenuOpen(true)}
            onMouseLeave={() => setStyleSubmenuOpen(false)}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all rounded-md cursor-pointer"
          >
            <span className="w-[14px] shrink-0" />
            <span className="flex-1 text-left font-medium">
              Style
            </span>
          </button>

          {styleSubmenuOpen && (
            <div className="absolute left-full top-0 ml-1 w-40 bg-popover border border-border rounded-lg shadow-lg p-1.5">
              <StyleSubmenu
                currentStyle={currentStyle}
                onStyleSelect={handleStyleSelect}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
