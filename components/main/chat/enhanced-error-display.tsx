/* eslint-disable */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { memo } from "react";
import { AlertCircle, RefreshCw, LogIn, Crown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhancedErrorDisplayProps {
  error: {
    code?: string;
    message: string;
    cause?: unknown;
    required?: number;
    current?: number;
    upgradeTo?: string;
  };
  onRetry?: () => void;
  onSignIn?: () => void;
  onUpgrade?: () => void;
}

type ErrorVariant = "auth" | "upgrade" | "warning" | "destructive";

function parseErrorVariant(code?: string, message?: string): ErrorVariant {
  if (!code) return "destructive";
  const lower = code.toLowerCase();
  if (lower.includes("auth") || lower.includes("unauthorized") || lower.includes("signin")) return "auth";
  if (lower.includes("upgrade") || lower.includes("pro") || lower.includes("premium") || lower.includes("insufficient")) return "upgrade";
  if (lower.includes("warning") || lower.includes("rate")) return "warning";
  return "destructive";
}

const variantStyles: Record<ErrorVariant, {
  bg: string;
  border: string;
  iconBg: string;
  title: string;
  text: string;
  button: string;
  buttonHover: string;
  icon: LucideIcon;
}> = {
  auth: {
    bg: "bg-primary/5 dark:bg-primary/10",
    border: "border-primary/20 dark:border-primary/30",
    iconBg: "bg-primary/10 dark:bg-primary/20",
    title: "text-primary dark:text-primary",
    text: "text-primary/80 dark:text-primary/80",
    button: "bg-primary hover:bg-primary/90 text-primary-foreground",
    buttonHover: "bg-primary/90",
    icon: LogIn,
  },
  upgrade: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    title: "text-amber-600 dark:text-amber-400",
    text: "text-amber-700/80 dark:text-amber-300/80",
    button: "bg-amber-500 hover:bg-amber-600 text-white",
    buttonHover: "bg-amber-600",
    icon: Crown,
  },
  warning: {
    bg: "bg-muted dark:bg-muted",
    border: "border-muted-foreground/20 dark:border-muted-foreground/30",
    iconBg: "bg-muted-foreground/10 dark:bg-muted-foreground/20",
    title: "text-muted-foreground dark:text-muted-foreground",
    text: "text-muted-foreground/80 dark:text-muted-foreground/80",
    button: "bg-muted-foreground hover:bg-muted-foreground/90 text-background",
    buttonHover: "bg-muted-foreground/90",
    icon: AlertCircle,
  },
  destructive: {
    bg: "bg-destructive/5 dark:bg-destructive/10",
    border: "border-destructive/20 dark:border-destructive/30",
    iconBg: "bg-destructive/10 dark:bg-destructive/20",
    title: "text-destructive dark:text-destructive",
    text: "text-destructive/80 dark:text-destructive/80",
    button: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    buttonHover: "bg-destructive/90",
    icon: AlertCircle,
  },
};

function getErrorTitle(variant: ErrorVariant): string {
  switch (variant) {
    case "auth": return "Sign In Required";
    case "upgrade": return "Upgrade Required";
    case "warning": return "Warning";
    case "destructive": return "Error";
  }
}

function formatMessage(message: string, required?: number, current?: number): string {
  if (required !== undefined && current !== undefined && message.toLowerCase().includes("credit")) {
    return `Insufficient credits. Required: ${required}, Current: ${current}`;
  }
  return message;
}

export const EnhancedErrorDisplay = memo(function EnhancedErrorDisplay({
  error,
  onRetry,
  onSignIn,
  onUpgrade,
}: EnhancedErrorDisplayProps) {
  const variant = parseErrorVariant(error.code, error.message);
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  const errorMessage = formatMessage(error.message, error.required, error.current);
  const errorCause = error.cause ? String(error.cause) : undefined;

  const showRetry = variant === "warning" || variant === "destructive";
  const showSignIn = variant === "auth";
  const showUpgrade = variant === "upgrade";

  return (
    <div className="mt-3 mx-2">
      <div
        className={cn(
          "rounded-xl border bg-background dark:bg-background overflow-hidden",
          styles.border
        )}
      >
        {/* Header */}
        <div
          className={cn("px-4 py-3 border-b flex items-start gap-3", styles.border, styles.bg)}
        >
          <div className="mt-0.5">
            <div className={cn("p-1.5 rounded-full", styles.iconBg)}>
              <Icon className={cn("h-4 w-4", styles.title)} strokeWidth={1.5} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-semibold text-sm", styles.title)}>
              {getErrorTitle(variant)}
            </h3>
            <p className={cn("text-sm mt-0.5", styles.text)}>{errorMessage}</p>
            {error.code && (
              <p className={cn("text-xs mt-1 font-mono opacity-60", styles.text)}>
                {error.code}
              </p>
            )}
          </div>
        </div>

        {/* Cause */}
        {errorCause && (
          <div className="px-4 py-2 border-b border-border/50">
            <pre className="text-xs font-mono text-muted-foreground dark:text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
              {errorCause}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground flex-1">
            {showSignIn
              ? "Please sign in to retry"
              : showUpgrade
              ? "Upgrade to continue using this feature"
              : "You can retry or try a different approach"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {showSignIn && onSignIn && (
              <Button
                onClick={onSignIn}
                size="sm"
                className={cn("text-xs h-8 gap-1.5", styles.button, styles.buttonHover)}
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Button>
            )}
            {showUpgrade && onUpgrade && (
              <Button
                onClick={onUpgrade}
                size="sm"
                className={cn("text-xs h-8 gap-1.5", styles.button, styles.buttonHover)}
              >
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            )}
            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
