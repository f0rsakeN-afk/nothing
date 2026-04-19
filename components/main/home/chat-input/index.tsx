"use client";

import * as React from "react";
import { useCallback } from "react";
import { Search, Loader2, ArrowRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SendButton } from "./send-button";
import { FilePreviews } from "./file-previews";
import { MemoryPopover } from "./memory-popover";
import { MoreOptionsPopover } from "./more-options-popover";
import { ChatActionsMenu, ActiveConnectorsPill } from "./actions-menu";
import { ModelSelector } from "./model-selector";
import { useServers } from "@/hooks/use-mcp-servers";
import { useUser } from "@stackframe/stack";
import { useChatSuggestions } from "@/hooks/use-chat-suggestions";
import { useSound } from "@/hooks/use-sound";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment, ChatInputProps } from "@/types/chat-input";
import type { ResponseStyle } from "./more-options-popover";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything...",
  className,
  isLoading = false,
  onOpenMemory,
  onMemoriesSelect,
  webSearchEnabled = false,
  onWebSearchToggle,
  projectId,
  onProjectIdChange,
  style = "normal",
  onStyleChange,
  currentModel,
  onModelChange,
}: ChatInputProps & {
  style?: ResponseStyle;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [focused, setFocused] = React.useState(false);
  const user = useUser();
  const { data: servers = [] } = useServers(user?.id);

  const handleSuggestionSelect = React.useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      textareaRef.current?.focus();
    },
    [onChange]
  );

  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    handleKeyDown: handleSuggestionKeyDown,
    handleSelect: handleSelectFromHook,
    recentSearches,
    clearRecentSearches,
  } = useChatSuggestions({ input: value, onSelect: handleSuggestionSelect });

  const { playSelect } = useSound();

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      playSelect();
      handleSelectFromHook(suggestion);
    },
    [playSelect, handleSelectFromHook]
  );

  const isEmpty = !value.trim() && files.length === 0;
  const showRecent = showSuggestions && value.trim().length === 0 && recentSearches.length > 0;
  const showDropdown = showSuggestions && suggestions.length > 0;

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
      } else {
        // Pass to suggestion handler for arrow/enter/escape keys
        handleSuggestionKeyDown(e);
      }
    },
    [handleSubmit, handleSuggestionKeyDown],
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
          focused ? "border-foreground/20" : "border-border shadow-xs",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          rows={1}
          placeholder={placeholder}
          autoFocus
          className={cn(
            "block w-full resize-none bg-transparent px-4 py-4 pr-20",
            "text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/40",
            "outline-none placeholder:font-light",
          )}
        />

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {(showDropdown || showRecent) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 z-50"
            >
              <div className="rounded-xl border border-border bg-popover shadow-md overflow-hidden">
                {/* Recent searches */}
                {showRecent && (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Recent
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((search, i) => (
                      <button
                        key={`recent-${search}-${i}`}
                        onClick={() => handleSuggestionClick(search)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors border-b border-border/40 last:border-0",
                          selectedIndex === i ? "bg-muted/60" : "hover:bg-muted/60"
                        )}
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-[13px] text-foreground truncate flex-1">
                          {search}
                        </p>
                        <X className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                  </>
                )}

                {/* Suggestions */}
                {showDropdown && !isSuggestionsLoading && suggestions.length > 0 && (
                  <>
                    {showRecent && (
                      <div className="px-4 py-1.5 border-b border-border/40">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Suggestions
                        </span>
                      </div>
                    )}
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={`${suggestion}-${i}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors border-b border-border/40 last:border-0",
                          selectedIndex === i ? "bg-muted/60" : "hover:bg-muted/60"
                        )}
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-[13px] text-foreground truncate flex-1">
                          {suggestion}
                        </p>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                  </>
                )}

                {isSuggestionsLoading && value.trim().length > 0 && (
                  <div className="flex items-center justify-center py-3 px-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 pb-3.5 -mt-0.5">
          {/* Left: action buttons */}
          <div className="flex items-center gap-1.5">
            {/* More options: Add file, Add to project, Style */}
            <MoreOptionsPopover
              onFileSelect={handleFileClick}
              onProjectSelect={onProjectIdChange}
              onStyleSelect={onStyleChange}
              currentProjectId={projectId}
              currentStyle={style}
            />

            {/* Memory popover */}
            <MemoryPopover
              onOpenMemory={onOpenMemory}
              onMemoriesSelect={onMemoriesSelect}
            />

            {/* Connectors popover */}
            <ChatActionsMenu
              onFileSelect={handleFileClick}
              webSearchEnabled={webSearchEnabled ?? false}
              onWebSearchToggle={onWebSearchToggle ?? (() => {})}
            />
          </div>

          {/* Right: send button + active connectors */}
          <div className="flex items-center gap-2">
            <ModelSelector currentModel={currentModel} onModelChange={onModelChange} />
            <ActiveConnectorsPill
              servers={servers}
              webSearchEnabled={webSearchEnabled ?? false}
            />
            <SendButton
              onSubmit={handleSubmit}
              disabled={isEmpty}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}