"use client";

import React, { useMemo } from "react";
import { useChatPresence } from "@/hooks/use-chat-presence";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PresenceIndicatorsProps {
  chatId: string;
  currentUserId: string;
  maxVisible?: number;
  className?: string;
}

const PRESENCE_COLORS = [
  "bg-blue-500/20 text-blue-600 dark:bg-blue-500/30",
  "bg-purple-500/20 text-purple-600 dark:bg-purple-500/30",
  "bg-pink-500/20 text-pink-600 dark:bg-pink-500/30",
  "bg-green-500/20 text-green-600 dark:bg-green-500/30",
] as const;

interface PresenceAvatarProps {
  userId: string;
  index: number;
  maxVisible: number;
}

const PresenceAvatar = React.memo(function PresenceAvatar({
  userId,
  index,
  maxVisible,
}: PresenceAvatarProps) {
  const initials = userId.slice(0, 2).toUpperCase();
  const colorClass = PRESENCE_COLORS[index % PRESENCE_COLORS.length];
  const zIndex = maxVisible - index;

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className="relative rounded-full cursor-pointer transition-transform hover:scale-105 hover:z-10"
          style={{ zIndex }}
        >
          <div
            className={cn("h-8 w-8 rounded-full ring-2 ring-background flex items-center justify-center", colorClass)}
            data-slot="avatar"
          >
            <span className="text-xs font-semibold">{initials}</span>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        className="bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium">Active now</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

const HiddenCountBadge = React.memo(function HiddenCountBadge({
  count,
}: {
  count: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-background hover:scale-105 transition-transform cursor-pointer"
          style={{ zIndex: 0 }}
        >
          <span className="text-xs font-medium text-muted-foreground">
            +{count}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        className="bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        <p className="text-xs">
          {count} more active {count === 1 ? "user" : "users"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

export function PresenceIndicators({
  chatId,
  currentUserId,
  maxVisible = 4,
  className,
}: PresenceIndicatorsProps) {
  const { activeUsers } = useChatPresence(chatId);

  const { visibleUsers, hiddenCount } = useMemo(() => {
    const others = activeUsers.filter((u) => u.userId !== currentUserId);
    return {
      visibleUsers: others.slice(0, maxVisible),
      hiddenCount: Math.max(0, others.length - maxVisible),
    };
  }, [activeUsers, currentUserId, maxVisible]);

  if (visibleUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delay={200}>
      <div className={cn("flex items-center", className)}>
        <div className="flex -space-x-2.5">
          {visibleUsers.map((user, index) => (
            <PresenceAvatar
              key={user.userId}
              userId={user.userId}
              index={index}
              maxVisible={maxVisible}
            />
          ))}
          {hiddenCount > 0 && <HiddenCountBadge count={hiddenCount} />}
        </div>
      </div>
    </TooltipProvider>
  );
}