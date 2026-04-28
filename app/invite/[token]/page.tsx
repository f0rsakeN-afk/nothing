"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Clock,
  Mail,
  Crown,
  Pencil,
  Eye,
  Check,
  X,
  Loader2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import type { InvitationDetails } from "@/services/collaboration.service";

const ROLE_CONFIG = {
  EDITOR: {
    label: "Editor",
    icon: Pencil,
    description: "Can send messages and trigger AI responses",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    description: "Can read messages but cannot send",
  },
} as const;

function InvitationSkeleton() {
  return (
    <div className="w-full max-w-md space-y-6 p-8">
      <div className="flex justify-center">
        <Skeleton className="h-16 w-16 rounded-2xl" />
      </div>
      <div className="space-y-3 text-center">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="w-full max-w-md space-y-6 p-8 text-center">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invitation Invalid
        </h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={() => (window.location.href = "/home")}>
        Go to Home
      </Button>
    </div>
  );
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const fetchInvitation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load invitation");
      } else {
        setInvitation(data);
      }
    } catch {
      setError("Failed to load invitation");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to accept", { description: data.error });
        return;
      }
      toast.success("Welcome to the chat!", {
        description: `You've joined as ${data.role}`,
      });
      // Invalidate queries to refresh member list
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/chat/${data.chatId}`);
    } catch {
      toast.error("Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  }, [token, router, queryClient]);

  const handleDecline = useCallback(async () => {
    setIsDeclining(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to decline", { description: data.error });
        return;
      }
      toast.success("Invitation declined");
      router.push("/home");
    } catch {
      toast.error("Failed to decline invitation");
    } finally {
      setIsDeclining(false);
    }
  }, [token, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <InvitationSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorState message={error} onRetry={fetchInvitation} />
      </main>
    );
  }

  if (!invitation) return null;

  const { invitation: inv, inviter, alreadyMember, isOwner } = invitation;
  const roleConfig = ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG];
  const RoleIcon = roleConfig?.icon || Eye;
  const expiresDate = new Date(inv.expiresAt);
  const isExpired = expiresDate < new Date();

  // Already a member or owner - redirect to chat
  useEffect(() => {
    if (alreadyMember || isOwner) {
      toast.info(
        isOwner
          ? "You're already the owner of this chat"
          : "You're already a member",
        { description: "Redirecting to chat..." }
      );
      const timer = setTimeout(() => {
        router.push(`/chat/${inv.chatId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [alreadyMember, isOwner, inv.chatId, router]);

  // Already processed (not pending)
  if (inv.status !== "pending" || isExpired) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorState
          message={isExpired ? "This invitation has expired" : "This invitation is no longer valid"}
          onRetry={fetchInvitation}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 p-8 rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              You've been invited
            </h1>
            <p className="text-muted-foreground text-sm">
              to join <span className="font-medium text-foreground">{inv.chatTitle}</span>
            </p>
          </div>
        </div>

        {/* Invitation Details */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/30">
          {/* Role */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                inv.role === "EDITOR"
                  ? "bg-blue-500/10"
                  : "bg-muted"
              )}
            >
              <RoleIcon
                className={cn(
                  "h-5 w-5",
                  inv.role === "EDITOR"
                    ? "text-blue-500"
                    : "text-muted-foreground"
                )}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {roleConfig?.label || inv.role} Role
              </p>
              <p className="text-xs text-muted-foreground">
                {roleConfig?.description}
              </p>
            </div>
          </div>

          {/* Inviter */}
          {inviter && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Invited by</p>
                <p className="text-xs text-muted-foreground truncate">{inviter}</p>
              </div>
            </div>
          )}

          {/* Expiry */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Expires</p>
              <p className="text-xs text-muted-foreground">
                {expiresDate.toLocaleDateString()} at{" "}
                {expiresDate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Email badge if link invitation */}
        {inv.email && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="gap-1.5">
              <Mail className="h-3 w-3" />
              {inv.email}
            </Badge>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="w-full h-12 rounded-xl font-medium gap-2"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="w-full h-12 rounded-xl font-medium gap-2 text-muted-foreground hover:text-foreground"
          >
            {isDeclining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Declining...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Decline
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By accepting, you'll be added to this chat and can leave at any time.
        </p>
      </div>
    </main>
  );
}
