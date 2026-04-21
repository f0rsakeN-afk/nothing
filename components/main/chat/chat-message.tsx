'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, Pencil, X, Loader2, Globe, AlertCircle, Check as CheckIcon, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiResponseFormatter } from "./ai-response-formatter";
import { MessageActions } from "./message-actions";
import { MCPToolResultCard } from "./mcp-tool-result-card";
import { BorderTrail } from "@/components/ui/border-trail";
import { ShimmerText } from "@/components/odysseyui/text-shimmer";
import { Card, CardContent } from "@/components/ui/card";
import { WebSearchResults } from "./web-search-results";
import { Steps, StepsItem, StepsContent, StepsBar } from "@/components/odysseyui/steps";
import { AILoader } from "./ai-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "idle" | "submitting" | "streaming" | "done" | "error";

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  status: "running" | "completed" | "error";
  result?: unknown;
  error?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
  status?: MessageStatus;
  chatId?: string;
  toolResults?: ToolResult[];
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

export const SearchLoadingState = memo(function SearchLoadingState({
  query,
}: {
  query?: string;
}) {
  return (
    <div className="relative w-full my-4 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <BorderTrail className="bg-linear-to-l from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600" size={80} />
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 shrink-0">
          <BorderTrail className="bg-linear-to-l from-blue-200 via-blue-500 to-blue-200" size={40} />
          <Globe className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          <ShimmerText
            text={query ? `Searching: ${query}` : "Searching the web..."}
            className="text-sm font-medium text-foreground"
            duration={1.5}
          />
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-muted-foreground/20 animate-pulse"
                style={{
                  width: `${Math.random() * 40 + 20}px`,
                  animationDelay: `${i * 0.2}s`,
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
  const isActive = status === "running" || status === "error";

  return (
    <Collapsible defaultOpen={isActive} className="w-full">
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-3 py-2.5 px-2 w-full rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          !isActive && "py-1.5"
        )}
      >
        {/* Status icon */}
        <div
          className={cn(
            "relative h-7 w-7 rounded-full flex items-center justify-center shrink-0",
            status === "running" && "bg-blue-50 dark:bg-blue-950",
            status === "completed" && "bg-green-50 dark:bg-green-950",
            status === "error" && "bg-red-50 dark:bg-red-950"
          )}
        >
          {status === "running" && (
            <>
              <BorderTrail className="bg-linear-to-l from-blue-200 via-blue-500 to-blue-200" size={36} />
              <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
            </>
          )}
          {status === "completed" && (
            <CheckIcon className="h-3.5 w-3.5 text-green-500" />
          )}
          {status === "error" && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>

        {/* Tool name + status */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate text-left">{name}</p>
          {status === "running" && (
            <span className="shrink-0 text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">
              Running
            </span>
          )}
          {status === "error" && (
            <span className="shrink-0 text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md">
              Error
            </span>
          )}
        </div>

        {/* Collapse chevron (only when completed) */}
        {status === "completed" && (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        {status === "running" && (
          <div className="px-2 pb-2">
            <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden ml-9">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
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
  toolResults,
  isSearchMode,
  searchResults,
  steps,
}: {
  content: string;
  isStreaming?: boolean;
  status?: MessageStatus;
  messageId?: string;
  chatId?: string;
  toolResults?: ToolResult[];
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
        <div className="flex items-center gap-2 py-2 ml-2">
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
      {toolResults && toolResults.length > 0 && (
        <div className="my-3 space-y-2">
          {toolResults.map((toolResult) =>
            toolResult.status === "running" ? (
              <ToolProgressCard
                key={toolResult.toolCallId}
                name={toolResult.toolName}
                status={toolResult.status}
              />
            ) : (
              <MCPToolResultCard
                key={toolResult.toolCallId}
                toolName={toolResult.toolName}
                status={toolResult.status}
                result={toolResult.result}
                error={toolResult.error}
              />
            )
          )}
        </div>
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
          toolResults={message.toolResults}
          searchResults={message.searchResults}
          steps={message.steps}
        />
      )}
    </div>
  );
});
