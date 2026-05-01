"use client";

import * as React from "react";
import { useChatMembers } from "@/hooks/use-chat-members";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { useAuthStatusContext } from "@/components/main/auth-status-provider";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  UserPlus,
  Crown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

interface CollaborationMenuProps {
  chatId: string;
  onInviteOpen?: () => void;
  onMembersOpen?: () => void;
}

const ROLE_COLORS = {
  OWNER: "text-amber-500 bg-amber-500/10",
  EDITOR: "text-blue-500 bg-blue-500/10",
  VIEWER: "text-muted-foreground bg-muted",
} as const;

const PRESENCE_COLORS = [
  "bg-blue-500/20 text-blue-600 dark:bg-blue-500/30",
  "bg-purple-500/20 text-purple-600 dark:bg-purple-500/30",
  "bg-pink-500/20 text-pink-600 dark:bg-pink-500/30",
  "bg-green-500/20 text-green-600 dark:bg-green-500/30",
] as const;

function PresenceAvatar({
  index,
}: {
  index: number;
}) {
  const colorClass = PRESENCE_COLORS[index % PRESENCE_COLORS.length];

  return (
    <div className="relative rounded-full">
      <div
        className={cn("h-7 w-7 rounded-full ring-2 ring-background flex items-center justify-center", colorClass)}
      >
        <span className="text-[10px] font-semibold text-current opacity-60">•</span>
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border-2 border-background" />
    </div>
  );
}

function ActiveMembersRow({
  activeUsers,
  currentUserId,
}: {
  activeUsers: { userId: string }[];
  currentUserId: string;
}) {
  const others = activeUsers.filter((u) => u.userId !== currentUserId);
  const visibleUsers = others.slice(0, 4);
  const extraCount = Math.max(0, others.length - 4);

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {visibleUsers.map((_, index) => (
          <PresenceAvatar key={index} index={index} />
        ))}
      </div>
      {extraCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          +{extraCount}
        </span>
      )}
    </div>
  );
}

export function CollaborationMenu({ chatId, onInviteOpen, onMembersOpen }: CollaborationMenuProps) {
  const { userId: currentUserId } = useAuthStatusContext();
  const { members } = useChatMembers(chatId);
  // Only check presence if there are other members (besides owner)
  const hasOtherMembers = members.length > 1;
  const { activeUsers } = useChatPresence(hasOtherMembers ? chatId : undefined);
  const [open, setOpen] = React.useState(false);

  const currentUserRole = React.useMemo(() => {
    const member = members.find((m) => m.userId === currentUserId);
    return member?.role || null;
  }, [members, currentUserId]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen);
  }, []);

  const handleMembersClick = React.useCallback(() => {
    setOpen(false);
    onMembersOpen?.();
  }, [onMembersOpen]);

  const handleInviteClick = React.useCallback(() => {
    setOpen(false);
    onInviteOpen?.();
  }, [onInviteOpen]);

  if (!currentUserId) return null;

  return (
    <div className="flex items-center gap-2">
      <ActiveMembersRow activeUsers={activeUsers} currentUserId={currentUserId} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          className="h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted/80 transition-all flex items-center justify-center"
          render={<button type="button" />}
        >
          <MoreHorizontal className="h-4 w-4 text-foreground" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-64 p-0 overflow-hidden"
        >
          <div className="p-3 space-y-1">
            {/* Header with role badge */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Collaboration</p>
              {currentUserRole && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1",
                  ROLE_COLORS[currentUserRole]
                )}>
                  {currentUserRole === "OWNER" && <Crown className="h-2.5 w-2.5" />}
                  {currentUserRole}
                </span>
              )}
            </div>

            {/* Members button */}
            <button
              type="button"
              onClick={handleMembersClick}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Members</p>
                <p className="text-xs text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Invite button (only for owners/editors) */}
            {currentUserRole && currentUserRole !== "VIEWER" && (
              <button
                type="button"
                onClick={handleInviteClick}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Invite</p>
                  <p className="text-xs text-muted-foreground">Add collaborators</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}