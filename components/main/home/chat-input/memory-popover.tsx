"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemories } from "@/hooks/use-memories";
import type { MemoryItem } from "@/components/main/memory/memory-modal";
import { cn } from "@/lib/utils";

interface MemoryPopoverProps {
  onOpenMemory?: () => void;
  onMemoriesSelect?: (memoryIds: string[]) => void;
}

export function MemoryPopover({ onOpenMemory, onMemoriesSelect }: MemoryPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const { memories, isLoading } = useMemories();

  const toggleMemory = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 5) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onMemoriesSelect?.([...selected]);
    setSelected(new Set());
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) setSelected(new Set());
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
              selected.size > 0
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/70",
            )}
          >
            <Tooltip>
              <TooltipTrigger
                render={<div className="flex items-center justify-center h-full w-full"><Brain className="h-[14px] w-[14px]" /></div>}
              />
              <TooltipContent side="bottom" sideOffset={8}>
                Memory
              </TooltipContent>
            </Tooltip>
          </button>
        }
      />
      <AnimatePresence>
        {open && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={12}
            className="w-64 p-0 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Minimal header */}
              <div className="flex items-center justify-between px-3 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="h-[13px] w-[13px] text-muted-foreground" />
                  <span className="text-[12px] font-medium text-foreground">Memory</span>
                </div>
                {selected.size > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {selected.size}/5
                  </span>
                )}
              </div>

              {/* Scrollable memory list */}
              <div className="overflow-y-auto max-h-64 p-1.5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : memories.length === 0 ? (
                  <div className="py-5 text-center">
                    <p className="text-xs text-muted-foreground">No memories saved</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Add memories to use them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {memories.slice(0, 8).map((memory: MemoryItem) => {
                      const isSelected = selected.has(memory.id);
                      return (
                        <div
                          key={memory.id}
                          onClick={() => toggleMemory(memory.id)}
                          className={cn(
                            "group flex items-start gap-2 rounded-lg p-2 transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary/8 border border-primary/20"
                              : "hover:bg-muted/60 border border-transparent",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 group-hover:border-muted-foreground/60",
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {memory.title && (
                              <p className="text-[12px] font-medium text-foreground truncate">
                                {memory.title}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                              {memory.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Use button */}
              {selected.size > 0 && (
                <div className="px-1.5 pb-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    Use {selected.size} memory{selected.size !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
