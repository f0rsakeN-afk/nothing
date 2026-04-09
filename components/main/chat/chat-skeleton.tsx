"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Full page chat loading skeleton
// ---------------------------------------------------------------------------

export function ChatPageSkeleton() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-md px-4">
        <div className="flex gap-3">
          <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline message skeleton
// ---------------------------------------------------------------------------

interface ChatSkeletonProps {
  count?: number;
}

export function ChatSkeleton({ count = 3 }: ChatSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 px-2">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ChatLoadingStateProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function ChatStateHandler({
  isLoading,
  isError,
  onRetry,
  children,
}: ChatLoadingStateProps) {
  if (isLoading) {
    return <ChatSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
        <p className="text-sm text-muted-foreground text-center">
          Failed to load messages
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

interface EmptyChatStateProps {
  message?: string;
}

export function EmptyChatState({
  message = "No messages yet. Start the conversation!",
}: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p className="text-sm text-muted-foreground/50 text-center">{message}</p>
    </div>
  );
}
