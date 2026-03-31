import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Nothing",
  description: "Create a new password for your account.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  // No token → invalid/expired link, send to login
  if (!token) redirect("/login");

  return (
    <div className="relative min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient glow */}
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
          <span className="text-sm font-semibold text-foreground   duration-200 group-hover:text-muted-foreground">
            Nothing
          </span>
        </Link>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border bg-card px-7 py-8 shadow-xl shadow-black/5 dark:shadow-black/25 ring-1 ring-border/40">
          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center gap-3 mb-7">
            <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center shadow-sm">
              <ShieldCheck
                className="w-[18px] h-[18px] text-foreground"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Set a new password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Must be different from your previous password.
              </p>
            </div>
          </div>

          <ResetPasswordForm token={token} />
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          Didn&apos;t request a reset?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground   duration-200"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
