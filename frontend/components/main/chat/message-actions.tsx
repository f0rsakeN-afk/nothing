"use client";

import { memo, useState, useCallback } from "react";
import { Copy, Check, Volume2, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageActionsProps {
  content: string;
  className?: string;
}

/**
 * MessageActions component for AI responses.
 * Provides Copy, Text-to-Speech, and Feedback (Like/Dislike) functionality.
 */
export const MessageActions = memo(function MessageActions({
  content,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [content]);

  const handleVoice = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      window.speechSynthesis.speak(utterance);
    }
  }, [content]);

  const handleLike = useCallback(() => {
    setFeedback((prev) => (prev === "like" ? null : "like"));
  }, []);

  const handleDislike = useCallback(() => {
    setFeedback((prev) => (prev === "dislike" ? null : "dislike"));
  }, []);

  return (
    <TooltipProvider delay={400}>
      <div
        className={cn(
          "mt-3 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/assistant-msg:opacity-100",
          className,
        )}
      >
        {/* Copy Action */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy response"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 hover:bg-muted/80 hover:text-muted-foreground focus-visible:bg-muted/80"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {copied ? "Copied!" : "Copy response"}
          </TooltipContent>
        </Tooltip>

        {/* Voice Action */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleVoice}
            aria-label="Listen to response"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 hover:bg-muted/80 hover:text-muted-foreground focus-visible:bg-muted/80"
          >
            <Volume2 className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Listen to response
          </TooltipContent>
        </Tooltip>

        {/* Like Action */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleLike}
            aria-label="Good response"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus-visible:bg-muted/80",
              feedback === "like"
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
          >
            <ThumbsUp className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Good response
          </TooltipContent>
        </Tooltip>

        {/* Dislike Action */}
        <Tooltip>
          <TooltipTrigger
            onClick={handleDislike}
            aria-label="Poor response"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus-visible:bg-muted/80",
              feedback === "dislike"
                ? "text-destructive"
                : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
          >
            <ThumbsDown className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Poor response
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});
