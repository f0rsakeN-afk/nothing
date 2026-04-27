"use client";

import { useChatPresence } from "@/hooks/use-chat-presence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PresenceIndicatorsProps {
  chatId: string;
  currentUserId: string;
  maxVisible?: number;
  className?: string;
}

export function PresenceIndicators({
  chatId,
  currentUserId,
  maxVisible = 4,
  className,
}: PresenceIndicatorsProps) {
  const { activeUsers } = useChatPresence(chatId);

  // Filter out current user and limit visible
  const otherUsers = activeUsers
    .filter((u) => u.userId !== currentUserId)
    .slice(0, maxVisible);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delay={300}>
      <div className={cn("flex items-center -space-x-2", className)}>
        {otherUsers.map((user, index) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger>
              <Avatar
                className="h-7 w-7 border-2 border-background ring-0 cursor-default"
                style={{ zIndex: maxVisible - index }}
              >
                <AvatarFallback className="text-xs bg-muted">
                  {user.userId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <p className="text-xs">Active now</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {activeUsers.filter((u) => u.userId !== currentUserId).length > maxVisible && (
          <div
            className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center"
            style={{ zIndex: 0 }}
          >
            <span className="text-xs text-muted-foreground">
              +{activeUsers.filter((u) => u.userId !== currentUserId).length - maxVisible}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}