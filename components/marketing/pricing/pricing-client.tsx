"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

async function fetchPlans(): Promise<PlansData> {
  const res = await fetch("/api/polar/plans");
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

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

  return (
    <div
      className={cn(
        "relative rounded-2xl border flex flex-col transition-all",
        variant === "featured"
          ? "rounded-2xl border-primary/50 bg-primary/5 shadow-xl shadow-primary/10 p-8"
          : variant === "compact"
          ? "border-border/80 bg-background/50 p-5"
          : "border-border bg-background p-6",
      )}
    >
      {variant === "featured" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500/10 text-green-600 text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border border-green-500/20">
            Current Plan
          </span>
        </div>
      )}

      <div className={cn("mb-4", variant === "featured" ? "mb-6" : variant === "compact" ? "mb-3" : "mb-4")}>
        <h3
          className={cn(
            "font-semibold text-foreground mb-1",
            variant === "featured" ? "text-xl" : variant === "compact" ? "text-base" : "text-lg",
          )}
        >
          {value.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "font-bold text-foreground",
              variant === "featured" ? "text-4xl" : variant === "compact" ? "text-2xl" : "text-3xl",
            )}
          >
            {isFree ? "$0" : `$${(value.price / 100).toFixed(2)}`}
          </span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        {value.credits > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {value.credits.toLocaleString()} credits/month
          </p>
        )}
      </div>

      <p className={cn("text-muted-foreground mb-4 flex-1", variant === "compact" ? "text-xs mb-3" : "text-sm mb-4")}>
        {value.description}
      </p>

      <button
        className={cn(
          "w-full rounded-xl text-sm font-medium transition-all",
          variant === "featured"
            ? "py-3 bg-primary text-primary-foreground hover:bg-primary/90"
            : variant === "compact"
            ? "py-2 border border-border hover:bg-muted"
            : "py-2.5 border border-border hover:bg-muted",
          isCurrentPlan && "bg-muted text-muted-foreground cursor-default",
        )}
        disabled={isCurrentPlan || isUpgrading}
        onClick={() => onUpgrade?.(key)}
      >
        {isCurrentPlan ? "Current Plan" : isFree ? "Get Started" : `Upgrade to ${value.name}`}
      </button>

      <div className={cn("space-y-2", variant === "featured" ? "mt-6" : variant === "compact" ? "mt-4" : "mt-5")}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Includes
        </p>
        <ul className={cn("space-y-2", variant === "compact" ? "space-y-1.5" : "space-y-2")}>
          <li className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>{value.maxChats === -1 ? "Unlimited" : value.maxChats} chats</span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>{value.maxProjects === -1 ? "Unlimited" : value.maxProjects} projects</span>
          </li>
          {value.features.slice(0, variant === "compact" ? 3 : undefined).map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span className={variant === "compact" ? "text-xs" : "text-sm"}>{FEATURE_LABELS[feature] || feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PricingClient() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["stripe-plans"],
    queryFn: fetchPlans,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create checkout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("Unauthorized")) {
        toast.error("Please sign in to upgrade");
        router.push("/login");
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleUpgrade = (planId: string) => {
    if (planId === "free") {
      router.push("/signup");
      return;
    }
    checkoutMutation.mutate(planId);
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[450px] rounded-2xl border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const plans = Object.entries(data.plans).filter(([key]) => key !== "enterprise") as [string, Plan][];

  return (
    <div className="space-y-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Pricing
          </p>
          <h2 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-4">
            Choose your plan
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Transparent pricing designed to scale with your architecture.
            Start building immediately with zero upfront commitment.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-[1fr_1.15fr_1fr] gap-4 items-stretch">
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
                isUpgrading={checkoutMutation.isPending}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
