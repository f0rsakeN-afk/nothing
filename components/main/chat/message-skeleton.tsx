"use client";

import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  isUser?: boolean;
}

export function MessageSkeleton({ isUser = false }: MessageSkeletonProps) {
  return (
    <div className={cn("px-2 py-3", isUser ? "flex justify-end" : "flex gap-3")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20 shrink-0" />
      )}
      <div className={cn("space-y-2 max-w-[75%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/50 ring-1 ring-border/50"
          )}
        >
          <div
            className={cn(
              "h-3.5 rounded bg-current/10 animate-pulse",
              isUser ? "w-32" : "w-48"
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="px-2 py-3 flex gap-3">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20 shrink-0" />
      <div className="bg-muted/50 ring-1 ring-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.6s" }}
          />
        ))}
      </div>
    </div>
  );
}