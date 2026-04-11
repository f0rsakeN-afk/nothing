"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SendButton } from "./send-button";
import { FilePreviews } from "./file-previews";
import { Paperclip, Globe } from "lucide-react";
import { MemoryPopover } from "./memory-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onOpenMemory?: () => void;
  onMemoriesSelect?: (memoryIds: string[]) => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything...",
  className,
  isLoading = false,
  onOpenMemory,
  onMemoriesSelect,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [focused, setFocused] = React.useState(false);

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
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
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
        <div className="mb-3">
          <FilePreviews files={files} onRemove={removeFile} />
        </div>
      )}

      {/* Input container */}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl border",
          "bg-background transition-all duration-300 ease-out",
          focused
            ? "border-foreground/20 shadow-sm ring-2 ring-foreground/[0.06]"
            : "border-border shadow-xs",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={1}
          placeholder={placeholder}
          autoFocus
          className={cn(
            "block w-full resize-none bg-transparent px-4 py-4 pr-28",
            "text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/40",
            "outline-none placeholder:font-light",
          )}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 pb-3.5 -mt-0.5">
          {/* Left: mode buttons */}
          <div className="flex items-center gap-1">
            {/* File attach */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted/70 transition-all duration-200 active:scale-95"
                  >
                    <Paperclip className="h-[18px] w-[18px]" />
                  </button>
                }
              />
              <TooltipContent side="bottom" sideOffset={8}>
                Attach files
              </TooltipContent>
            </Tooltip>

            {/* Memory popover */}
            <MemoryPopover
              onOpenMemory={onOpenMemory}
              onMemoriesSelect={onMemoriesSelect}
            />
          </div>

          {/* Right: send button */}
          <SendButton
            onSubmit={handleSubmit}
            disabled={isEmpty}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
