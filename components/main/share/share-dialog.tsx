"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Copy, Check, Globe, Lock, Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createShareLink, removeShareLink } from "@/services/chat.service";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  selectedVisibilityType: "public" | "private";
  onShare?: (chatId: string, visibility: "public" | "private") => Promise<void>;
  isOwner?: boolean;
}

export function ShareDialog({
  isOpen,
  onOpenChange,
  chatId,
  selectedVisibilityType,
  onShare,
  isOwner = true,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShared, setIsShared] = useState(selectedVisibilityType === "public");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [isFetchingShare, setIsFetchingShare] = useState(false);

  // Fetch existing share info when opening dialog for an already-shared chat
  useEffect(() => {
    if (!isOpen) return;

    if (selectedVisibilityType === "public" && !shareToken) {
      setIsFetchingShare(true);
      setError(null);

      fetch(`/api/chat/${chatId}/share?by=chatId`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load share info");
          return res.json();
        })
        .then((data) => {
          if (data?.shareToken) {
            setShareToken(data.shareToken);
            setHasPassword(data.hasPassword || false);
          }
        })
        .catch((err) => {
          if (err.name === "AbortError") {
            setError("Request timed out");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load share info");
          }
        })
        .finally(() => {
          setIsFetchingShare(false);
        });
    }
  }, [isOpen, chatId, selectedVisibilityType, shareToken]);

  // Reset state when dialog is fully closed
  useEffect(() => {
    if (isOpen) {
      setError(null);
      return;
    }
    setCopied(false);
    setIsLoading(false);
    setPassword("");
    setPasswordEnabled(false);
    setError(null);
  }, [isOpen]);

  // Keep isShared in sync with selectedVisibilityType
  useEffect(() => {
    setIsShared(selectedVisibilityType === "public");
  }, [selectedVisibilityType]);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`
    : "";

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleToggleVisibility = useCallback(async () => {
    if (!chatId) return;

    setError(null);
    setIsLoading(true);
    try {
      if (isShared) {
        // Make private
        await removeShareLink(chatId);
        setIsShared(false);
        setShareToken(null);
        setHasPassword(false);
        setPassword("");
        setPasswordEnabled(false);
        onOpenChange(false);
      } else {
        // Create public link
        const result = await createShareLink(
          chatId,
          24,
          passwordEnabled && password ? password : undefined
        );
        setShareToken(result.shareToken || null);
        setHasPassword(!!passwordEnabled && !!password);
        setIsShared(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out");
      } else {
        setError(err instanceof Error ? err.message : "Failed to update share settings");
      }
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isShared, onOpenChange, passwordEnabled, password]);

  const handlePasswordToggle = useCallback(() => {
    if (hasPassword && !passwordEnabled) {
      setError("To remove password, deactivate and reactivate the link");
      return;
    }
    setPasswordEnabled(!passwordEnabled);
    setError(null);
  }, [hasPassword, passwordEnabled]);

  const handleClose = useCallback(() => {
    setPassword("");
    setPasswordEnabled(false);
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!chatId || !isOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Share chat
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground pt-1">
              {isShared
                ? "Link is active. Anyone with the link can view this chat."
                : "Create a public link to share this chat."}
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Link box - show when shared OR when we have a token */}
          {(isShared || shareToken) && shareUrl && (
            <div className="relative rounded-xl border bg-muted/50 overflow-hidden">
              <div className="px-4 py-3.5 pr-24">
                <code className="text-sm text-foreground/80 font-medium text-wrap block break-all">
                  {shareUrl}
                </code>
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={handleCopyLink}
                className={cn(
                  "h-9 px-4 font-medium text-xs absolute right-3 top-1/2 -translate-y-1/2 rounded-lg",
                  copied && "bg-primary hover:bg-primary"
                )}
              >
                {copied ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Loading state when fetching existing share */}
          {isFetchingShare && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading share info...</span>
            </div>
          )}

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all",
              isShared
                ? "bg-muted/30 border-transparent hover:bg-muted/50"
                : "bg-primary/5 border-primary/20 hover:bg-primary/10"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                isShared ? "bg-muted" : "bg-primary/10"
              )}
            >
              {isLoading ? (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
              ) : isShared ? (
                <Globe className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Lock className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {isLoading ? "Updating..." : isShared ? "Link is active" : "Link is inactive"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isShared ? "Click to deactivate link" : "Click to create public link"}
              </p>
            </div>
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                isShared ? "border-primary bg-primary" : "border-muted-foreground/30"
              )}
            >
              {isShared && !isLoading && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </button>

          {/* Password protection section - only show when creating a new link */}
          {!isShared && (
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Password protection</span>
                </div>
                <button
                  type="button"
                  onClick={handlePasswordToggle}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    passwordEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      passwordEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {passwordEnabled && (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (optional)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {passwordEnabled
                  ? "Viewers will need this password to access the chat"
                  : "Optionally add a password to restrict access"}
              </p>
            </div>
          )}

          {/* Expiry info */}
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Link expires in 24 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
