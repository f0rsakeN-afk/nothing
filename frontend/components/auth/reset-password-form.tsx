"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ─── Local form schema (adds confirmPassword + match refine) ──────────────────

const formSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

// ─── Password strength indicator ─────────────────────────────────────────────

function strengthScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;
const STRENGTH_COLOR = [
  "",
  "bg-destructive",
  "bg-amber-500",
  "bg-green-500",
] as const;

function StrengthBar({ password }: { password: string }) {
  const score = strengthScore(password);
  if (!password) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              score >= i ? STRENGTH_COLOR[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs transition-colors duration-200 ${
        score === 1 ? "text-destructive" : score === 2 ? "text-amber-500" : "text-green-500"
      }`}>
        {STRENGTH_LABEL[score]}
      </p>
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView() {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-2">
      <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center shadow-sm">
        <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground tracking-tight">
          Password updated
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your password has been reset successfully.
          <br />
          You can now sign in with your new password.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors duration-200"
      >
        Continue to sign in
      </Link>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const toggleConfirm  = useCallback(() => setShowConfirm((v) => !v), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");

  const onSubmit = async (data: FormValues) => {
    // Replace with real API call:
    // await fetch("/api/auth/reset-password", {
    //   method: "POST",
    //   body: JSON.stringify({ token, password: data.password }),
    // });
    void token;
    await new Promise((res) => setTimeout(res, 1000));
    setDone(true);
  };

  if (done) return <SuccessView />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

      {/* New password */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-sm font-medium">
          New password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            className="h-10 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={togglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : (
          <StrengthBar password={passwordValue} />
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.confirmPassword}
            className="h-10 pr-10"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleConfirm}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="w-full h-10 font-medium mt-1"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Updating password…
          </>
        ) : (
          "Reset password"
        )}
      </Button>

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>
    </form>
  );
}
