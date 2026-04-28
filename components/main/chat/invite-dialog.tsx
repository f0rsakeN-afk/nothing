"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { createInvitation } from "@/services/collaboration.service";
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
import { Label } from "@/components/ui/label";
import {
  Mail,
  Link2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  UserPlus,
  ArrowRight,
} from "lucide-react";

interface InviteDialogProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inviteLink: string) => void;
}

function RoleCard({
  value,
  label,
  description,
  isSelected,
  onSelect,
}: {
  value: "VIEWER" | "EDITOR";
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-sm font-semibold",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {label}
        </span>
        {isSelected && (
          <Check className="h-4 w-4 text-primary" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function SuccessContent({
  inviteLink,
  email,
  role,
  onCopy,
  copied,
  onClose,
  onReset,
}: {
  inviteLink: string;
  email: string | null;
  role: string;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="px-6 py-5 space-y-5">
      {/* Success header */}
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            {email ? "Invitation sent" : "Link ready"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {email
              ? `An invitation has been sent to ${email}`
              : "Share this link with anyone you want to invite"}
          </p>
        </div>
      </div>

      {/* Link display */}
      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide">
            Invite link
          </span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {role.toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/80 font-mono truncate">
          {inviteLink}
        </p>
      </div>

      {/* Expiry notice */}
      <p className="text-[11px] text-muted-foreground text-center">
        This link expires in 7 days
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant={copied ? "outline" : "default"}
          size="sm"
          className={cn("flex-1 h-9", copied && "border-green-500/50 text-green-600 dark:text-green-400")}
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy link
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="h-9 px-3" onClick={onReset}>
          Create another
        </Button>
      </div>

      <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

export function InviteDialog({
  chatId,
  isOpen,
  onClose,
  onSuccess,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => createInvitation(chatId, email || undefined, role),
    onSuccess: useCallback((data: { invitation: unknown; inviteLink: string }) => {
      setInviteLink(data.inviteLink);
      onSuccess?.(data.inviteLink);
    }, [onSuccess]),
  });

  const copyLink = useCallback(async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteLink]);

  const handleClose = useCallback(() => {
    setEmail("");
    setInviteLink(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setInviteLink(null);
    setEmail("");
    setCopied(false);
  }, []);

  const isCreateDisabled = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0">
        {inviteLink ? (
          <SuccessContent
            inviteLink={inviteLink}
            email={email || null}
            role={role}
            onCopy={copyLink}
            copied={copied}
            onClose={handleClose}
            onReset={handleReset}
          />
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-[15px] font-semibold">Invite people</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Add collaborators to this chat
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">
              {/* Email input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to generate a shareable link
                </p>
              </div>

              {/* Role selection */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground">Role</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <RoleCard
                    value="VIEWER"
                    label="Viewer"
                    description="Can read messages"
                    isSelected={role === "VIEWER"}
                    onSelect={() => setRole("VIEWER")}
                  />
                  <RoleCard
                    value="EDITOR"
                    label="Editor"
                    description="Can send messages"
                    isSelected={role === "EDITOR"}
                    onSelect={() => setRole("EDITOR")}
                  />
                </div>
              </div>

              {/* Error message */}
              {createMutation.error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive text-center">
                    {createMutation.error.message}
                  </p>
                </div>
              )}

              {/* Create button */}
              <Button
                className="w-full h-10 text-sm font-medium"
                onClick={() => createMutation.mutate()}
                disabled={isCreateDisabled}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Create invite
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}