"use client";

import * as React from "react";
import { Plus, Paperclip } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PlusMenuProps {
  onFileSelect: () => void;
}

export const PlusMenu = React.memo(({ onFileSelect }: PlusMenuProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
          "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70",
        )}
      >
        <Plus className="h-[14px] w-[14px]" />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={12}
        className="w-48 p-1.5"
      >
        <button
          onClick={() => {
            onFileSelect();
            setOpen(false);
          }}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md cursor-pointer"
        >
          <Paperclip className="h-[14px] w-[14px] shrink-0" />
          <span className="font-medium">Attach file</span>
        </button>
      </PopoverContent>
    </Popover>
  );
});

PlusMenu.displayName = "PlusMenu";
