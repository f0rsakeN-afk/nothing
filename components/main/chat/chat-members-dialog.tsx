"use client";

import { useState } from "react";
import { useChatMembers } from "@/hooks/use-chat-members";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Crown,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface ChatMembersDialogProps {
  chatId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
}

export function ChatMembersDialog({
  chatId,
  currentUserId,
  isOpen,
  onClose,
  onInvite,
}: ChatMembersDialogProps) {
  const { members, isLoading, removeMember, updateRole, isRemoving, isUpdating } =
    useChatMembers(chatId);
  const { activeUsers } = useChatPresence(chatId);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeUserIds = new Set(activeUsers.map((u) => u.userId));

  const copyEmail = async (email: string, memberId: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-3 w-3 text-amber-500" />;
      case "EDITOR":
        return <Pencil className="h-3 w-3 text-blue-500" />;
      default:
        return <Eye className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "EDITOR":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const canManageMembers = members.some(
    (m) => m.userId === currentUserId && m.role === "OWNER"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Chat Members
          </DialogTitle>
          <DialogDescription>
            Manage who has access to this chat
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-3 border-b">
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
          {canManageMembers && (
            <Button size="sm" onClick={onInvite}>
              Invite
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {members.map((member) => {
                const isActive = activeUserIds.has(member.userId);
                const isCurrentUser = member.userId === currentUserId;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-xs">
                          {member.user.email?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {isCurrentUser ? "You" : member.user.email}
                        </p>
                        {isActive && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn("text-xs gap-1", getRoleBadgeColor(member.role))}
                        >
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      </div>
                    </div>

                    {!isCurrentUser && canManageMembers && member.role !== "OWNER" && (
                      <div className="flex items-center gap-1">
                        {member.role === "VIEWER" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => updateRole({ userId: member.userId, role: "EDITOR" })}
                            disabled={isUpdating}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Make Editor
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => updateRole({ userId: member.userId, role: "VIEWER" })}
                            disabled={isUpdating}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Make Viewer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => removeMember(member.userId)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}