import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Verify Email — Nothing",
  description: "Verify your email address to continue.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { email } = await searchParams;

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
              <Mail
                className="w-[18px] h-[18px] text-foreground"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We sent a verification code to
                {email ? (
                  <>
                    <br />
                    <span className="font-medium text-foreground">{email}</span>
                  </>
                ) : (
                  " your email."
                )}
              </p>
            </div>
          </div>

          <VerifyEmailForm email={email} />
        </div>
      </div>
    </div>
  );
}
