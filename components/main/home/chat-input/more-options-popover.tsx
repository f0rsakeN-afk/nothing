"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  FolderOpenDot,
  Loader2,
  ChevronRight,
  BookOpen,
  List,
  AlignLeft,
  FileCheck,
  PlusCircle,
  X
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/use-projects";
import { useCreateProject } from "@/hooks/use-projects";
import type { Project } from "@/types/project";

export type ResponseStyle = "normal" | "learning" | "concise" | "explanatory" | "formal";

const RESPONSE_STYLES: { value: ResponseStyle; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "normal",
    label: "Normal",
    icon: FileText,
    description: "Balanced and natural"
  },
  {
    value: "learning",
    label: "Learning",
    icon: BookOpen,
    description: "Educational with explanations"
  },
  {
    value: "concise",
    label: "Concise",
    icon: List,
    description: "Brief and to the point"
  },
  {
    value: "explanatory",
    label: "Explanatory",
    icon: AlignLeft,
    description: "Detailed and thorough"
  },
  {
    value: "formal",
    label: "Formal",
    icon: FileCheck,
    description: "Professional and precise"
  },
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
  const [open, setOpen] = React.useState(false);
  const [projectsOpen, setProjectsOpen] = React.useState(false);
  const [styleOpen, setStyleOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");

  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();

  const projects = projectsData?.projects || [];

  const currentProject = projects.find(p => p.id === currentProjectId);
  const currentStyleConfig = RESPONSE_STYLES.find(s => s.value === currentStyle);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const result = await createProject.mutateAsync({ name: newProjectName.trim() });
      setNewProjectName("");
      setCreateProjectOpen(false);
      onProjectSelect?.(result.id);
      setProjectsOpen(false);
      setOpen(false);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleProjectSelect = (projectId: string | null) => {
    onProjectSelect?.(projectId);
    setProjectsOpen(false);
    setOpen(false);
  };

  const handleStyleSelect = (style: ResponseStyle) => {
    onStyleSelect?.(style);
    setStyleOpen(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
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
      <AnimatePresence>
        {open && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={12}
            className="w-64 p-1.5 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Add file */}
              <button
                onClick={() => {
                  onFileSelect();
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
              >
                <FileText className="h-[14px] w-[14px] text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-foreground">Add file</p>
                  <p className="text-[11px] text-muted-foreground">Attach documents to chat</p>
                </div>
              </button>

              {/* Add to project (with sub-popover) */}
              <div className="relative">
                <button
                  onClick={() => setProjectsOpen(!projectsOpen)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left",
                    projectsOpen && "bg-muted/40"
                  )}
                >
                  <FolderOpenDot className="h-[14px] w-[14px] text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">
                      {currentProject ? currentProject.name : "Add to project"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {currentProject ? "Click to change" : "Organize in a project"}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-[14px] w-[14px] text-muted-foreground transition-transform",
                    projectsOpen && "rotate-90"
                  )} />
                </button>

                {/* Projects sub-menu */}
                <AnimatePresence>
                  {projectsOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-full top-0 ml-1 w-56 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="p-1.5 max-h-64 overflow-y-auto">
                        {/* None option */}
                        <button
                          onClick={() => handleProjectSelect(null)}
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left",
                            !currentProjectId && "bg-muted/60"
                          )}
                        >
                          <X className="h-[13px] w-[13px] text-muted-foreground" />
                          <span className="text-[12px] text-foreground">No project</span>
                        </button>

                        {/* Project list */}
                        {projectsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : projects.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-3">
                            No projects yet
                          </p>
                        ) : (
                          projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleProjectSelect(project.id)}
                              className={cn(
                                "flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left",
                                currentProjectId === project.id && "bg-muted/60"
                              )}
                            >
                              <FolderOpenDot className="h-[13px] w-[13px] text-muted-foreground shrink-0" />
                              <span className="text-[12px] text-foreground truncate">
                                {project.name}
                              </span>
                            </button>
                          ))
                        )}

                        {/* Create new project */}
                        {createProjectOpen ? (
                          <div className="flex items-center gap-2 px-2 py-1.5">
                            <input
                              type="text"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              placeholder="Project name..."
                              className="flex-1 h-7 px-2 text-[12px] rounded-md border border-border bg-background"
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
                          <button
                            onClick={() => setCreateProjectOpen(true)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left border border-dashed border-border/50"
                          >
                            <PlusCircle className="h-[13px] w-[13px] text-muted-foreground" />
                            <span className="text-[12px] text-muted-foreground">Create new project</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Style (with sub-popover) */}
              <div className="relative">
                <button
                  onClick={() => setStyleOpen(!styleOpen)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left",
                    styleOpen && "bg-muted/40"
                  )}
                >
                  {currentStyleConfig && (
                    <currentStyleConfig.icon className="h-[14px] w-[14px] text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">
                      {currentStyleConfig?.label || "Style"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {currentStyleConfig?.description || "Response format"}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-[14px] w-[14px] text-muted-foreground transition-transform",
                    styleOpen && "rotate-90"
                  )} />
                </button>

                {/* Styles sub-menu */}
                <AnimatePresence>
                  {styleOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-full top-0 ml-1 w-52 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="p-1.5">
                        {RESPONSE_STYLES.map((style) => {
                          const Icon = style.icon;
                          return (
                            <button
                              key={style.value}
                              onClick={() => handleStyleSelect(style.value)}
                              className={cn(
                                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left",
                                currentStyle === style.value && "bg-muted/60"
                              )}
                            >
                              <Icon className="h-[13px] w-[13px] text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-foreground">{style.label}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{style.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
