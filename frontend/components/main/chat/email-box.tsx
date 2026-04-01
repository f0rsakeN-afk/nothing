"use client";

import React, { memo, useState, useCallback, useEffect } from "react";
import { Copy, SendHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmailBoxProps {
  initialContent: string;
  label?: string;
  onSend?: (content: string) => void;
}

export const EmailBox = memo(function EmailBox({
  initialContent,
  label = "Email",
  onSend,
}: EmailBoxProps) {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);

  // Synchronize with external updates (like streaming response)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleSend = useCallback(() => {
    onSend?.(content);
  }, [content, onSend]);

  const renderHighlightedContent = () => {
    // Regex matches [Something] but avoids greedy matching
    const parts = content.split(/(\[.*?\])/g);
    return parts.map((part, i) => {
      if (part && part.startsWith("[") && part.endsWith("]")) {
        return (
          <span
            key={i}
            className="rounded-[4px] bg-emerald-500/20 px-1 py-0.5 font-medium text-emerald-400 ring-1 ring-emerald-500/30"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="group my-6 overflow-hidden rounded-xl border border-border/60 bg-zinc-950/50 shadow-xl ring-1 ring-white/5 transition-all focus-within:ring-primary/40 focus-within:ring-2">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/40 bg-zinc-900/40 px-4 py-2 backdrop-blur-md">
        <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            className="h-8 w-8 text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSend}
            className="h-8 w-8 text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Content Area with Live Highlighting ───────────── */}
      <div className="relative grid min-h-[160px] w-full bg-transparent">
        {/*
          Highlighter Layer (Bottom)
          We ensure identical font/line-height/padding for pixel-perfect sync
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 h-full w-full whitespace-pre-wrap break-words px-6 py-6 text-[14px] font-normal leading-[1.7] text-transparent select-none"
        >
          {renderHighlightedContent()}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="col-start-1 row-start-1 h-full w-full field-sizing-content resize-none border-none bg-transparent px-6 py-6 text-[14px] font-normal leading-[1.7] text-foreground/90 caret-primary outline-none placeholder:text-muted-foreground/20 selection:bg-primary/30"
          placeholder="Start typing..."
        />
      </div>
    </div>
  );
});
