"use client";

import { memo, useCallback } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptCardProps {
  text: string;
  onSelect: (prompt: string) => void;
}

export const PromptCard = memo(function PromptCard({
  text,
  onSelect,
}: PromptCardProps) {
  // text is a string literal constant; onSelect is a stable useCallback from
  // PromptModal, so this callback is stable for the modal's lifetime.
  const handleClick = useCallback(() => onSelect(text), [text, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex w-full items-start justify-between gap-3 rounded-xl",
        "border border-border bg-background p-3.5 text-left",
        "hover:border-foreground/20 hover:bg-accent/60",
        "transition-colors duration-150",
      )}
    >
      <span className="text-[13px] leading-snug text-foreground/80 group-hover:text-foreground">
        {text}
      </span>
      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-foreground/60" />
    </button>
  );
});
