"use client";

import { memo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromptCard } from "./prompt-card";
import type { ChipData } from "./data";

interface PromptModalProps {
  chip: ChipData | null;
  onClose: () => void;
  // Called with the full prompt text; parent handles closing + filling input.
  onSelect: (prompt: string) => void;
}

export const PromptModal = memo(function PromptModal({
  chip,
  onClose,
  onSelect,
}: PromptModalProps) {
  // onClose is useCallback([], []) in the page — always stable.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const Icon = chip?.icon;

  return (
    <Dialog open={chip !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {chip?.label}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Example prompts
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {chip?.prompts.map((prompt) => (
            <PromptCard key={prompt} text={prompt} onSelect={onSelect} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});
