"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ChipData } from "./data";

interface ChipProps {
  chip: ChipData;
  onOpen: (chip: ChipData) => void;
}

export const Chip = memo(function Chip({ chip, onOpen }: ChipProps) {
  const Icon = chip.icon;

  // chip is a stable module-level object ref; onOpen is setActiveChip (stable
  // from useState), so this callback never re-creates unnecessarily.
  const handleClick = useCallback(() => onOpen(chip), [chip, onOpen]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-card",
        "px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground",
        "hover:border-foreground/20 hover:bg-accent/50 hover:text-foreground",
        "transition-colors duration-150",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {chip.label}
    </button>
  );
});
