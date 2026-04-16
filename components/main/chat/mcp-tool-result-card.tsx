"use client";

import { memo, useState } from "react";
import { Check, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CodeBlock } from "./format/code-block";
import ReactMarkdown from "react-markdown";

interface MCPToolResultCardProps {
  toolName: string;
  status: "completed" | "error";
  result?: unknown;
  error?: string;
  /** Pre-formatted string result to display directly (optional) */
  resultText?: string;
  /** Parse result as JSON and show formatted */
  resultJson?: boolean;
  className?: string;
}

function formatResult(result: unknown): string {
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

export const MCPToolResultCard = memo(function MCPToolResultCard({
  toolName,
  status,
  result,
  error,
  resultText,
  resultJson = false,
  className,
}: MCPToolResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const displayName = toolName
    .replace(/^mcp_\w+_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const rawResult = resultText ?? (result !== undefined ? formatResult(result) : error ?? "");
  const isJson = resultJson || (typeof rawResult === "string" && rawResult.trim().startsWith("{"));
  const preview = isJson ? "View JSON result" : rawResult.slice(0, 120);
  const hasMore = rawResult.length > 120;

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn("w-full", className)}
    >
      <div className="overflow-hidden rounded-xl border bg-card mb-3">
        {/* Header */}
        <CollapsibleTrigger className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
          {/* Status icon */}
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              status === "completed"
                ? "bg-green-50 dark:bg-green-950/50"
                : "bg-red-50 dark:bg-red-950/50"
            )}
          >
            {status === "completed" ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>

          {/* Tool name + preview */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            {hasMore && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {preview}
              </p>
            )}
          </div>

          {/* Chevron */}
          {hasMore && (
            <div className="text-muted-foreground shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          )}

          {/* Error badge */}
          {status === "error" && (
            <span className="shrink-0 text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded-md">
              Error
            </span>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50">
            {isJson ? (
              <div className="p-3">
                <CodeBlock language="json" collapsible defaultExpanded>
                  {rawResult}
                </CodeBlock>
              </div>
            ) : status === "error" ? (
              <div className="p-3 font-mono text-xs text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20">
                {rawResult}
              </div>
            ) : (
              <div className="p-3">
                <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{rawResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
