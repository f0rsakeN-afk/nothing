"use client";

import Image from "next/image";
import { OAuthButtonGroup } from "@stackframe/stack";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-[400px] p-0 overflow-hidden">
        {/* Gradient header band */}
        <div className="relative flex flex-col items-center px-8 pt-10 pb-6 bg-gradient-to-b from-primary/5 via-primary/[0.03] to-transparent">
          {/* Logo mark */}
          <div className="relative w-12 h-12 mb-4">
            <Image
              src="/eryx-icon.png"
              alt="Eryx"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>

          {/* Wordmark */}
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Eryx
            </span>
            <div className="h-4 w-px bg-border/60" />
            <span className="text-[12px] text-muted-foreground font-medium">
              AI Assistant
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-[18px] font-semibold text-foreground tracking-tight text-center leading-snug mb-1.5">
            Welcome back
          </h2>
          <p className="text-[13px] text-muted-foreground text-center leading-relaxed px-2">
            Sign in to continue to your workspace
          </p>
        </div>

        {/* OAuth section */}
        <div className="px-8 py-5">
          <OAuthButtonGroup type="sign-in" />
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 pt-0">
          <Separator className="mb-4" />
          <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground/80 transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/legal/policy" target="_blank" className="underline underline-offset-2 hover:text-foreground/80 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}