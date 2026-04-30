"use client";

import { memo, useRef, useCallback, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, X, File, FileCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-web-haptics";

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: Date;
}

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    category: string;
  }) => void;
  memory?: MemoryItem | null;
}

const PRESET_CATEGORIES = ["work", "personal", "projects", "ideas", "important"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = [".md", ".txt", ".pdf"];

interface FormValues {
  title: string;
  content: string;
  category: string;
}

function MemoryModalComponent({
  isOpen,
  onClose,
  onSubmit,
  memory,
}: MemoryModalProps) {
  const { trigger } = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: memory?.title || "",
      content: memory?.content || "",
      category: memory?.category || "",
    },
  });

  const content = watch("content");
  const category = watch("category");
  const fileNameRef = useRef<string | null>(null);
  const fileContentRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    trigger("nudge");
    reset({
      title: "",
      content: "",
      category: "",
    });
    fileNameRef.current = null;
    fileContentRef.current = null;
    setFileError(null);
    onClose();
  }, [onClose, trigger, reset]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileError(null);

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setFileError("File too large. Maximum size is 5MB.");
        return;
      }

      // Validate file type
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_TYPES.includes(ext)) {
        setFileError("Unsupported file type. Upload .md, .txt, or .pdf");
        return;
      }

      setIsLoading(true);
      fileNameRef.current = file.name;

      try {
        let text = "";

        if (ext === ".md" || ext === ".txt") {
          text = await file.text();
        } else if (ext === ".pdf") {
          text = await file.text();
          if (text.length < 50) {
            text = `[PDF content from: ${file.name}]\n\nNote: PDF text extraction is limited.`;
          }
        }

        fileContentRef.current = text;
        const currentContent = watch("content");
        const newContent = currentContent
          ? `${currentContent}\n\n${text}`
          : text;
        setValue("content", newContent);

        // Auto-fill title from filename if empty
        const currentTitle = watch("title");
        if (!currentTitle) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setValue("title", nameWithoutExt);
        }
      } catch (error) {
        console.error("Error reading file:", error);
        setFileError("Failed to read file. Please try again.");
        fileNameRef.current = null;
      } finally {
        setIsLoading(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [watch, setValue]
  );

  const removeFile = useCallback(() => {
    if (fileContentRef.current) {
      const currentContent = watch("content");
      const cleaned = currentContent
        .replace(fileContentRef.current, "")
        .replace(/\n\n$/, "")
        .replace(/^\n\n/, "");
      setValue("content", cleaned);
    }
    fileNameRef.current = null;
    fileContentRef.current = null;
    setFileError(null);
  }, [watch, setValue]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCategoryToggle = useCallback(
    (cat: string) => {
      if (category === cat) {
        setValue("category", ""); // Deselect
      } else {
        setValue("category", cat);
      }
    },
    [category, setValue]
  );

  const onFormSubmit = (data: FormValues) => {
    if (!data.content.trim()) return;
    trigger("success");
    onSubmit({ ...data, category: data.category });
    handleClose();
  };

  const isEditing = !!memory;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Memory" : "New Memory"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-4 py-4"
        >
          <div className="space-y-2 flex flex-col">
            <span className="text-sm font-medium">Title</span>
            <Input
              {...register("title")}
              placeholder="Title"
              className="w-full"
            />
          </div>

          <div className="space-y-2 flex flex-col">
            <span className="text-sm font-medium">Content</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
              className="hidden"
            />
            <Textarea
              {...register("content", {
                required: "Content is required",
              })}
              placeholder="What would you like to remember?"
              className="w-full min-h-[100px] resize-none"
            />
            {errors.content && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <X className="w-3 h-3" />
                {errors.content.message}
              </p>
            )}

            {fileError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <X className="w-3 h-3" />
                {fileError}
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-dashed">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Reading file...
                </span>
              </div>
            ) : fileNameRef.current ? (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-center w-10 h-10 bg-background rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileNameRef.current}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added to memory
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 hover:bg-background rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={triggerFileInput}
                className="w-full p-4 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-1 opacity-60">
                  <FileText className="w-5 h-5 -rotate-12" />
                  <FileCode className="w-5 h-5 rotate-12" />
                  <File className="w-6 h-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload .md, .txt, or .pdf
                </p>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryToggle(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-all",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category === cat && (
                  <X className="w-3 h-3 inline mr-1" />
                )}
                {cat}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!content.trim()}>
              {isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const MemoryModal = memo(MemoryModalComponent);