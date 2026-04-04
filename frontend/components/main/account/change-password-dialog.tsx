"use client";

import { useState, useCallback, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePasswordSchema, type updatePasswordInput } from "@/schemas/auth";
import { cn } from "@/lib/utils";

// ── Password field with visibility toggle ──────────────────────────────────

const PasswordField = memo(function PasswordField({
  id,
  label,
  placeholder,
  error,
  registration,
}: {
  id: string;
  label: string;
  placeholder: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>["register"]>;
}) {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow((v) => !v), []);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[12.5px] font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className={cn(
            "pr-9 text-[13px] h-9",
            error && "border-destructive focus-visible:ring-destructive/30",
          )}
          {...registration}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && (
        <p className="text-[11.5px] text-destructive">{error}</p>
      )}
    </div>
  );
});

// ── Dialog ─────────────────────────────────────────────────────────────────

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordDialog = memo(function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<updatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async () => {
    // TODO: wire to API
    await new Promise((r) => setTimeout(r, 800));
    reset();
    onOpenChange(false);
  };

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm gap-0 p-0 overflow-hidden" showCloseButton>
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-semibold text-foreground leading-none">
                Change Password
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-1">
                Make sure it&apos;s at least 6 characters.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <PasswordField
            id="oldPassword"
            label="Current password"
            placeholder="Enter current password"
            error={errors.oldPassword?.message}
            registration={register("oldPassword")}
          />
          <PasswordField
            id="newPassword"
            label="New password"
            placeholder="Enter new password"
            error={errors.newPassword?.message}
            registration={register("newPassword")}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            placeholder="Repeat new password"
            error={errors.confirmPassword?.message}
            registration={register("confirmPassword")}
          />

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 text-[13px]"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 text-[13px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
