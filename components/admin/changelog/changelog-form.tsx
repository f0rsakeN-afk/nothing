"use client";

import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { changelogEntrySchema, type ChangelogEntryInput } from "@/lib/validations/changelog.validation";

const CHANGE_TYPES = ["feature", "fix", "improvement", "breaking"] as const;

const CHANGE_TYPE_STYLES: Record<string, string> = {
  feature: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  fix: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  breaking: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

interface ChangelogFormProps {
  entry?: {
    version: string;
    date?: string;
    title: string;
    description: string;
    changes: { type: string; text: string }[];
    isPublished: boolean;
  };
  onSubmit: (data: ChangelogEntryInput) => Promise<void>;
  isLoading: boolean;
}

export function ChangelogForm({ entry, onSubmit, isLoading }: ChangelogFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChangelogEntryInput>({
    resolver: zodResolver(changelogEntrySchema),
    defaultValues: {
      version: entry?.version || "",
      date: entry?.date?.split("T")[0] || "",
      title: entry?.title || "",
      description: entry?.description || "",
      changes: entry?.changes?.length ? entry.changes as ChangelogEntryInput["changes"] : [{ type: "feature", text: "" }],
      isPublished: entry?.isPublished ?? false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "changes",
  });

  const watchedChanges = watch("changes");
  const watchedIsPublished = watch("isPublished");

  const onFormSubmit = useCallback(
    async (data: ChangelogEntryInput) => {
      try {
        await onSubmit({
          ...data,
          date: data.date || new Date().toISOString().split("T")[0],
        });
      } catch {
        // Error handled by parent
      }
    },
    [onSubmit],
  );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Version *</label>
            <Input
              {...register("version")}
              placeholder="e.g., 1.2.0"
            />
            {errors.version && (
              <p className="text-xs text-destructive">{errors.version.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" {...register("date")} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Title *</label>
          <Input
            {...register("title")}
            placeholder="e.g., Major update with new features"
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Description *</label>
          <Textarea
            {...register("description")}
            placeholder="Brief description of this release"
            rows={3}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Changes</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: "feature", text: "" })}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Change
            </Button>
          </div>

          {errors.changes?.root && (
            <p className="text-xs text-destructive">{errors.changes.root.message}</p>
          )}

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Select
                  value={watchedChanges[index]?.type || "feature"}
                  onValueChange={(v) => {
                    const changes = [...watchedChanges];
                    changes[index] = { ...changes[index], type: v as typeof field.type };
                    setValue("changes", changes as any);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-medium mr-1", CHANGE_TYPE_STYLES[type])}
                        >
                          {type}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  <Input
                    {...register(`changes.${index}.text` as const)}
                    placeholder="Describe the change..."
                  />
                  {errors.changes?.[index]?.text && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.changes[index]?.text?.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={String(watchedIsPublished)}
            onValueChange={(v) => setValue("isPublished", v === "true")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Draft</SelectItem>
              <SelectItem value="true">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : entry ? "Update Entry" : "Create Entry"}
        </Button>
      </div>
    </form>
  );
}