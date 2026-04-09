"use client";

import React, { useRef, useEffect, ReactNode, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minimize2, Maximize2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReasoningPartViewProps {
  text: string;
  isComplete: boolean;
  expandedOverride?: boolean;
  isFullscreen?: boolean;
  setIsFullscreen?: (v: boolean) => void;
  setIsExpanded?: (v: boolean) => void;
}

const SpinnerIcon = memo(() => (
  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
));
SpinnerIcon.displayName = 'SpinnerIcon';

// Helper function to check if content is empty (just newlines)
const isEmptyContent = (content: string): boolean => {
  return !content || content.trim() === '' || /^\n+$/.test(content);
};

export const ReasoningPartView: React.FC<ReasoningPartViewProps> = memo(
  ({ text, isComplete, expandedOverride, isFullscreen = false, setIsFullscreen, setIsExpanded }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoExpanded, setAutoExpanded] = React.useState(true);
    const collapseTimerRef = useRef<number | null>(null);

    // isThinking drives the header spinner and label. For token-by-token models
    // isComplete flickers true/false between every token because each token part
    // gets state:'done' the moment it's emitted. A 150ms debounce on the false→true
    // transition for isThinking absorbs those sub-token gaps so the header never
    // flickers "Thinking ↔ Reasoning" mid-stream.
    const [isThinking, setIsThinking] = React.useState(!isComplete);
    const thinkingTimerRef = useRef<number | null>(null);

    useEffect(() => {
      if (!isComplete) {
        if (thinkingTimerRef.current != null) {
          window.clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
        setIsThinking(true);
      } else {
        if (thinkingTimerRef.current == null) {
          thinkingTimerRef.current = window.setTimeout(() => {
            setIsThinking(false);
            thinkingTimerRef.current = null;
          }, 150);
        }
      }
      return () => {
        if (thinkingTimerRef.current != null) {
          window.clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
      };
    }, [isComplete, text]);

    // Auto-scroll to bottom when new content is added during reasoning
    useEffect(() => {
      if (isThinking && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [isThinking, text]);

    // Also scroll when details change, even if isThinking doesn't change
    useEffect(() => {
      if (isThinking && scrollRef.current && text && text.length > 0) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }, [text, isThinking]);

    const hasNonEmptyReasoning = text && !isEmptyContent(text);
    const isExpanded = expandedOverride ?? autoExpanded;

    // Avoid "close then open" flicker when providers emit back-to-back reasoning parts.
    // We only auto-collapse after reasoning stays complete for a moment.
    useEffect(() => {
      if (collapseTimerRef.current != null) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }

      // Manual toggle always wins
      if (expandedOverride !== undefined) return;

      if (isThinking) {
        setAutoExpanded(true);
        return;
      }

      collapseTimerRef.current = window.setTimeout(() => {
        setAutoExpanded(false);
        collapseTimerRef.current = null;
      }, 900);

      return () => {
        if (collapseTimerRef.current != null) {
          window.clearTimeout(collapseTimerRef.current);
          collapseTimerRef.current = null;
        }
      };
    }, [expandedOverride, isThinking, text]);

    // Hide empty reasoning only once we're done thinking; during streaming we still want the "Thinking" UI.
    if (!hasNonEmptyReasoning && !isThinking) {
      return null;
    }

    return (
      <div className="my-2">
        <div className={cn('bg-accent', 'border border-border/80 rounded-lg overflow-hidden')}>
          {/* Header - Always visible */}
          <div
            onClick={() => !isThinking && setIsExpanded?.(!isExpanded)}
            className={cn(
              'flex items-center justify-between py-2 px-2.5',
              !isThinking && 'cursor-pointer hover:bg-muted/50 transition-colors',
              'bg-background/80',
            )}
          >
            <div className="flex items-center gap-2">
              {isThinking ? (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-1.5 py-0.5 rounded-md',
                      'border border-border/80',
                      'bg-muted/50',
                      'text-muted-foreground',
                      'flex items-center gap-1.5',
                      'animate-pulse',
                    )}
                  >
                    <div className="size-2.5 text-muted-foreground">
                      <SpinnerIcon />
                    </div>
                    <span className="text-xs font-normal">Thinking</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-muted-foreground" strokeWidth={2} />
                  <div className="text-xs font-normal text-muted-foreground">Reasoning</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isThinking && (
                <div className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </div>
              )}

              {(isThinking || isExpanded) && setIsFullscreen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(!isFullscreen);
                  }}
                  className="p-0.5 hover:bg-muted rounded text-muted-foreground transition-colors"
                  aria-label={isFullscreen ? 'Minimize' : 'Maximize'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-3 text-muted-foreground" strokeWidth={2} />
                  ) : (
                    <Maximize2 className="size-3 text-muted-foreground" strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content - Shown when in progress or when expanded */}
          <AnimatePresence initial={false}>
            {(isThinking || isExpanded) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div>
                  <div className="h-px w-full bg-border/80"></div>
                  <div
                    ref={scrollRef}
                    className={cn(
                      'overflow-y-auto',
                      'scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-border',
                      'scrollbar-track-transparent',
                      {
                        'max-h-[180px] rounded-b-lg': !isFullscreen,
                        'max-h-[60vh] rounded-b-lg': isFullscreen,
                      },
                    )}
                  >
                    <div className="px-2.5 py-2 text-xs leading-relaxed">
                      <div className="text-muted-foreground prose prose-sm max-w-none">
                        {hasNonEmptyReasoning ? (
                          !isThinking ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground whitespace-pre-wrap wrap-break-words">{text}</p>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground/70">Thinking…</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

ReasoningPartView.displayName = 'ReasoningPartView';
