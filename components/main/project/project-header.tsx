"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pin, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProject, useDeleteProject, useArchiveProject, useUnarchiveProject } from "@/hooks/use-projects";
import type { Project } from "@/types/project";

interface ProjectHeaderProps {
  project: Project | undefined;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameName, setRenameName] = useState(project?.name || "");
  const [renameDesc, setRenameDesc] = useState(project?.description || "");

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();

  const isArchived = !!project?.archivedAt;

  const handleRename = async () => {
    if (!project || !renameName.trim()) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: renameName.trim(),
        description: renameDesc.trim(),
      });
      setRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename project:", error);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      await deleteProject.mutateAsync(project.id);
      router.push("/project");
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleArchive = async () => {
    if (!project) return;
    try {
      await archiveProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to archive project:", error);
    }
  };

  const handleUnarchive = async () => {
    if (!project) return;
    try {
      await unarchiveProject.mutateAsync(project.id);
    } catch (error) {
      console.error("Failed to unarchive project:", error);
    }
  };

  if (!project) return null;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem className="gap-2" disabled>
                <Pin className="w-4 h-4 text-muted-foreground" /> Pin project
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => { setRenameName(project.name); setRenameDesc(project.description); setRenameOpen(true); }}>
                <Pencil className="w-4 h-4 text-muted-foreground" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={isArchived ? handleUnarchive : handleArchive}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4 text-muted-foreground" /> Restore
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 text-muted-foreground" /> Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground mt-2 text-sm">{project.description}</p>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update the project name and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-desc">Description</Label>
              <Textarea
                id="rename-desc"
                value={renameDesc}
                onChange={(e) => setRenameDesc(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || updateProject.isPending}>
              {updateProject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This action is irreversible. All research, documents, and chat history
              associated with &quot;{project.name}&quot; will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
