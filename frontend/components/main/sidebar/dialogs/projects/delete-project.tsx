"use client";

import { useState } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate API call
    console.log("Deleting project:", project?.id);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsDeleting(false);
    onClose(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            Delete Project
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. All research, documents, and chat history associated with <span className="font-semibold text-foreground">&quot;{project?.name}&quot;</span> will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-3 p-3 border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-[10px] font-medium text-destructive">
            Warning: This project cannot be recovered after deletion.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="h-9 px-4 text-xs font-medium">
            Cancel
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
                Deleting...
              </>
            ) : (
              "Permanently Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
