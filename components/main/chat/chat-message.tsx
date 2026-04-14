'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, Pencil, X, Loader2, Globe, AlertCircle, Check as CheckIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiResponseFormatter } from "./ai-response-formatter";
import { MessageActions } from "./message-actions";
import { BorderTrail } from "@/components/ui/border-trail";
import { ShimmerText } from "@/components/odysseyui/text-shimmer";
import { Card, CardContent } from "@/components/ui/card";
import { WebSearchResults } from "./web-search-results";
import { Steps, StepsItem, StepsContent, StepsBar } from "@/components/odysseyui/steps";
import { AILoader } from "./ai-loader";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "idle" | "submitting" | "streaming" | "done" | "error";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  status?: MessageStatus;
  chatId?: string;
  toolProgress?: {
    name: string;
    status: "running" | "completed" | "error";
    progress?: number;
  };
  searchResults?: SearchResult[];
  steps?: Array<{ step: string; status: string; message: string }>;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine?: string;
  publishedDate?: string;
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Search Loading State (shown during web search)
// ---------------------------------------------------------------------------

export const SearchLoadingState = memo(function SearchLoadingState({
  query,
}: {
  query?: string;
}) {
  return (
    <div className="relative w-full my-4 p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 dark:bg-primary/20">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1.5 flex-1">
          <ShimmerText
            text={query ? `Searching: ${query}` : "Searching the web..."}
            className="text-sm font-medium"
            duration={1.5}
          />
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-muted-foreground/20 animate-pulse"
                style={{
                  width: `${Math.random() * 30 + 20}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Tool Progress Card
// ---------------------------------------------------------------------------

export const ToolProgressCard = memo(function ToolProgressCard({
  name,
  status,
  progress,
}: {
  name: string;
  status: "running" | "completed" | "error";
  progress?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-3 px-2">
      <div
        className={cn(
          "relative h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          status === "running" && "bg-blue-50 dark:bg-blue-950",
          status === "completed" && "bg-green-50 dark:bg-green-950",
          status === "error" && "bg-red-50 dark:bg-red-950"
        )}
      >
        {status === "running" && (
          <>
            <BorderTrail className="bg-linear-to-l from-blue-200 via-blue-500 to-blue-200" size={40} />
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </>
        )}
        {status === "completed" && (
          <CheckIcon className="h-4 w-4 text-green-500" />
        )}
        {status === "error" && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {status === "running" && progress !== undefined && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
        </div>
        {status === "running" && (
          <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Streaming Status Indicator
// ---------------------------------------------------------------------------

export const StreamingStatusIndicator = memo(function StreamingStatusIndicator({
  status,
  isSearchMode,
}: {
  status: MessageStatus;
  isSearchMode?: boolean;
}) {
  if (status !== "streaming") return null;

  if (isSearchMode) {
    return <SearchLoadingState />;
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3">
      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      <span className="text-xs text-muted-foreground">Generating response...</span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// UserMessage
// ---------------------------------------------------------------------------

interface UserMessageProps {
  content: string;
  status?: MessageStatus;
  onEdit?: (newContent: string) => void;
}

const UserMessage = memo(function UserMessage({
  content,
  status,
  onEdit,
}: UserMessageProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleEdit = useCallback(() => {
    setDraft(content);
    setEditing(true);
  }, [content]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== content) onEdit?.(trimmed);
    setEditing(false);
  }, [draft, content, onEdit]);

  const handleCancel = useCallback(() => {
    setDraft(content);
    setEditing(false);
  }, [content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") handleCancel();
    },
    [handleSave, handleCancel],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    },
    [],
  );

  const isSubmitting = status === "submitting";

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="flex w-full max-w-[75%] flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            className={cn(
              "w-full resize-none overflow-hidden rounded-2xl rounded-tr-sm",
              "bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground",
              "outline-none ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
            )}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5 px-2 sm:px-0">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground shadow-xs flex items-center gap-2">
        {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
        {content}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/user-msg:opacity-100">
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy message"}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleEdit}
          aria-label="Edit message"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// AssistantMessage
// ---------------------------------------------------------------------------

const AssistantMessage = memo(function AssistantMessage({
  content,
  isStreaming,
  status,
  messageId,
  chatId,
  toolProgress,
  isSearchMode,
  searchResults,
  steps,
}: {
  content: string;
  isStreaming?: boolean;
  status?: MessageStatus;
  messageId?: string;
  chatId?: string;
  toolProgress?: Message["toolProgress"];
  isSearchMode?: boolean;
  searchResults?: SearchResult[];
  steps?: Array<{ step: string; status: string; message: string }>;
}) {
  const getStepIcon = (stepType: string, stepStatus: string) => {
    const isComplete = stepStatus === "complete";
    const isActive = stepStatus === "start";
    const isSkipped = stepStatus === "skipped";

    const baseClass = "shrink-0";

    if (isSkipped) {
      return (
        <div className={cn(baseClass, "w-5 h-5 rounded-full bg-muted flex items-center justify-center")}>
          <span className="text-[10px] text-muted-foreground">—</span>
        </div>
      );
    }

    if (isComplete) {
      return (
        <div className={cn(baseClass, "w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center")}>
          <CheckIcon className="w-3 h-3 text-green-500" />
        </div>
      );
    }

    if (isActive) {
      if (stepType === "search") {
        return (
          <div className={cn(baseClass, "w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center")}>
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          </div>
        );
      }
      if (stepType === "ai") {
        return (
          <div className={cn(baseClass, "w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center")}>
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
        );
      }
    }

    return (
      <div className={cn(baseClass, "w-5 h-5 rounded-full bg-muted flex items-center justify-center")}>
        <span className="text-[10px] text-muted-foreground">—</span>
      </div>
    );
  };

  const getStepTextColor = (stepStatus: string) => {
    switch (stepStatus) {
      case "complete":
        return "text-foreground";
      case "start":
        return "text-foreground";
      case "skipped":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="group/assistant-msg min-w-0 sm:max-w-[97%]">
      <StreamingStatusIndicator status={status || "idle"} isSearchMode={isSearchMode} />
      {isStreaming && (
        <div className="flex items-center justify-center py-4">
          <AILoader />
        </div>
      )}
      {steps && steps.length > 0 && (
        <div className="my-3 flex items-center gap-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.step}>
              {/* Icon */}
              <div className="flex items-center gap-1.5">
                {getStepIcon(step.step, step.status)}
                <span className={cn("text-xs", getStepTextColor(step.status))}>
                  {step.message}
                </span>
              </div>
              {/* Connector */}
              {idx < steps.length - 1 && (
                <div className={cn(
                  "h-[2px] w-4 rounded-full",
                  steps[idx + 1]?.status === "complete" ? "bg-green-500/40" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      {toolProgress && (
        <ToolProgressCard
          name={toolProgress.name}
          status={toolProgress.status}
          progress={toolProgress.progress}
        />
      )}
      {searchResults && searchResults.length > 0 && (
        <WebSearchResults results={searchResults} />
      )}
      <AiResponseFormatter content={content} isStreaming={isStreaming} />
      {!isStreaming && messageId && (
        <MessageActions
          content={content}
          messageId={messageId}
          chatId={chatId}
        />
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: Message;
  chatId?: string;
  onEdit?: (id: string, newContent: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  chatId: chatIdProp,
  onEdit,
}: ChatMessageProps) {
  const handleEdit = useCallback(
    (newContent: string) => onEdit?.(message.id, newContent),
    [message.id, onEdit],
  );

  // Use passed chatId or fallback to message.chatId
  const chatId = chatIdProp || message.chatId;

  return (
    <div
      className={cn(
        "group/user-msg w-full",
        message.role === "user" ? "py-2" : "py-4"
      )}
    >
      {message.role === "user" ? (
        <UserMessage content={message.content} status={message.status} onEdit={handleEdit} />
      ) : (
        <AssistantMessage
          content={message.content}
          isStreaming={message.isStreaming}
          status={message.status}
          messageId={message.id}
          chatId={chatId}
          toolProgress={message.toolProgress}
          searchResults={message.searchResults}
          steps={message.steps}
        />
      )}
    </div>
  );
});
