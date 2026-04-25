"use client";

import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useDeleteProject } from "@/hooks/use-projects";

interface DeleteProjectModalProps {
  open: boolean;
  onClose: (open: boolean) => void;
  project: { id: string; name: string } | null;
}

export default function DeleteProjectModal({
  open,
  onClose,
  project,
}: DeleteProjectModalProps) {
  const t = useTranslations();
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    if (!project) return;

    try {
      await deleteProject.mutateAsync(project.id);
      onClose(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const isDeleting = deleteProject.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            {t("project.deleteProject")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("project.deleteProjectActionConfirm", { project: project?.name || "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-3 p-3 border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-[10px] font-medium text-destructive">
            {t("project.deleteProjectWarning")}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="h-9 px-4 text-xs font-medium">
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            variant="destructive"
            className="h-9 px-6 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                {t("project.deleting")}
              </>
            ) : (
              t("project.permanentlyDelete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
