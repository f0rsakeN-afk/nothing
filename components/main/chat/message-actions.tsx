"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Copy, Check, Volume2, Pause, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Strip markdown/rich text formatting for clean speech
function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  return text
    // Remove markdown emphasis: *text* or **text**
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Remove headers markers
    .replace(/^#+\s+/gm, "")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove list markers
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Clean up extra whitespace
    .replace(/\s+/g, " ")
    .trim();
}

interface MessageActionsProps {
  content: string;
  messageId?: string;
  chatId?: string;
  initialReaction?: "like" | "dislike" | null;
  className?: string;
}

/**
 * MessageActions component for AI responses.
 * Provides Copy, Text-to-Speech, and Feedback (Like/Dislike) functionality.
 */
export const MessageActions = memo(function MessageActions({
  content,
  messageId,
  chatId,
  initialReaction = null,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(initialReaction);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Use ref to track mounted state and avoid state updates after unmount
  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup speech and timeouts on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Reset speaking state when messageId changes (new message loaded)
  useEffect(() => {
    if (messageId) {
      setIsSpeaking(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [messageId]);

  // Handle page visibility - stop speech when page is hidden
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        if (isMountedRef.current) {
          setIsSpeaking(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      if (!isMountedRef.current) return;

      setCopied(true);

      // Clear existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopied(false);
        }
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [content]);

  const handleVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    // If currently speaking, stop it
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
      return;
    }

    // Clean the content and speak
    const cleanContent = cleanTextForSpeech(content);
    if (!cleanContent) return;

    const utterance = new SpeechSynthesisUtterance(cleanContent);
    utterance.rate = 1;
    utterance.pitch = 1;
    utteranceRef.current = utterance;

    // Use event handlers that check mounted state
    utterance.onstart = () => {
      if (isMountedRef.current) {
        setIsSpeaking(true);
      }
    };

    utterance.onend = () => {
      if (isMountedRef.current) {
        setIsSpeaking(false);
      }
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      // Ignore 'interrupted' errors - they happen when we cancel speech intentionally
      if (event.error === "interrupted") return;
      if (isMountedRef.current) {
        setIsSpeaking(false);
      }
      utteranceRef.current = null;
    };

    // Cancel any ongoing speech before starting new one
    synth.cancel();
    synth.speak(utterance);
  }, [content, isSpeaking]);

  const handleReaction = useCallback(async (reaction: "like" | "dislike") => {
    if (!messageId || !chatId) return;

    // Optimistic update
    const newFeedback = feedback === reaction ? null : reaction;
    setFeedback(newFeedback);

    try {
      const res = await fetch(`/api/messages/${messageId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction, chatId }),
      });

      if (!res.ok) {
        // Revert on error
        setFeedback(feedback);
      }
    } catch {
      // Revert on error
      setFeedback(feedback);
    }
  }, [messageId, chatId, feedback]);

  const handleLike = useCallback(() => handleReaction("like"), [handleReaction]);
  const handleDislike = useCallback(() => handleReaction("dislike"), [handleReaction]);

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
            aria-label={isSpeaking ? "Stop" : "Listen to response"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus-visible:bg-muted/80",
              isSpeaking
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
          >
            {isSpeaking ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {isSpeaking ? "Stop" : "Listen to response"}
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
