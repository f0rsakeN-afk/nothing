"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
  className?: string;
}

export function TypingIndicator({
  isTyping,
  userName = "Someone",
  className,
}: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
      </div>
      <span className="text-sm text-muted-foreground">
        {userName} is typing...
      </span>
    </div>
  );
}