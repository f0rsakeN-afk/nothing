"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Edit3 } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { useUpdateProject } from "@/hooks/use-projects";

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
  const t = useTranslations();
  const updateProject = useUpdateProject();

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
    if (!project) return;

    try {
      await updateProject.mutateAsync({
        id: project.id,
        name: data.name,
        description: data.description,
      });
      onClose(false);
    } catch (error) {
      console.error("Failed to rename project:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            {t("project.renameProject")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("project.renameProjectDesc")}
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
                {t("project.newProjectName")}
              </Label>
              <Input
                id="rename-name"
                placeholder={t("project.enterProjectName")}
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
                {t("project.newDescriptionOptional")}
              </Label>
              <Textarea
                id="rename-description"
                placeholder={t("project.projectObjectivePlaceholder")}
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
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 font-semibold text-xs transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  {t("project.saving")}
                </>
              ) : (
                t("project.saveChanges")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
