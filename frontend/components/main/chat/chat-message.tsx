"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiResponseFormatter } from "./ai-response-formatter";
import { MessageActions } from "./message-actions";

/* remove this later on  */
import { FileSearch } from "lucide-react";
import {
  Steps,
  StepsTrigger,
  StepsContent,
  StepsBar,
  StepsItem,
} from "@/components/odysseyui/steps";

import {
  ThoughtChain,
  ThoughtChainStep,
  ThoughtChainTrigger,
  ThoughtChainContent,
  ThoughtChainItem,
} from "@/components/odysseyui/thought-chain";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isStreaming?: boolean; // true while SSE chunks are arriving
}

// ---------------------------------------------------------------------------
// UserMessage — with copy + inline edit
// ---------------------------------------------------------------------------

interface UserMessageProps {
  content: string;
  onEdit?: (newContent: string) => void;
}

const UserMessage = memo(function UserMessage({
  content,
  onEdit,
}: UserMessageProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize + focus when entering edit mode
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
              "outline-none ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
            )}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground  "
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
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground shadow-xs">
        {content}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/user-msg:opacity-100">
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy message"}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground  "
        >
          {copied ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleEdit}
          aria-label="Edit message"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground  "
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
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="group/assistant-msg min-w-0 sm:max-w-[97%]">
      <AiResponseFormatter content={content} isStreaming={isStreaming} />
      {!isStreaming && (
        <>
          <MessageActions content={content} />

          <div className="py-6">
            <ThoughtChain>
              <ThoughtChainStep status="done">
                <ThoughtChainTrigger>
                  Understanding the codebase
                </ThoughtChainTrigger>
                <ThoughtChainContent>
                  <ThoughtChainItem>
                    Scanned 47 files across src/ and packages/
                  </ThoughtChainItem>
                  <ThoughtChainItem>
                    Identified React 18 with TypeScript and Tailwind CSS
                  </ThoughtChainItem>
                  <ThoughtChainItem>
                    No existing auth layer detected
                  </ThoughtChainItem>
                </ThoughtChainContent>
              </ThoughtChainStep>

              <ThoughtChainStep status="active">
                <ThoughtChainTrigger>
                  Planning the implementation
                </ThoughtChainTrigger>
                <ThoughtChainContent>
                  <ThoughtChainItem>
                    Choosing NextAuth.js for session management
                  </ThoughtChainItem>
                  <ThoughtChainItem>
                    Designing protected route middleware
                  </ThoughtChainItem>
                </ThoughtChainContent>
              </ThoughtChainStep>

              <ThoughtChainStep status="pending">
                <ThoughtChainTrigger>Writing the code</ThoughtChainTrigger>
                <ThoughtChainContent>
                  <ThoughtChainItem>auth.ts — provider config</ThoughtChainItem>
                  <ThoughtChainItem>
                    middleware.ts — route protection
                  </ThoughtChainItem>
                  <ThoughtChainItem>SessionProvider wrapper</ThoughtChainItem>
                </ThoughtChainContent>
              </ThoughtChainStep>
            </ThoughtChain>
          </div>

          <div className="">
            <div className="w-full max-w-sm">
              <Steps defaultOpen>
                <StepsTrigger leftIcon={<FileSearch className="size-4" />}>
                  Tool run: analyze repo
                </StepsTrigger>
                <StepsContent bar={<StepsBar className="mr-2 ml-1.5" />}>
                  <div className="space-y-1">
                    <StepsItem>
                      Cloning repository <strong>odyssey-ui/www</strong>
                    </StepsItem>
                    <StepsItem>
                      Detected <strong>TypeScript</strong> +{" "}
                      <strong>Tailwind CSS</strong>
                    </StepsItem>
                    <StepsItem>
                      Found 142 components across 6 packages
                    </StepsItem>
                    <StepsItem>Dependency graph resolved in 280ms</StepsItem>
                  </div>
                </StepsContent>
              </Steps>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onEdit,
}: ChatMessageProps) {
  const handleEdit = useCallback(
    (newContent: string) => onEdit?.(message.id, newContent),
    [message.id, onEdit],
  );

  return (
    <div
      className={cn(
        "group/user-msg w-full",
        message.role === "user" ? "py-2" : "py-4",
      )}
    >
      {message.role === "user" ? (
        <UserMessage content={message.content} onEdit={handleEdit} />
      ) : (
        <AssistantMessage
          content={message.content}
          isStreaming={message.isStreaming}
        />
      )}
    </div>
  );
});
