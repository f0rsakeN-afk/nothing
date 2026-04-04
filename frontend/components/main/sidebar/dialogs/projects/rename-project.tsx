"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Edit3 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectSchema, type ProjectFormValues } from "@/schemas/project";

interface RenameProjectModalProps {
  open: boolean;
  onClose: (open: boolean) => void;
  project: { id: string; name: string; description?: string } | null;
}

export default function RenameProjectModal({
  open,
  onClose,
  project,
}: RenameProjectModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || "",
      });
    }
  }, [project, reset]);

  const onSubmit = async (data: ProjectFormValues) => {
    // Simulate API call
    console.log("Renaming project:", project?.id, data);
    await new Promise((resolve) => setTimeout(resolve, 800));
    onClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            Rename Project
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update the identity and scope of your project workspace.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 pt-4"
          noValidate
        >
          <div className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label
                htmlFor="rename-name"
                className={`text-xs ${errors.name ? "text-destructive" : ""}`}
              >
                New Project Name
              </Label>
              <Input
                id="rename-name"
                placeholder="Enter project name..."
                className={`h-10 ${
                  errors.name ? "border-destructive ring-destructive" : ""
                }`}
                disabled={isSubmitting}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[10px] font-medium text-destructive px-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="rename-description"
                className={`text-xs ${
                  errors.description ? "text-destructive" : ""
                }`}
              >
                New Description <span className="font-normal opacity-70">(Optional)</span>
              </Label>
              <Textarea
                id="rename-description"
                placeholder="The objective of this project is to..."
                className={`min-h-[100px] resize-none text-sm ${
                  errors.description ? "border-destructive ring-destructive" : ""
                }`}
                disabled={isSubmitting}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-[10px] font-medium text-destructive px-1">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onClose(false)}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 font-semibold text-xs transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
