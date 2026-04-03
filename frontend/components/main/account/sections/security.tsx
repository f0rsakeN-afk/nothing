"use client";

import * as React from "react";
import { Lock, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChangePasswordDialog } from "@/components/main/account/change-password-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const SecuritySection = React.memo(function SecuritySection() {
  const [twoFactor, setTwoFactor] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false);

  const openChangePassword = React.useCallback(() => setChangePasswordOpen(true), []);
  const openDeleteAccount  = React.useCallback(() => setDeleteAccountOpen(true), []);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Security
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Manage your password, sessions, and account security.
        </p>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Password
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Password</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Last changed 3 months ago
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[12px] shrink-0"
            onClick={openChangePassword}
          >
            Change password
          </Button>
        </div>
      </div>

      {/* Two-factor authentication */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Two-factor authentication
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                Two-factor authentication
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Add an extra layer of security
              </p>
            </div>
          </div>
          <Switch
            checked={twoFactor}
            onCheckedChange={setTwoFactor}
            size="sm"
          />
        </div>
      </div>

      {/* Active sessions */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Active sessions
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {/* Current session */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-foreground">
                  Chrome · macOS
                </span>
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                  Current session
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                192.168.1.1
              </p>
            </div>
          </div>

          {/* Other session */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  Safari · iPhone
                </span>
                <span className="text-[11px] text-muted-foreground">
                  2 days ago
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                10.0.0.4
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[12px] text-destructive hover:text-destructive shrink-0"
            >
              Revoke
            </Button>
          </div>
        </div>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all chats, projects, and
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-white"
              render={<Button variant="destructive" />}
              onClick={() => setDeleteAccountOpen(false)}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2.5">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Delete account
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px] border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
          onClick={openDeleteAccount}
        >
          Delete account
        </Button>
      </div>
    </div>
  );
});
