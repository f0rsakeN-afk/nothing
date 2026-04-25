"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Lock, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sileo-toast";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

interface AccountData {
  profile: {
    isActive: boolean;
  };
}

async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account", {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

interface SecuritySectionProps {
  accountData?: AccountData;
}

export const SecuritySection = React.memo(function SecuritySection({
  accountData,
}: SecuritySectionProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("Account deactivated. We're sorry to see you go.");
      setDeleteDialogOpen(false);
      setTimeout(() => {
        router.push("/home");
      }, 1000);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

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

      {/* Two-factor authentication - managed via StackAuth */}
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
                Managed via{" "}
                <a
                  href="https://app.stackauth.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  StackAuth.com
                </a>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[12px] shrink-0"
            onClick={() => window.open("https://app.stackauth.com", "_blank")}
          >
            Manage
          </Button>
        </div>
      </div>

      {/* Active sessions - managed via StackAuth */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Active sessions
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                Session management
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Managed via{" "}
                <a
                  href="https://app.stackauth.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  StackAuth.com
                </a>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[12px] shrink-0"
              onClick={() => window.open("https://app.stackauth.com", "_blank")}
            >
              Manage
            </Button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground">
              Delete account
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
              Permanently deactivate your account. Your data will be retained for
              30 days before permanent deletion. Contact support to restore.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[12px] border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete account
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate your account. Your data will be
              retained for 30 days before permanent deletion. Contact support
              to restore your account within this period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-white"
              render={<Button variant="destructive" />}
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
