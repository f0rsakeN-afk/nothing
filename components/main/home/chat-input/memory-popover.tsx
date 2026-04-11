"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
              selected.size > 0
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/70",
            )}
            title="Memory"
          >
            <Brain className="h-[18px] w-[18px]" />
          </button>
        }
      />
      <AnimatePresence>
        {open && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={12}
            className="w-80 p-0 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Minimal header */}
              <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="h-[15px] w-[15px] text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Memory</span>
                </div>
                {selected.size > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {selected.size}/5
                  </span>
                )}
              </div>

              {/* Scrollable memory list */}
              <div className="overflow-y-auto max-h-72 p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : memories.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">No memories saved</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
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
                            "group flex items-start gap-2.5 rounded-xl p-2.5 transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary/8 border border-primary/20"
                              : "hover:bg-muted/60 border border-transparent",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 group-hover:border-muted-foreground/60",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {memory.title && (
                              <p className="text-[13px] font-medium text-foreground truncate">
                                {memory.title}
                              </p>
                            )}
                            <p className="text-[12px] text-muted-foreground line-clamp-2 leading-snug">
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
                <div className="px-2 pb-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
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
