"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { signupSchema, type sgnupInput } from "@/schemas/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GoogleIcon, GitHubIcon } from "@/components/auth/brand-icons";

function OAuthButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex flex-1 h-11 items-center justify-center rounded-full border border-border bg-background transition-colors duration-150 hover:bg-muted cursor-pointer"
    >
      {icon}
    </button>
  );
}

// ─── Strength bar ─────────────────────────────────────────

function strengthScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}

const STRENGTH_COLOR = [
  "",
  "bg-destructive",
  "bg-amber-500",
  "bg-green-500",
] as const;

const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;

function StrengthBar({ password }: { password: string }) {
  const score = strengthScore(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
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
      <p
        className={`text-xs ${
          score === 1
            ? "text-destructive"
            : score === 2
              ? "text-amber-500"
              : "text-green-500"
        }`}
      >
        {STRENGTH_LABEL[score]}
      </p>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────

export function SignupForm() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const toggleConfirm = useCallback(() => setShowConfirm((v) => !v), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<sgnupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (data: sgnupInput) => {
    const { confirmPassword, ...payload } = data;

    await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* OAuth */}
      <div className="flex gap-3">
        <OAuthButton
          icon={<GoogleIcon className="w-5 h-5" />}
          label="Continue with Google"
          onClick={() => {}}
        />
        <OAuthButton
          icon={<GitHubIcon className="w-5 h-5 text-foreground" />}
          label="Continue with GitHub"
          onClick={() => {}}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">
          or continue with email
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Conditional render */}
      {!showEmailForm ? (
        <button
          type="button"
          onClick={() => setShowEmailForm(true)}
          className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 text-left cursor-pointer"
        >
          Continue with email
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-3"
          >
            {/* Name */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Alex"
                  autoFocus
                  disabled={isSubmitting}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Johnson"
                  disabled={isSubmitting}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : (
                <StrengthBar password={passwordValue} />
              )}
            </div>

            {/* Confirm */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={toggleConfirm}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
