"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowUp, Paperclip, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  className,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);
  const [isMultiline, setIsMultiline] = React.useState(false);

  const isEmpty = !value.trim();

  const syncHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scHeight = el.scrollHeight;
    el.style.height = `${Math.min(scHeight, 200)}px`;
    setIsMultiline(scHeight > 38);
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

  const PlusMenu = (
    <Popover>
      <PopoverTrigger
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors active:scale-90"
        aria-label="More tools"
      >
        <Plus className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-48 p-1.5 bg-popover/90 backdrop-blur-xl border-border shadow-xl rounded-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col gap-0.5">
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.98]">
            <Paperclip className="h-4 w-4" />
            <span>Attach file</span>
          </button>
          <button
            onClick={() => setWebSearch(!webSearch)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-all active:scale-[0.98]",
              webSearch
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Globe className="h-4 w-4" />
            <span>Search the web</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const SendButton = (
    <Tooltip>
      <TooltipTrigger
        onClick={handleSubmit}
        disabled={isEmpty}
        aria-label="Send message"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          isEmpty
            ? "text-muted-foreground/20 bg-transparent cursor-not-allowed"
            : "bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95",
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </TooltipTrigger>
      <AnimatePresence>
        {!isEmpty && (
          <TooltipContent
            side="top"
            sideOffset={12}
            className="bg-foreground text-background font-medium"
          >
            Send <span className="ml-1 opacity-50 text-[10px]">↵</span>
          </TooltipContent>
        )}
      </AnimatePresence>
    </Tooltip>
  );

  return (
    <TooltipProvider delay={500}>
      <motion.div
        layout
        initial={false}
        animate={{
          borderRadius: isMultiline ? 24 : 21,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        }}
        className={cn(
          "relative flex w-full transition-colors duration-300",
          "bg-muted/40 border border-border/50 shadow-sm backdrop-blur-md",
          "focus-within:bg-muted/60 focus-within:border-border/80",
          isMultiline ? "flex-col p-2" : "flex-row items-center h-[42px] px-1.5 py-1",
          className,
        )}
      >
        <motion.div
          layout
          className={cn(
            "flex flex-1 items-center min-w-0",
            isMultiline ? "flex-col items-stretch px-2 pt-1" : "flex-row px-1",
          )}
        >
          <div className="flex flex-1 items-center min-w-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {!isMultiline && (
                <motion.div
                  layoutId="plus-wrapper"
                  initial={{ opacity: 0, scale: 0.8, x: -5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center shrink-0 pr-1"
                >
                  {PlusMenu}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                rows={1}
                autoFocus
                className={cn(
                  "block w-full resize-none bg-transparent",
                  "py-1.5 text-sm leading-relaxed text-foreground",
                  "placeholder:text-transparent outline-none hide-scrollbar",
                )}
              />
              <motion.div
                layout
                className={cn(
                  "pointer-events-none absolute left-0 text-sm leading-relaxed text-muted-foreground/40 transition-colors duration-200",
                  isMultiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
                )}
              >
                <AnimatedPlaceholder
                  placeholders={PLACEHOLDERS}
                  active={isEmpty}
                  className="m-0"
                />
              </motion.div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {!isMultiline && (
                <motion.div
                  layoutId="send-wrapper"
                  initial={{ opacity: 0, scale: 0.8, x: 5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center shrink-0 pl-1"
                >
                  {SendButton}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {isMultiline && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center justify-between mt-1 px-1 pb-1"
            >
              <motion.div layoutId="plus-wrapper">
                {PlusMenu}
              </motion.div>
              <motion.div layoutId="send-wrapper">
                {SendButton}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}
