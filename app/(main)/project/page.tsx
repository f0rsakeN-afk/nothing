"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpenDot,
  MoreVertical,
  Plus,
  Pin,
  Pencil,
  Archive,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import CreateProjectDialog from "@/components/main/sidebar/dialogs/projects/create-project";
import RenameProjectModal from "@/components/main/sidebar/dialogs/projects/rename-project";
import DeleteProjectModal from "@/components/main/sidebar/dialogs/projects/delete-project";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useUnarchiveProject,
} from "@/hooks/use-projects";
import type { Project } from "@/types/project";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function ProjectCard({
  project,
  onRename,
  onDelete,
  onArchive,
}: {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
  onArchive: (project: Project) => void;
}) {
  return (
    <Link href={`/project/${project.id}`} className="group">
      <Card className="flex flex-col h-full hover:bg-muted/10 hover:border-primary/30 transition-colors shadow-none border-border/40 relative">
        <CardHeader className="pb-8">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FolderOpenDot className="w-5 h-5 text-primary" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer outline-none"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl"
              >
                <DropdownMenuItem
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onArchive(project);
                  }}
                >
                  <Archive className="w-4 h-4 text-muted-foreground" />
                  {project.archivedAt ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onRename(project);
                  }}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(project);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <CardTitle className="text-base font-sans font-semibold tracking-tight">
            {project.name}
          </CardTitle>
          <CardDescription className="text-[12px] font-sans font-medium text-muted-foreground">
            Modified {formatRelativeTime(project.updatedAt)}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AllProjectsPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [renameProjectOpen, setRenameProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data, isLoading } = useProjects();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();

  const handleRename = useCallback((project: Project) => {
    setSelectedProject(project);
    setRenameProjectOpen(true);
  }, []);

  const handleDelete = useCallback((project: Project) => {
    setSelectedProject(project);
    setDeleteProjectOpen(true);
  }, []);

  const handleArchive = useCallback((project: Project) => {
    if (project.archivedAt) {
      unarchiveProject.mutate(project.id);
    } else {
      archiveProject.mutate(project.id);
    }
  }, [archiveProject, unarchiveProject]);

  const projects = data?.projects || [];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto w-full">
      <div className="w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col pt-16">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <Button
            className="h-9 gap-2 rounded-xl text-xs font-semibold"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="w-4 h-4" /> New project
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FolderOpenDot className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground text-sm">No projects yet</p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCreateProjectOpen(true)}
            >
              <Plus className="w-4 h-4" /> Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRename={handleRename}
                onDelete={handleDelete}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={createProjectOpen}
        onClose={setCreateProjectOpen}
      />
      <RenameProjectModal
        open={renameProjectOpen}
        onClose={setRenameProjectOpen}
        project={selectedProject}
      />
      <DeleteProjectModal
        open={deleteProjectOpen}
        onClose={setDeleteProjectOpen}
        project={selectedProject}
      />
    </div>
  );
}
