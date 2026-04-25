"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ArrowRight, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ShineBorder } from "@/components/ui/shine-border";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sileo-toast";

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
  "basic-chat": "pricing.features.basicChat",
  "basic-projects": "pricing.features.basicProjects",
  "short-memory": "pricing.features.shortMemory",
  "longer-memory": "pricing.features.longerMemory",
  attachments: "pricing.features.attachments",
  "advanced-customization": "pricing.features.advancedCustomization",
  "chat-folders": "pricing.features.chatFolders",
  "chat-branches": "pricing.features.chatBranches",
  "export-chats": "pricing.features.exportChats",
  "team-collaboration": "pricing.features.teamCollaboration",
  "api-access": "pricing.features.apiAccess",
  "priority-support": "pricing.features.prioritySupport",
  "dedicated-support": "pricing.features.dedicatedSupport",
};

async function fetchPlans(): Promise<PlansData> {
  const res = await fetch("/api/polar/plans");
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
  t: ReturnType<typeof useTranslations>;
}

const TierCard = React.memo(function TierCard({
  tier,
  isCurrentPlan,
  variant = "default",
  onUpgrade,
  isUpgrading,
  t,
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
            {t("pricing.mostPopular")}
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
            {t("pricing.currentPlanBadge")}
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
              {t("pricing.perMonth")}
            </span>
          </div>
          {value.credits > 0 && (
            <p className="text-[11px] text-primary/80 font-medium mb-2">
              {value.credits.toLocaleString()} {t("pricing.creditsPerMonth")}
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
            t("pricing.currentPlanButton")
          ) : isUpgrading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("pricing.redirecting")}
            </>
          ) : (
            <>
              {isFree ? t("pricing.getStarted") : t("pricing.upgradeTo", { plan: value.name })}
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
  labelKey: string;
  free: string | boolean | number;
  basic: string | boolean | number;
  pro: string | boolean | number;
}

const FeatureRow = React.memo(function FeatureRow({
  label,
  labelKey,
  free,
  basic,
  pro,
}: FeatureRowProps) {
  const t = useTranslations("pricing");
  const cells = [
    { value: free, featured: false },
    { value: basic, featured: false },
    { value: pro, featured: true },
  ];

  return (
    <div className="grid grid-cols-4 hover:bg-muted/[0.04] border-b border-border/30 last:border-0">
      <div className="py-3 px-4 flex items-center">
        <p className="text-[12px] text-foreground/80">{t(labelKey)}</p>
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
  const t = useTranslations();
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
        toast.error(t("pricing.pleaseSignInToUpgrade"));
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

    type FeatureEntry = {
      label: string;
      labelKey: string;
      free: string | boolean | number;
      basic: string | boolean | number;
      pro: string | boolean | number;
    };

    const featureMap = new Map<string, FeatureEntry>();

    // Add plan-level features
    plans.forEach(({ key, value }) => {
      const tierKey = key === "free" ? "free" : key === "basic" ? "basic" : "pro";
      // Chats
      if (!featureMap.has("Chats")) {
        featureMap.set("Chats", { label: "Chats", labelKey: "features.chats", free: "—", basic: "—", pro: "—" });
      }
      const current = featureMap.get("Chats")!;
      (current as Record<typeof tierKey, string | boolean | number>)[tierKey] = value.maxChats === -1 ? t("unlimited") : value.maxChats;

      // Projects
      if (!featureMap.has("Projects")) {
        featureMap.set("Projects", { label: "Projects", labelKey: "features.projects", free: "—", basic: "—", pro: "—" });
      }
      const proj = featureMap.get("Projects")!;
      (proj as Record<typeof tierKey, string | boolean | number>)[tierKey] = value.maxProjects === -1 ? t("unlimited") : value.maxProjects;

      // Credits
      if (!featureMap.has("Monthly credits")) {
        featureMap.set("Monthly credits", { label: "Monthly credits", labelKey: "features.monthlyCredits", free: "—", basic: "—", pro: "—" });
      }
      const cred = featureMap.get("Monthly credits")!;
      (cred as Record<typeof tierKey, string | boolean | number>)[tierKey] = value.credits > 0 ? value.credits.toLocaleString() : "—";
    });

    // Add specific features
    data.plans.free.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] ? `features.${FEATURE_LABELS[f].toLowerCase().replace(/\s+/g, "")}` : f;
      if (!featureMap.has(featureLabel)) {
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, free: true, basic: "—", pro: "—" });
      }
    });
    data.plans.basic.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] ? `features.${FEATURE_LABELS[f].toLowerCase().replace(/\s+/g, "")}` : f;
      if (!featureMap.has(featureLabel)) {
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, free: "—", basic: true, pro: "—" });
      } else {
        featureMap.get(featureLabel)!.basic = true;
      }
    });
    data.plans.pro.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] ? `features.${FEATURE_LABELS[f].toLowerCase().replace(/\s+/g, "")}` : f;
      if (!featureMap.has(featureLabel)) {
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, free: "—", basic: "—", pro: true });
      } else {
        featureMap.get(featureLabel)!.pro = true;
      }
    });

    return Array.from(featureMap.values());
  }, [data, t]);

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
              {t("pricing.title")}
            </p>
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">
              {t("pricing.chooseYourPlan")}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t("pricing.subtitle")}
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
            <span className="sr-only">{t("pricing.close")}</span>
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
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Feature comparison */}
            <div>
              <div className="flex items-center gap-3 py-3">
                <div className="h-px flex-1 bg-border/40" />
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
                  {t("pricing.fullComparison")}
                </p>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-4 border-b border-border bg-muted/20">
                  <div className="py-3 px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {t("pricing.feature")}
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
                      key={feature.labelKey}
                      label={feature.label}
                      labelKey={feature.labelKey}
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
            {t("pricing.trialNote")}
          </p>
          <DialogClose
            render={
              <Button variant="ghost" size="sm" className="h-7 text-[12px]" />
            }
          >
            {t("pricing.maybeLater")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
