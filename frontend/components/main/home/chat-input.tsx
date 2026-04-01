"use client";

import * as React from "react";
import { ArrowUp, Paperclip, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedPlaceholder } from "@/components/ui/animated-placeholder";

const PLACEHOLDERS = [
  "Ask anything…",
  "What are you building today?",
  "Explain this like I'm five…",
  "Why is my code crying at 2am?",
  "Debug this, please. I'm begging.",
  "Help me write something brilliant…",
  "What's the best way to do this?",
  "I swear this worked yesterday…",
  "Turn this chaos into something clean.",
  "Summarize, simplify, or just vibe with me.",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// ToolButton
// base-ui's TooltipTrigger renders a <button> itself — pass all button props
// directly onto it instead of nesting a <button> inside (avoids invalid HTML).
// ---------------------------------------------------------------------------

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const ToolButton = React.memo(function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl  ",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground",
        )}
      >
        <Icon className="h-[15px] w-[15px]" />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
});

// ---------------------------------------------------------------------------
// ChatInput
// ---------------------------------------------------------------------------

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything…",
  className,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);

  const isEmpty = !value.trim();

  // Keep textarea height in sync with content
  const syncHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  React.useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleSubmit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }, [value, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, isComposing],
  );

  const toggleWebSearch = React.useCallback(
    () => setWebSearch((prev) => !prev),
    [],
  );

  return (
    <TooltipProvider delay={500}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-2xl border border-border bg-card",
          "shadow-xs transition-all duration-200",
          "focus-within:border-foreground/15 focus-within:shadow-md",
          className,
        )}
      >
        {/* ── Textarea ──────────────────────────────────────────── */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder=""
            aria-label={placeholder}
            rows={1}
            className={cn(
              "block w-full resize-none bg-transparent",
              "px-4 pt-4 pb-2",
              "text-[14px] leading-relaxed text-foreground",
              "outline-none hide-scrollbar",
            )}
          />
          <div className="pointer-events-none absolute left-0 top-0 px-4 pt-4">
            <AnimatedPlaceholder
              placeholders={PLACEHOLDERS}
              active={isEmpty}
              className="m-0 text-[14px] leading-relaxed text-muted-foreground/40"
            />
          </div>
        </div>

        {/* ── Toolbar ───────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 px-3 pb-3 pt-1">
          {/* Left — utility tools */}
          <ToolButton icon={Paperclip} label="Attach file" />
          <ToolButton
            icon={Globe}
            label={webSearch ? "Web search on" : "Search the web"}
            active={webSearch}
            onClick={toggleWebSearch}
          />

          <div className="flex-1" />

          {/* Send — same pattern: TooltipTrigger is the button */}
          <Tooltip>
            <TooltipTrigger
              onClick={handleSubmit}
              disabled={isEmpty}
              aria-label="Send message"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                "transition-all duration-150",
                isEmpty
                  ? "cursor-not-allowed bg-muted text-muted-foreground/25"
                  : "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.93]",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </TooltipTrigger>
            {!isEmpty && (
              <TooltipContent side="top">
                Send <span className="ml-0.5 opacity-50">↵</span>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
