"use client";

import { useState } from "react";
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
  ChevronDown,
} from "lucide-react";

interface InviteDialogProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inviteLink: string) => void;
}

export function InviteDialog({
  chatId,
  isOpen,
  onClose,
  onSuccess,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => createInvitation(chatId, email || undefined, role),
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
      onSuccess?.(data.inviteLink);
    },
  });

  const copyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail("");
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Chat</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on this chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!inviteLink ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to create a shareable link anyone can use
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("VIEWER")}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                      role === "VIEWER"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">Viewer</p>
                      <p className="text-xs text-muted-foreground">Can read messages</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("EDITOR")}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                      role === "EDITOR"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">Editor</p>
                      <p className="text-xs text-muted-foreground">Can send messages</p>
                    </div>
                  </button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Create Invite Link
                  </>
                )}
              </Button>

              {createMutation.error && (
                <p className="text-sm text-destructive text-center">
                  {createMutation.error.message}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Invite Link</span>
                </div>
                <p className="text-xs text-muted-foreground break-all">{inviteLink}</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>

              {email && (
                <p className="text-sm text-muted-foreground text-center">
                  Invitation sent to {email}
                </p>
              )}

              <Button variant="ghost" className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}