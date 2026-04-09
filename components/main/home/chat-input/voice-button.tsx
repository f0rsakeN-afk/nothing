"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, AlertCircle } from "lucide-react";
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
  audioLevel?: number;
  errorMessage?: string | null;
}

export const VoiceButton = React.memo(({ isListening, toggleListening, isSupported, audioLevel = 0, errorMessage }: VoiceButtonProps) => {
  if (!isSupported) return null;

  const showError = !!errorMessage;

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
                : showError
                ? "bg-destructive/10 text-destructive"
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
                  {/* Audio level indicator rings */}
                  {audioLevel > 0.05 && (
                    <>
                      <motion.div
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{
                          scale: 1 + audioLevel * 1.5,
                          opacity: 0.3 - audioLevel * 0.2,
                        }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 bg-red-400 rounded-full -z-10"
                      />
                      {audioLevel > 0.3 && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0.3 }}
                          animate={{
                            scale: 1 + audioLevel * 2,
                            opacity: 0.15 - audioLevel * 0.1,
                          }}
                          transition={{ repeat: Infinity, duration: 0.6, ease: "easeOut" }}
                          className="absolute inset-0 bg-red-300 rounded-full -z-20"
                        />
                      )}
                    </>
                  )}
                </motion.div>
              ) : showError ? (
                <motion.div
                  key="error"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <AlertCircle className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="mic-off"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <MicOff className="h-4 w-4" />
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
        {showError ? errorMessage : isListening ? "Stop Listening" : "Voice Input"}
      </TooltipContent>
    </Tooltip>
  );
});

VoiceButton.displayName = "VoiceButton";
