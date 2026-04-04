"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpenDot,
  MoreVertical,
  Plus,
  Pin,
  Pencil,
  Archive as ArchiveIcon,
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

const ALL_PROJECTS = [
  { id: "cds", title: "Core Design System", time: "Modified 2 hours ago" },
  { id: "auth", title: "Auth Flow Architecture", time: "Modified yesterday" },
  { id: "api", title: "API Gateway Patterns", time: "Modified last week" },
  { id: "ui", title: "Mobile UI Kit", time: "Modified 2 weeks ago" },
];

export default function AllProjectsPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [renameProjectOpen, setRenameProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleRename = useCallback(
    (e: React.MouseEvent, project: { id: string; title: string }) => {
      e.preventDefault();
      setSelectedProject({ id: project.id, name: project.title });
      setRenameProjectOpen(true);
    },
    [],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, project: { id: string; title: string }) => {
      e.preventDefault();
      setSelectedProject({ id: project.id, name: project.title });
      setDeleteProjectOpen(true);
    },
    [],
  );

  const handlePlaceholderAction = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Implementation for Pin/Archive goes here
  }, []);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ALL_PROJECTS.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group"
            >
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
                          onClick={handlePlaceholderAction}
                        >
                          <Pin className="w-4 h-4 text-muted-foreground" /> Pin
                          project
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={(e) => handleRename(e, project)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />{" "}
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={handlePlaceholderAction}
                        >
                          <ArchiveIcon className="w-4 h-4 text-muted-foreground" />{" "}
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive gap-2"
                          onClick={(e) => handleDelete(e, project)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <CardTitle className="text-base font-sans font-semibold tracking-tight">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-[12px] font-sans font-medium text-muted-foreground">
                    {project.time}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
