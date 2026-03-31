"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { loginSchema, type loginInput } from "@/schemas/auth";
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

// ─── Form ─────────────────────────────────────────

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => setShowPassword((v) => !v), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<loginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: loginInput) => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
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
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">
          or continue with email
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-3"
      >
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="font-medium text-xs">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoFocus
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-medium text-xs">
              Password
            </Label>
            <Link
              href="/forgotpassword"
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-4   duration-200"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
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

          {errors.password && (
            <p className="text-[10px] font-medium text-destructive">
              {errors.password.message}
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
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}
