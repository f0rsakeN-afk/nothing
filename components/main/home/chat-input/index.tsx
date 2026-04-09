"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SendButton } from "./send-button";
import { FilePreviews } from "./file-previews";
import { Globe, Brain, Paperclip, X } from "lucide-react";

interface Attachment {
  file: File;
  id: string;
  preview?: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  webSearch?: boolean;
  setWebSearch: (val: boolean) => void;
  onOpenMemory?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  className,
  isLoading = false,
  webSearch = false,
  setWebSearch,
  onOpenMemory,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<Attachment[]>([]);

  const isEmpty = !value.trim() && files.length === 0;

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleFileClick = React.useCallback(
    () => fileInputRef.current?.click(),
    [],
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      const newFiles = selected.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      if (e.target) e.target.value = "";
    },
    [],
  );

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  }, []);

  const handleSubmit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    onSubmit(trimmed);
  }, [value, onSubmit, files.length]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className={cn("relative flex flex-col w-full", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {/* Attachments preview */}
      {files.length > 0 && (
        <div className="mb-2">
          <FilePreviews files={files} onRemove={removeFile} />
        </div>
      )}

      {/* Textarea */}
      <div
        className={cn(
          "w-full bg-muted/40 border border-border rounded-2xl",
          "focus-within:border-primary/50 transition-colors",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything..."
          autoFocus
          className={cn(
            "block w-full resize-none bg-transparent p-4 pb-0",
            "text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground/60 outline-none",
          )}
        />
      </div>

      {/* Bottom action bar */}
      <div
        className={cn(
          "flex items-center justify-between w-full mt-2 px-1",
        )}
      >
        {/* Left actions */}
        <div className="flex items-center gap-1">
          {/* File attach */}
          <button
            type="button"
            onClick={handleFileClick}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Attach files"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>

          {/* Web Search */}
          <button
            type="button"
            onClick={() => setWebSearch(!webSearch)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors",
              webSearch
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            title="Web search"
          >
            <Globe className="h-[18px] w-[18px]" />
            {webSearch && (
              <span className="text-xs font-medium">Searching</span>
            )}
          </button>

          {/* Memory */}
          {onOpenMemory && (
            <button
              type="button"
              onClick={onOpenMemory}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Use memory"
            >
              <Brain className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Clear button when there's content */}
          {value.trim() && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                textareaRef.current?.focus();
              }}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Send button */}
          <SendButton
            onSubmit={handleSubmit}
            disabled={isEmpty || isLoading}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}