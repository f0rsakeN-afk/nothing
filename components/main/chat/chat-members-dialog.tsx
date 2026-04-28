"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useChatMembers } from "@/hooks/use-chat-members";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { leaveChat, transferOwnership, getChatInvitations, cancelInvitation } from "@/services/collaboration.service";
import { toast } from "@/components/ui/sileo-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Crown,
  Eye,
  Pencil,
  MoreHorizontal,
  Trash2,
  Loader2,
  ShieldCheck,
  LogOut,
  UserCog,
  Mail,
  X,
  Clock,
} from "lucide-react";
import type { ChatMemberWithUser } from "@/services/collaboration.service";

interface ChatMembersDialogProps {
  chatId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
  onLeaveChat?: () => void;
}

const ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    iconClass: "text-amber-500",
  },
  EDITOR: {
    label: "Editor",
    icon: Pencil,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    iconClass: "text-blue-500",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    badgeClass: "bg-muted text-muted-foreground",
    iconClass: "text-muted-foreground",
  },
} as const;

interface MemberRowProps {
  member: ChatMemberWithUser;
  isActive: boolean;
  isCurrentUser: boolean;
  canManage: boolean;
  isOwner: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  isTransferring: boolean;
  showDetails: boolean; // If false, hide email and role (for VIEWERs)
  onRoleChange: (role: "EDITOR" | "VIEWER") => void;
  onRemove: () => void;
  onTransferOwnership: () => void;
}

const MemberRow = React.memo(function MemberRow({
  member,
  isActive,
  isCurrentUser,
  canManage,
  isOwner,
  showDetails,
  isUpdating,
  isRemoving,
  isTransferring,
  onRoleChange,
  onRemove,
  onTransferOwnership,
}: MemberRowProps) {
  const config = ROLE_CONFIG[member.role];
  const RoleIcon = config.icon;
  const initial = member.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200">
      <div className="relative shrink-0">
        <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium">{initial}</span>
        </div>
        {isActive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {isCurrentUser ? "You" : showDetails ? member.user.email?.split("@")[0] : "Member"}
          </p>
          {isCurrentUser && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              You
            </span>
          )}
        </div>
        {showDetails && (
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn("text-xs gap-1.5 py-0", config.badgeClass)}>
              <RoleIcon className={cn("h-3 w-3", config.iconClass)} />
              {config.label}
            </Badge>
            {isActive && (
              <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Active
              </span>
            )}
          </div>
        )}
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {member.role === "VIEWER" && (
              <DropdownMenuItem onClick={() => onRoleChange("EDITOR")} disabled={isUpdating} className="gap-2">
                <Pencil className="h-4 w-4 text-blue-500" />
                Make Editor
              </DropdownMenuItem>
            )}
            {member.role === "EDITOR" && (
              <DropdownMenuItem onClick={() => onRoleChange("VIEWER")} disabled={isUpdating} className="gap-2">
                <Eye className="h-4 w-4" />
                Make Viewer
              </DropdownMenuItem>
            )}
            {/* Transfer ownership option - only show for owner */}
            {isOwner && (
              <DropdownMenuItem onClick={onTransferOwnership} disabled={isTransferring} className="gap-2">
                {isTransferring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCog className="h-4 w-4 text-amber-500" />
                )}
                Transfer Ownership
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} disabled={isRemoving} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

function MemberSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
const MemoizedMemberSkeleton = React.memo(MemberSkeleton);

const EmptyState = React.memo(function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No members yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Invite others to collaborate on this chat
      </p>
      <Button size="sm" onClick={onInvite}>
        <ShieldCheck className="h-4 w-4 mr-2" />
        Invite Members
      </Button>
    </div>
  );
});

export function ChatMembersDialog({
  chatId,
  currentUserId,
  isOpen,
  onClose,
  onInvite,
  onLeaveChat,
}: ChatMembersDialogProps) {
  const { members, isLoading, removeMember, updateRole, isRemoving, isUpdating } =
    useChatMembers(chatId);
  const { activeUsers } = useChatPresence(chatId);

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [transferringTo, setTransferringTo] = useState<string | null>(null);
  const [showInvitations, setShowInvitations] = useState(false);
  const [invitations, setInvitations] = useState<unknown[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const activeUserIds = useMemo(() => new Set(activeUsers.map((u) => u.userId)), [activeUsers]);
  const currentMember = useMemo(
    () => members.find((m) => m.userId === currentUserId),
    [members, currentUserId]
  );
  const isCurrentUserOwner = currentMember?.role === "OWNER";
  const isCurrentUserEditor = currentMember?.role === "EDITOR";
  const isCurrentUserMember = !!currentMember;
  // Show full member details (email, role) only to OWNERs and EDITORs
  const showMemberDetails = isCurrentUserOwner || isCurrentUserEditor;

  const loadInvitations = useCallback(async () => {
    if (!chatId) return;
    setIsLoadingInvitations(true);
    try {
      const data = await getChatInvitations(chatId);
      setInvitations(data);
      setShowInvitations(true);
    } catch (error) {
      toast.error("Failed to load invitations");
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [chatId]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    try {
      setCancellingId(invitationId);
      await cancelInvitation(chatId, invitationId);
      setInvitations((prev) => prev.filter((inv: any) => inv.id !== invitationId));
      toast.success("Invitation cancelled");
    } catch (error) {
      toast.error("Failed to cancel invitation");
    } finally {
      setCancellingId(null);
    }
  }, [chatId]);

  const handleTransferOwnership = useCallback(async (userId: string) => {
    try {
      setTransferringTo(userId);
      await transferOwnership(chatId, userId);
      toast.success("Ownership transferred", {
        description: "The new owner can now manage this chat.",
      });
    } catch (error) {
      toast.error("Failed to transfer ownership", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTransferringTo(null);
    }
  }, [chatId]);

  const handleLeaveChat = useCallback(async () => {
    try {
      setIsLeaving(true);
      await leaveChat(chatId);
      onLeaveChat?.();
      onClose();
    } catch (error) {
      toast.error("Failed to leave chat", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLeaving(false);
    }
  }, [chatId, onLeaveChat, onClose]);

  const handleRoleChange = useCallback(
    (userId: string, newRole: "EDITOR" | "VIEWER") => {
      updateRole({ userId, role: newRole });
    },
    [updateRole]
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (memberToRemove) {
      await removeMember(memberToRemove);
      setMemberToRemove(null);
    }
  }, [memberToRemove, removeMember]);

  const handleRemoveRequest = useCallback((userId: string) => {
    setMemberToRemove(userId);
  }, []);

  const handleClose = useCallback(() => {
    setMemberToRemove(null);
    onClose();
  }, [onClose]);

  const memberRows = useMemo(() => {
    return members.map((member) => {
      const isActive = activeUserIds.has(member.userId);
      const isCurrentUser = member.userId === currentUserId;
      const canManage = isCurrentUserOwner && !isCurrentUser && member.role !== "OWNER";

      return (
        <MemberRow
          key={member.id}
          member={member}
          isActive={isActive}
          isCurrentUser={isCurrentUser}
          canManage={canManage}
          isOwner={isCurrentUserOwner}
          isUpdating={isUpdating}
          isRemoving={isRemoving}
          isTransferring={transferringTo === member.userId}
          showDetails={showMemberDetails}
          onRoleChange={(role) => handleRoleChange(member.userId, role)}
          onRemove={() => handleRemoveRequest(member.userId)}
          onTransferOwnership={() => handleTransferOwnership(member.userId)}
        />
      );
    });
  }, [members, activeUserIds, currentUserId, isCurrentUserOwner, showMemberDetails, isUpdating, isRemoving, transferringTo, handleRoleChange, handleRemoveRequest, handleTransferOwnership]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {showInvitations ? "Pending Invitations" : "Chat Members"}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {showInvitations
                      ? `${invitations.length} pending invitation${invitations.length !== 1 ? "s" : ""}`
                      : `${members.length} member${members.length !== 1 ? "s" : ""}`}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showInvitations ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInvitations(false)}
                    className="gap-2"
                  >
                    Back
                  </Button>
                ) : (
                  <>
                    {isCurrentUserOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadInvitations}
                        disabled={isLoadingInvitations}
                        className="gap-2"
                      >
                        {isLoadingInvitations ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Invitations
                      </Button>
                    )}
                    <Button size="sm" onClick={onInvite} className="gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Invite
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {showInvitations ? (
              <div className="px-6 py-4">
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation: any) => (
                      <div
                        key={invitation.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {invitation.email || "Link invitation"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              invitation.role === "EDITOR"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {invitation.role === "EDITOR" ? "Editor" : "Viewer"}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          disabled={cancellingId === invitation.id}
                          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {cancellingId === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <div className="px-6 py-4 space-y-2">
                <MemoizedMemberSkeleton />
                <MemoizedMemberSkeleton />
                <MemoizedMemberSkeleton />
              </div>
            ) : members.length === 0 ? (
              <EmptyState onInvite={onInvite} />
            ) : (
              <ScrollArea className="h-full px-6 py-3">
                <div className="space-y-1">
                  {memberRows}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer with Leave Chat option */}
          {!isCurrentUserOwner && isCurrentUserMember && (
            <div className="px-6 py-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLeaveChat}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Chat
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? They will lose access to this chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}