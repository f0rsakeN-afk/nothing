import type { Metadata } from "next";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth/auth-left-panel";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account — Nothing",
  description: "Create your Nothing account and get started for free.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Left — marketing panel (desktop only) */}
      <AuthLeftPanel />

      {/* Right — auth panel */}
      <div className="flex min-h-dvh flex-col items-center justify-center bg-card px-8 py-14 lg:border-l lg:border-border">
        <div className="w-full max-w-[360px] flex flex-col gap-8">
          {/* Logo (mobile only) */}
          <Link
            href="/"
            className="flex items-center gap-2 group lg:hidden w-fit mx-auto"
          >
            <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-60" />
            <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-muted-foreground">
              Nothing
            </span>
          </Link>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Get started for free — no credit card required.
            </p>
          </div>

          {/* Form */}
          <SignupForm />

          {/* Terms */}
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            By continuing, you agree to our{" "}
            <Link
              href="/legal/terms"
              className="underline underline-offset-4 hover:text-foreground transition-colors duration-200"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/policy"
              className="underline underline-offset-4 hover:text-foreground transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            .
          </p>

          {/* Switch */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
