"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceButtonProps {
  isListening: boolean;
  toggleListening: () => void;
  isSupported: boolean;
}

export const VoiceButton = React.memo(({ isListening, toggleListening, isSupported }: VoiceButtonProps) => {
  if (!isSupported) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps: React.ComponentPropsWithRef<"button">) => (
          <motion.button
            layoutId="voice-button"
            id={triggerProps.id}
            ref={triggerProps.ref}
            onClick={(e) => {
              triggerProps.onClick?.(e);
              toggleListening();
            }}
            onKeyDown={triggerProps.onKeyDown}
            onPointerDown={triggerProps.onPointerDown}
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              isListening 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                : "text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
            )}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isListening ? (
                <motion.div
                  key="mic-on"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="relative flex items-center justify-center"
                >
                  <Mic className="h-4 w-4" />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 bg-red-400 rounded-full -z-10"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="mic-off"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Mic className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      />
      <TooltipContent
        side="top"
        sideOffset={12}
        className="bg-foreground text-background font-medium"
      >
        {isListening ? "Stop Listening" : "Voice Input"}
      </TooltipContent>
    </Tooltip>
  );
});

VoiceButton.displayName = "VoiceButton";
