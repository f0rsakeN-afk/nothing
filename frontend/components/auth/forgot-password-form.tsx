"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

import { forgotPasswordSchema, type forgotPasswordInput } from "@/schemas/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function SuccessView({
  email,
  onRetry,
}: {
  email: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-2">
      {/* Icon */}
      <div className="relative flex items-center justify-center">
        <div className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center shadow-sm">
          <Mail className="w-6 h-6 text-foreground" />
        </div>
        {/* Green dot */}
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-foreground tracking-tight">
          Check your inbox
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a reset link to{" "}
          <span className="font-medium text-foreground break-all">{email}</span>
          <br />
          <span className="text-xs">It expires in 15 minutes.</span>
        </p>
      </div>

      <div className="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        Didn&apos;t get it? Check your spam folder or{" "}
        <button
          type="button"
          onClick={onRetry}
          className="text-foreground underline underline-offset-4 hover:text-muted-foreground  "
        >
          send it again
        </button>
        .
      </div>

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground   duration-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<forgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (_data: forgotPasswordInput) => {
    // Replace with real API call:
    // await fetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(data) });
    await new Promise((res) => setTimeout(res, 1000));
    setSubmitted(true);
  };

  const handleRetry = () => {
    reset();
    setSubmitted(false);
  };

  if (submitted) {
    return <SuccessView email={getValues("email")} onRetry={handleRetry} />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="font-medium text-xs">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          className="h-10 rounded-lg"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[10px] font-medium text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-xl font-semibold mt-1"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Sending link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground   duration-200 mt-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>
    </form>
  );
}
