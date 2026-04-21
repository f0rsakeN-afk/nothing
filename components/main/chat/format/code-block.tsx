"use client";

import { memo, useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

const CopyButton = memo(function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        "h-7 w-7 transition-colors duration-150",
        copied
          ? "text-green-500"
          : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
});

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------

export interface CodeBlockProps {
  language: string;
  children: string;
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const CodeBlock = memo(function CodeBlock({
  language,
  children,
  title,
  collapsible = false,
  defaultExpanded = true,
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const lines = children.split("\n");

  return (
    <div className="group mb-4 overflow-hidden rounded-xl border border-border bg-muted/20 dark:bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 dark:bg-muted/20 border-b border-border/60 gap-2">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <div className="flex items-center gap-1">
          <CopyButton code={children} />
          {collapsible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className="flex bg-neutral-50 dark:bg-neutral-900/50 max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
                    <div className="overflow-x-auto flex-1">
            <SyntaxHighlighter
              language={language}
              style={isDark ? vscDarkPlus : vs}
              customStyle={{
                margin: 0,
                padding: "0.75rem 1rem",
                fontSize: "12.5px",
                lineHeight: "21px",
                backgroundColor: "transparent",
              }}
              codeTagProps={{ style: { fontFamily: "var(--font-mono, monospace)" } }}
            >
              {children}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
});
