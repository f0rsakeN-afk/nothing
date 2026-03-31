import type { Metadata } from "next";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth/auth-left-panel";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In — Nothing",
  description: "Sign in to your Nothing account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Left — marketing panel (desktop only) */}
      <AuthLeftPanel />

      {/* Right — auth panel */}
      <div className="flex min-h-dvh flex-col items-center justify-center bg-card px-8 py-14 lg:border-l lg:border-border">
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          {/* Logo (mobile only — hidden on desktop since left panel has it) */}
          <Link
            href="/"
            className="flex items-center gap-2 group lg:hidden w-fit mx-auto"
          >
            <div className="h-6 w-6 rounded-md bg-foreground transition-opacity duration-200 group-hover:opacity-60" />
            <span className="text-sm font-semibold text-foreground   duration-200 group-hover:text-muted-foreground">
              Nothing
            </span>
          </Link>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to Nothing.
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Terms */}
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            By continuing, you agree to our{" "}
            <Link
              href="/legal/terms"
              className="underline underline-offset-4 hover:text-foreground   duration-200"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/policy"
              className="underline underline-offset-4 hover:text-foreground   duration-200"
            >
              Privacy Policy
            </Link>
            .
          </p>

          {/* Switch */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground   duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
