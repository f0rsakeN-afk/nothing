"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  isLoading?: boolean;
}

export const SendButton = React.memo(({ onSubmit, disabled, isLoading }: SendButtonProps) => {
  return (
    <button
      onClick={onSubmit}
      disabled={disabled || isLoading}
      aria-label="Send message"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isLoading
          ? "bg-red-500 text-white cursor-not-allowed"
          : disabled
            ? "bg-muted/60 text-muted-foreground/40 cursor-not-allowed"
            : "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
      )}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ArrowUp className="h-[14px] w-[14px]" strokeWidth={2.5} />
      )}
    </button>
  );
});

SendButton.displayName = "SendButton";
