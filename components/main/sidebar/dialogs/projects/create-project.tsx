"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, FolderPlus } from "lucide-react";
import { toast } from "@/components/ui/sileo-toast";
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
import { useCreateProject } from "@/hooks/use-projects";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: (open: boolean) => void;
}

export default function CreateProjectDialog({
  open,
  onClose,
}: CreateProjectDialogProps) {
  const t = useTranslations();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await createProject.mutateAsync(data);
      reset();
      onClose(false);
    } catch (error) {
      const err = error as { code?: string; message?: string; upgradeTo?: string };
      if (err.code === "PROJECT_LIMIT_REACHED") {
        toast.error(err.message || t("project.projectLimitReached"), {
          description: err.upgradeTo ? t("project.upgradeToForMoreProjects", { plan: err.upgradeTo }) : undefined,
          action: err.upgradeTo ? {
            label: t("sidebar.upgradeToPro"),
            onClick: () => {
              // Open pricing dialog - emit event or use a callback
              onClose(false);
              window.dispatchEvent(new CustomEvent("open-pricing-dialog"));
            },
          } : undefined,
        });
      } else {
        toast.error(t("project.failedToCreateProject"));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            {t("project.createNewProject")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("project.createNewProjectDesc")}
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
                htmlFor="name"
                className={`text-xs ${errors.name ? "text-destructive" : ""}`}
              >
                {t("project.projectName")}
              </Label>
              <Input
                id="name"
                placeholder={t("project.projectNamePlaceholder")}
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
                htmlFor="description"
                className={`text-xs ${
                  errors.description ? "text-destructive" : ""
                }`}
              >
                {t("project.projectDescriptionOptional")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("project.projectObjectivePlaceholder")}
                className={`min-h-[100px] resize-none text-sm ${
                  errors.description
                    ? "border-destructive ring-destructive"
                    : ""
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
                  {t("project.creating")}
                </>
              ) : (
                t("project.initializeProject")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
