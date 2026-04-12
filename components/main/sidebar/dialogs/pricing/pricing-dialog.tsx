"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShineBorder } from "@/components/ui/shine-border";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PricingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const res = await fetch("/api/stripe/plans");
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

// ---------------------------------------------------------------------------
// TierCard — renders one tier card
// ---------------------------------------------------------------------------

interface TierCardProps {
  tier: { key: string; value: Plan };
  isCurrentPlan: boolean;
  variant?: "default" | "featured";
  onUpgrade: (planId: string) => void;
  isUpgrading: boolean;
}

const TierCard = React.memo(function TierCard({
  tier,
  isCurrentPlan,
  variant = "default",
  onUpgrade,
  isUpgrading,
}: TierCardProps) {
  const { key, value } = tier;
  const isFree = key === "free";
  const isFeatured = variant === "featured";

  return (
    <div
      className={cn(
        "relative rounded-xl flex flex-col overflow-hidden transition-all duration-300",
        isFeatured
          ? "bg-card border border-primary/25 shadow-lg shadow-primary/8"
          : "bg-card border border-border hover:border-border/60",
      )}
    >
      {isFeatured && (
        <ShineBorder
          shineColor={[
            "hsl(var(--primary))",
            "hsl(var(--primary) / 0.25)",
            "hsl(var(--primary))",
          ]}
          duration={9}
          borderWidth={1}
          className="rounded-xl"
        />
      )}

      {isFeatured && (
        <div className="bg-primary/8 border-b border-primary/15 px-5 py-2 flex items-center justify-between">
          <span className="text-[9px] font-semibold text-primary uppercase tracking-widest">
            Most Popular
          </span>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-primary/40" />
            ))}
          </div>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-3 z-20">
          <span className="bg-green-500/10 text-green-600 text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border border-green-500/20">
            Current Plan
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-5 relative z-10 flex-1">
        <div>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-widest mb-3",
              isFeatured ? "text-primary" : "text-muted-foreground",
            )}
          >
            {value.name}
          </p>
          <div className="flex items-end gap-1.5 mb-2">
            <span className="text-[1.875rem] font-semibold tracking-tight text-foreground leading-none">
              {isFree ? "$0" : `$${(value.price / 100).toFixed(2)}`}
            </span>
            <span className="text-[11px] text-muted-foreground pb-0.5">
              /month
            </span>
          </div>
          {value.credits > 0 && (
            <p className="text-[11px] text-primary/80 font-medium mb-2">
              {value.credits.toLocaleString()} credits/mo
            </p>
          )}
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {value.description}
          </p>
        </div>

        <div
          className={cn(
            "h-px",
            isFeatured ? "bg-primary/15" : "bg-border/60",
          )}
        />

        <button
          className={cn(
            "w-full py-2 rounded-lg font-medium text-[12px] transition-all flex items-center justify-center gap-1.5 group",
            isCurrentPlan
              ? "bg-muted text-muted-foreground cursor-default"
              : isFeatured
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-background border border-border text-foreground hover:bg-muted",
          )}
          disabled={isCurrentPlan || isUpgrading}
          onClick={() => onUpgrade(key)}
        >
          {isCurrentPlan ? (
            "Current Plan"
          ) : isUpgrading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              {isFree ? "Get Started" : `Upgrade to ${value.name}`}
              <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// FeatureRow
// ---------------------------------------------------------------------------

interface FeatureRowProps {
  label: string;
  free: string | boolean | number;
  basic: string | boolean | number;
  pro: string | boolean | number;
}

const FeatureRow = React.memo(function FeatureRow({
  label,
  free,
  basic,
  pro,
}: FeatureRowProps) {
  const cells = [
    { value: free, featured: false },
    { value: basic, featured: false },
    { value: pro, featured: true },
  ];

  return (
    <div className="grid grid-cols-4 hover:bg-muted/[0.04] border-b border-border/30 last:border-0">
      <div className="py-3 px-4 flex items-center">
        <p className="text-[12px] text-foreground/80">{label}</p>
      </div>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "py-3 px-3 flex items-center justify-center",
            i === 2 && "bg-primary/[0.03]",
          )}
        >
          {typeof cell.value === "boolean" ? (
            cell.value ? (
              <Check
                className={cn(
                  "w-3.5 h-3.5",
                  cell.featured ? "text-primary" : "text-foreground/70",
                )}
                strokeWidth={3}
              />
            ) : (
              <span className="text-muted-foreground/30 text-sm">—</span>
            )
          ) : (
            <span
              className={cn(
                "text-[11px] font-medium",
                cell.featured ? "text-primary" : "text-foreground/70",
              )}
            >
              {cell.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// PricingDialog
// ---------------------------------------------------------------------------

export function PricingDialog({ isOpen, onOpenChange }: PricingDialogProps) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["stripe-plans"],
    queryFn: fetchPlans,
    enabled: isOpen,
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
        onOpenChange(false);
        router.push("/login");
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleUpgrade = (planId: string) => {
    if (planId === "free") {
      onOpenChange(false);
      router.push("/signup");
      return;
    }
    checkoutMutation.mutate(planId);
  };

  const plans = data
    ? (Object.entries(data.plans)
        .filter(([key]) => key !== "enterprise")
        .map(([key, value]) => ({ key, value })) as { key: string; value: Plan }[])
    : [];

  // Group features from all plans
  const allFeatures = React.useMemo(() => {
    if (!data) return [];

    const featureMap = new Map<string, { free: string | boolean | number; basic: string | boolean | number; pro: string | boolean | number }>();

    // Add plan-level features
    plans.forEach(({ key, value }) => {
      const tierKey = key === "free" ? "free" : key === "basic" ? "basic" : "pro";
      // Chats
      if (!featureMap.has("Chats")) {
        featureMap.set("Chats", { free: "—", basic: "—", pro: "—" });
      }
      const current = featureMap.get("Chats")!;
      current[tierKey as keyof typeof current] = value.maxChats === -1 ? "Unlimited" : value.maxChats;

      // Projects
      if (!featureMap.has("Projects")) {
        featureMap.set("Projects", { free: "—", basic: "—", pro: "—" });
      }
      const proj = featureMap.get("Projects")!;
      proj[tierKey as keyof typeof proj] = value.maxProjects === -1 ? "Unlimited" : value.maxProjects;

      // Credits
      if (!featureMap.has("Monthly credits")) {
        featureMap.set("Monthly credits", { free: "—", basic: "—", pro: "—" });
      }
      const cred = featureMap.get("Monthly credits")!;
      cred[tierKey as keyof typeof cred] = value.credits > 0 ? value.credits.toLocaleString() : "—";
    });

    // Add specific features
    data.plans.free.features.forEach((f) => {
      if (!featureMap.has(FEATURE_LABELS[f] || f)) {
        featureMap.set(FEATURE_LABELS[f] || f, { free: true, basic: "—", pro: "—" });
      }
    });
    data.plans.basic.features.forEach((f) => {
      const label = FEATURE_LABELS[f] || f;
      if (!featureMap.has(label)) {
        featureMap.set(label, { free: "—", basic: true, pro: "—" });
      } else {
        featureMap.get(label)!.basic = true;
      }
    });
    data.plans.pro.features.forEach((f) => {
      const label = FEATURE_LABELS[f] || f;
      if (!featureMap.has(label)) {
        featureMap.set(label, { free: "—", basic: "—", pro: true });
      } else {
        featureMap.get(label)!.pro = true;
      }
    });

    return Array.from(featureMap.entries()).map(([label, values]) => ({
      label,
      ...values,
    }));
  }, [data]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl p-0 gap-0 max-h-[90dvh] flex flex-col"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Pricing
            </p>
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">
              Choose your plan
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Simple, transparent pricing. Upgrade or downgrade anytime.
            </p>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 mt-0.5"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* ── Scrollable body ────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0 max-h-[70dvh] overflow-auto hide-scrollbar">
          <div className="px-6 py-5 space-y-6">
            {/* Tier cards */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[280px] rounded-xl border border-border bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map(({ key, value }) => (
                  <TierCard
                    key={key}
                    tier={{ key, value }}
                    isCurrentPlan={data?.currentPlan === key}
                    variant={key === "pro" ? "featured" : "default"}
                    onUpgrade={handleUpgrade}
                    isUpgrading={checkoutMutation.isPending}
                  />
                ))}
              </div>
            )}

            {/* Feature comparison */}
            <div>
              <div className="flex items-center gap-3 py-3">
                <div className="h-px flex-1 bg-border/40" />
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
                  Full comparison
                </p>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-4 border-b border-border bg-muted/20">
                  <div className="py-3 px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Feature
                    </p>
                  </div>
                  {plans.map(({ key, value }) => (
                    <div
                      key={key}
                      className={cn(
                        "py-3 px-3 text-center",
                        key === "pro" && "bg-primary/5",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-widest",
                          key === "pro" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {value.name}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Feature rows */}
                {isLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-8 rounded-md bg-muted/20 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  allFeatures.map((feature) => (
                    <FeatureRow
                      key={feature.label}
                      label={feature.label}
                      free={feature.free}
                      basic={feature.basic}
                      pro={feature.pro}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 shrink-0">
          <p className="text-[11px] text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <DialogClose
            render={
              <Button variant="ghost" size="sm" className="h-7 text-[12px]" />
            }
          >
            Maybe later
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
