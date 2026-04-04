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
      className="flex flex-1 h-11 w-11 items-center justify-center rounded-full border border-border bg-background   duration-150 hover:bg-muted cursor-pointer"
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
            className={`h-1 flex-1 rounded-full   duration-300 ${
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch("password");

  const onSubmit = async (data: sgnupInput) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword: _, ...payload } = data;

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
      <div className="w-full flex justify-center">
        <div className="flex items-center gap-3">
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
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border/60" />
        <div className="flex-1 h-px bg-border/60" />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-3"
      >
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName" className="font-medium text-xs">
              First name
            </Label>
            <Input
              id="firstName"
              placeholder="Alex"
              autoFocus
              disabled={isSubmitting}
              className="h-10 rounded-lg"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-[10px] font-medium text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName" className="font-medium text-xs">
              Last name
            </Label>
            <Input
              id="lastName"
              placeholder="Johnson"
              disabled={isSubmitting}
              className="h-10 rounded-lg"
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-[10px] font-medium text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="font-medium text-xs">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            className="h-10 rounded-lg"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[10px] font-medium text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="font-medium text-xs">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              disabled={isSubmitting}
              className="h-10 rounded-lg pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground  "
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-[10px] font-medium text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <StrengthBar password={passwordValue} />
          )}
        </div>

        {/* Confirm */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword" className="font-medium text-xs">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              disabled={isSubmitting}
              className="h-10 rounded-lg pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={toggleConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground  "
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[10px] font-medium text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl font-semibold mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating
              account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </div>
  );
}
