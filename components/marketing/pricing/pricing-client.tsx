"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@stackframe/stack";
import { AuthDialog } from "@/components/main/sidebar/dialogs/auth/auth-dialog";
import { Button } from "@/components/ui/button";
import { PixelBackground } from "@/src/components/unlumen-ui/pixel";

interface Plan {
  name: string;
  price: number;
  credits: number;
  maxChats: number;
  maxProjects: number;
  features: string[];
  description?: string;
}

interface PlansData {
  plans: {
    free: Plan;
    basic: Plan;
    pro: Plan;
    enterprise: Plan;
  };
  creditPackages: never[];
  creditCosts: Record<string, number>;
  currentPlan: string;
}

const FEATURE_LABELS: Record<string, string> = {
  "basic-chat": "Basic chat",
  "basic-projects": "Basic projects",
  "short-memory": "Short-term memory",
  "longer-memory": "Longer conversation memory",
  attachments: "File attachments",
  "advanced-customization": "Advanced customization",
  "chat-folders": "Chat folders",
  "chat-branches": "Chat branches",
  "export-chats": "Export chats",
  "team-collaboration": "Team collaboration",
  "api-access": "API access",
  "priority-support": "Priority support",
  "dedicated-support": "Dedicated support",
};

function PricingCard({
  plan,
  isCurrentPlan,
  variant = "default",
  onUpgrade,
  isUpgrading,
}: {
  plan: { key: string; value: Plan };
  isCurrentPlan: boolean;
  variant?: "default" | "featured" | "compact";
  onUpgrade?: (planId: string) => void;
  isUpgrading?: boolean;
}) {
  const { key, value } = plan;
  const isFree = key === "free";
  const isPro = key === "pro";
  const isBasic = key === "basic";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl transition-all duration-300",
        variant === "featured"
          ? "bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 border-primary/30 shadow-2xl shadow-primary/10 p-8"
          : variant === "compact"
          ? "border-border/60 bg-background/80 backdrop-blur-sm p-6"
          : "border-border bg-background/80 backdrop-blur-sm p-6",
        isCurrentPlan && "ring-2 ring-primary/20"
      )}
    >
      {variant === "featured" && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-primary/25 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && !isPro && (
        <div className="absolute -top-4 right-4">
          <span className="bg-green-500/10 text-green-600 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border border-green-500/20">
            Current Plan
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h3
            className={cn(
              "font-semibold text-foreground",
              variant === "featured" ? "text-xl" : variant === "compact" ? "text-base" : "text-lg",
            )}
          >
            {value.name}
          </h3>
          {isPro && !isCurrentPlan && (
            <span className="bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Best Value
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-bold text-foreground tracking-tight",
              variant === "featured" ? "text-5xl" : variant === "compact" ? "text-3xl" : "text-4xl",
            )}
          >
            {isFree ? "$0" : `$${(value.price / 100).toFixed(0)}`}
          </span>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">/month</span>
            {!isFree && (
              <span className="text-[10px] text-muted-foreground/60">billed monthly</span>
            )}
          </div>
        </div>

        {value.credits > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/5 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
            <Zap className="w-3 h-3" />
            {value.credits.toLocaleString()} credits included
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={cn("h-px mb-5", variant === "featured" ? "bg-primary/20" : "bg-border")} />

      {/* Description */}
      <p className={cn("text-muted-foreground mb-6 leading-relaxed", variant === "compact" ? "text-xs" : "text-sm")}>
        {value.description}
      </p>

      {/* CTA Button */}
      <Button
        variant={variant === "featured" ? "default" : "outline"}
        size={variant === "featured" ? "lg" : "default"}
        className={cn(
          "w-full font-semibold transition-all duration-200",
          variant === "featured"
            ? "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            : "hover:bg-muted",
          isCurrentPlan && "bg-muted text-muted-foreground cursor-default pointer-events-none"
        )}
        disabled={isCurrentPlan || isUpgrading}
        onClick={() => onUpgrade?.(key)}
      >
        {isCurrentPlan ? (
          "Current Plan"
        ) : isFree ? (
          <>
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        ) : (
          <>
            {isBasic ? "Start Basic" : `Upgrade to ${value.name}`}
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {/* Features Section */}
      <div className={cn("mt-8", variant === "compact" ? "mt-6" : "mt-8")}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
          What&apos;s included
        </p>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                variant === "featured" ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Check className={cn("w-3 h-3", variant === "featured" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-foreground", variant === "compact" ? "text-sm" : "text-sm")}>
              <span className="font-medium">{value.maxChats === -1 ? "Unlimited" : value.maxChats}</span>{" "}
              <span className="text-muted-foreground">chats</span>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                variant === "featured" ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Check className={cn("w-3 h-3", variant === "featured" ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-foreground", variant === "compact" ? "text-sm" : "text-sm")}>
              <span className="font-medium">{value.maxProjects === -1 ? "Unlimited" : value.maxProjects}</span>{" "}
              <span className="text-muted-foreground">projects</span>
            </span>
          </li>
          {value.features.slice(0, variant === "compact" ? 4 : undefined).map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  variant === "featured" ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Check className={cn("w-3 h-3", variant === "featured" ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className={cn("text-foreground", variant === "compact" ? "text-xs" : "text-sm")}>
                {FEATURE_LABELS[feature] || feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PricingClient({ data }: { data: PlansData }) {
  const router = useRouter();
  const user = useUser();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }
    if (planId === "free") {
      router.push("/signup");
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create checkout");
      }
      const result = await res.json();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      if (message.includes("Unauthorized")) {
        router.push("/login");
      } else {
        console.error(message);
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const plans = Object.entries(data.plans).filter(([key]) => key !== "enterprise") as [string, Plan][];

  return (
    <>
      <div id="pricing" className="space-y-12">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
              Pricing
            </p>
            <h2 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
              Choose your plan
            </h2>
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Transparent pricing designed to scale with your architecture.
              Start building immediately with zero upfront commitment.
            </p>
          </div>

          {/* Pricing Cards */}
          <PixelBackground
            gap={6}
            speed={20}
            pattern="diagonal"
            darkColors="#2a2a2a,#3b3b3b,#525252,#404040"
            lightColors="#e5e5e5,#d4d4d4,#c4c4c4,#b5b5b5"
            className="rounded-3xl border border-border/50 bg-muted/20 p-6 md:p-8"
          >
            <div className="grid md:grid-cols-[1fr_1.15fr_1fr] gap-6 items-stretch">
              {plans.map(([key, plan]) => {
                let variant: "default" | "featured" | "compact" = "default";
                if (key === "pro") variant = "featured";
                if (key === "free" || key === "basic") variant = "compact";

                return (
                  <PricingCard
                    key={key}
                    plan={{ key, value: plan }}
                    isCurrentPlan={data.currentPlan === key}
                    variant={variant}
                    onUpgrade={handleUpgrade}
                    isUpgrading={isUpgrading}
                  />
                );
              })}
            </div>
          </PixelBackground>
        </div>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}