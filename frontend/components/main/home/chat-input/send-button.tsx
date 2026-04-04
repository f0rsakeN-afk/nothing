"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

export const SendButton = React.memo(({ onSubmit, disabled }: SendButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps: React.ComponentPropsWithRef<"button">) => (
          <motion.button
            layoutId="send-button"
            id={triggerProps.id}
            ref={triggerProps.ref}
            onClick={(e) => {
              triggerProps.onClick?.(e);
              onSubmit();
            }}
            onKeyDown={triggerProps.onKeyDown}
            onPointerDown={triggerProps.onPointerDown}
            disabled={disabled}
            aria-label="Send message"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200",
              disabled
                ? "text-muted-foreground/20 bg-transparent cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      />
      <AnimatePresence>
        {!disabled && (
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
});

SendButton.displayName = "SendButton";
