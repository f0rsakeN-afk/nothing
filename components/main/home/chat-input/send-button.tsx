"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled || isLoading
          ? "bg-muted/60 text-muted-foreground/40 cursor-not-allowed"
          : "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 active:scale-95",
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
      )}
    </button>
  );
});

SendButton.displayName = "SendButton";
