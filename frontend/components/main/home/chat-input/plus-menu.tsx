"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Paperclip, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PlusMenuProps {
  onFileSelect: () => void;
  webSearch: boolean;
  setWebSearch: (val: boolean) => void;
}

export const PlusMenu = React.memo(({ onFileSelect, webSearch, setWebSearch }: PlusMenuProps) => {
  const [open, setOpen] = React.useState(false);

  const handleFileClick = React.useCallback(() => {
    onFileSelect();
    setOpen(false);
  }, [onFileSelect]);

  const handleWebSearchToggle = React.useCallback(() => {
    setWebSearch(!webSearch);
    setOpen(false);
  }, [webSearch, setWebSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(triggerProps: React.ComponentPropsWithRef<"button">) => (
          <motion.button
            layoutId="plus-menu"
            id={triggerProps.id}
            ref={triggerProps.ref}
            onClick={(e) => {
              triggerProps.onClick?.(e);
            }}
            onKeyDown={triggerProps.onKeyDown}
            onPointerDown={triggerProps.onPointerDown}
            aria-label="More tools"
            aria-expanded={triggerProps["aria-expanded"]}
            aria-haspopup={triggerProps["aria-haspopup"]}
            aria-controls={triggerProps["aria-controls"]}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors active:scale-90"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        )}
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={12}
        className="w-48 p-1.5 bg-popover/90 backdrop-blur-xl border-border shadow-xl rounded-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col gap-0.5">
          <button
            onClick={handleFileClick}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.98]"
          >
            <Paperclip className="h-4 w-4" />
            <span>Attach file</span>
          </button>
          <button
            onClick={handleWebSearchToggle}
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
});

PlusMenu.displayName = "PlusMenu";
