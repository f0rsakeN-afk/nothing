"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare, FolderOpenDot } from "lucide-react";

interface SidebarSkeletonProps {
  type: "chats" | "projects";
}

export function SidebarSkeleton({ type }: SidebarSkeletonProps) {
  const items = type === "chats" ? 5 : 3;

  return (
    <div className="py-1 px-2">
      <Skeleton className="h-4 w-16 mb-2 ml-2" />
      <div className="space-y-1">
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 h-8 px-2"
          >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SidebarErrorStateProps {
  onRetry: () => void;
}

export function SidebarErrorState({ onRetry }: SidebarErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <p className="text-xs text-destructive font-medium">
        Failed to load
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="gap-1.5 h-7 text-xs"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}

interface SidebarEmptyStateProps {
  type: "chats" | "projects" | "archive";
}

export function SidebarEmptyState({ type }: SidebarEmptyStateProps) {
  const config = {
    chats: {
      icon: MessageSquare,
      message: "No chats yet",
    },
    projects: {
      icon: FolderOpenDot,
      message: "No projects yet",
    },
    archive: {
      icon: MessageSquare,
      message: "No archive yet",
    },
  };

  const { icon: Icon, message } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
      <Icon className="h-5 w-5 text-muted-foreground/25" />
      <p className="text-xs text-muted-foreground/40 font-medium capitalize">
        {message}
      </p>
    </div>
  );
}
