import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — Nothing",
  description:
    "Enter your email and we'll send you a link to reset your password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient glow — purely decorative depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[500px] w-[500px] rounded-full bg-foreground/[0.03] blur-3xl" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-foreground/[0.02] blur-3xl"
      />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-[360px] flex-col items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-60" />
          <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-muted-foreground">
            Nothing
          </span>
        </Link>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border bg-card px-7 py-8 shadow-xl shadow-black/5 dark:shadow-black/25 ring-1 ring-border/40">
          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center gap-3 mb-7">
            <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center shadow-sm">
              <KeyRound
                className="w-[18px] h-[18px] text-foreground"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Forgot your password?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                No worries — we&apos;ll send you reset instructions.
              </p>
            </div>
          </div>

          <ForgotPasswordForm />
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors duration-200"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
