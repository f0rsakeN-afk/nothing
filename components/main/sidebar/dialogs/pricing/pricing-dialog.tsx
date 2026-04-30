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
  id: string;
  tier: string;
  name: string;
  price: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  features: string[];
  description?: string;
}

interface PlansData {
  plans: Plan[];
  currentPlan: string;
}

const FEATURE_LABELS: Record<string, string> = {
  "basic-chat": "features.basicChat",
  "basic-projects": "features.basicProjects",
  "short-memory": "features.shortMemory",
  "longer-memory": "features.longerMemory",
  attachments: "features.attachments",
  "advanced-customization": "features.advancedCustomization",
  "chat-folders": "features.chatFolders",
  "chat-branches": "features.chatBranches",
  "export-chats": "features.exportChats",
  "team-collaboration": "features.teamCollaboration",
  "api-access": "features.apiAccess",
  "priority-support": "features.prioritySupport",
  "dedicated-support": "features.dedicatedSupport",
};

async function fetchPlans(): Promise<PlansData> {
  const res = await fetch("/api/plans");
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
  onUpgrade: (planId: string, planName: string, planPrice: number) => void;
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
              {`₹${value.price.toLocaleString()}`}
            </span>
            <span className="text-[11px] text-muted-foreground pb-0.5">
              {t("pricing.perMonth")}
            </span>
          </div>
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
          onClick={() => onUpgrade(key, value.name, value.price)}
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
              {t("pricing.subscribeTo", { plan: value.name })}
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
  values: Record<string, string | boolean | number>;
  planKeys: string[];
}

const FeatureRow = React.memo(function FeatureRow({
  label,
  labelKey,
  values,
  planKeys,
}: FeatureRowProps) {
  const t = useTranslations("pricing");

  return (
    <div className={cn("grid hover:bg-muted/[0.04] border-b border-border/30 last:border-0", `grid-cols-${planKeys.length + 1}`)}>
      <div className="py-3 px-4 flex items-center">
        <p className="text-[12px] text-foreground/80">{t(labelKey)}</p>
      </div>
      {planKeys.map((key) => {
        const cell = { value: values[key], featured: key === "pro" };
        return (
          <div
            key={key}
            className={cn(
              "py-3 px-3 flex items-center justify-center",
              key === "pro" && "bg-primary/[0.03]",
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
        );
      })}
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
    queryKey: ["plans"],
    queryFn: fetchPlans,
    enabled: isOpen,
  });

  const [selectedPlan, setSelectedPlan] = React.useState<{ id: string; name: string; price: number } | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);

  const checkoutMutation = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const res = await fetch("/api/payment/checkout", {
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
    onSuccess: (responseData: { method?: string; paymentUrl?: string; formData?: Record<string, string>; pidx?: string }) => {
      // eSewa uses form post
      if (responseData.method === "esewa" && responseData.paymentUrl && responseData.formData) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = responseData.paymentUrl;

        for (const [key, value] of Object.entries(responseData.formData)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      }
      // Khalti uses redirect URL
      else if (responseData.method === "khalti" && responseData.paymentUrl) {
        window.location.href = responseData.paymentUrl;
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

  const handleUpgrade = (planId: string, planName: string, planPrice: number) => {
    setSelectedPlan({ id: planId, name: planName, price: planPrice });
    setShowPaymentDialog(true);
  };

  const handlePayWithEsewa = () => {
    if (selectedPlan) {
      checkoutMutation.mutate({ planId: selectedPlan.id });
    }
  };

  const plans = data
    ? (data.plans
        .filter((p) => p.tier !== "FREE")
        .map((p) => ({ key: p.tier.toLowerCase(), value: p })) as { key: string; value: Plan }[])
    : [];

  // Group features from all plans
  const allFeatures = React.useMemo(() => {
    if (!data) return [];

    type FeatureEntry = {
      label: string;
      labelKey: string;
      values: Record<string, string | boolean | number>;
    };

    const featureMap = new Map<string, FeatureEntry>();
    const planKeys = plans.map((p) => p.key);

    // Initialize all values to "—" for each plan
    const makeValues = (): Record<string, string | boolean | number> => {
      const vals: Record<string, string | boolean | number> = {};
      planKeys.forEach((k) => (vals[k] = "—"));
      return vals;
    };

    // Add plan-level features (chats, projects, messages)
    plans.forEach(({ key, value }) => {
      // Chats
      if (!featureMap.has("Chats")) {
        featureMap.set("Chats", { label: "Chats", labelKey: "features.chats", values: makeValues() });
      }
      featureMap.get("Chats")!.values[key] = value.maxChats === -1 ? "Unlimited" : value.maxChats;

      // Projects
      if (!featureMap.has("Projects")) {
        featureMap.set("Projects", { label: "Projects", labelKey: "features.projects", values: makeValues() });
      }
      featureMap.get("Projects")!.values[key] = value.maxProjects === -1 ? "Unlimited" : value.maxProjects;

      // Messages
      if (!featureMap.has("Monthly messages")) {
        featureMap.set("Monthly messages", { label: "Monthly messages", labelKey: "features.monthlyMessages", values: makeValues() });
      }
      featureMap.get("Monthly messages")!.values[key] = value.maxMessages === -1 ? "Unlimited" : value.maxMessages;
    });

    // Add specific features from plan data
    const basicPlan = data.plans.find((p) => p.tier === "BASIC");
    const proPlan = data.plans.find((p) => p.tier === "PRO");
    const enterprisePlan = data.plans.find((p) => p.tier === "ENTERPRISE");

    basicPlan?.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] || f;
      if (!featureMap.has(featureLabel)) {
        const values = makeValues();
        values["basic"] = true;
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, values });
      } else {
        featureMap.get(featureLabel)!.values["basic"] = true;
      }
    });

    proPlan?.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] || f;
      if (!featureMap.has(featureLabel)) {
        const values = makeValues();
        values["pro"] = true;
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, values });
      } else {
        featureMap.get(featureLabel)!.values["pro"] = true;
      }
    });

    enterprisePlan?.features.forEach((f) => {
      const featureLabel = FEATURE_LABELS[f] || f;
      const featureKey = FEATURE_LABELS[f] || f;
      if (!featureMap.has(featureLabel)) {
        const values = makeValues();
        values["enterprise"] = true;
        featureMap.set(featureLabel, { label: featureLabel, labelKey: featureKey, values });
      } else {
        featureMap.get(featureLabel)!.values["enterprise"] = true;
      }
    });

    return Array.from(featureMap.values());
  }, [data, plans]);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[280px] rounded-xl border border-border bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            ) : !plans.length || !data?.plans ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t("pricing.fetchError")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.refresh()}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                {isLoading ? (
                  <div className="grid grid-cols-4 border-b border-border/30">
                    <div className="py-3 px-4">
                      <div className="h-3 w-16 bg-muted/30 rounded animate-pulse" />
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="py-3 px-3 text-center">
                        <div className="h-3 w-12 bg-muted/30 rounded animate-pulse mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn("grid hover:bg-muted/[0.04] border-b border-border/30 last:border-0", `grid-cols-${plans.length + 1}`)}>
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
                )}

                {/* Feature rows */}
                {isLoading ? (
                  <>
                    {/* Feature table header skeleton */}
                    <div className="grid grid-cols-4 border-b border-border/30">
                      <div className="py-3 px-4">
                        <div className="h-3 w-16 bg-muted/30 rounded animate-pulse" />
                      </div>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="py-3 px-3 text-center">
                          <div className="h-3 w-12 bg-muted/30 rounded animate-pulse mx-auto" />
                        </div>
                      ))}
                    </div>
                    {/* Feature rows skeleton */}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-4 border-b border-border/30 last:border-0">
                        <div className="py-3 px-4">
                          <div className="h-3 w-24 bg-muted/30 rounded animate-pulse" />
                        </div>
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="py-3 px-3 flex items-center justify-center">
                            <div className="h-4 w-4 bg-muted/30 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                ) : (
                  allFeatures.map((feature) => (
                    <FeatureRow
                      key={feature.labelKey}
                      label={feature.label}
                      labelKey={feature.labelKey}
                      values={feature.values}
                      planKeys={plans.map((p) => p.key)}
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

      {/* ── Payment Method Dialog ─────────────────────────────── */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center py-6">
            <h2 className="text-lg font-semibold mb-1">Confirm Purchase</h2>
            {selectedPlan && (
              <p className="text-sm text-muted-foreground mb-6">
                {selectedPlan.name} - ₹{selectedPlan.price.toLocaleString()}/month
              </p>
            )}

            <div className="w-full space-y-3">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                onClick={() => {
                  setShowPaymentDialog(false);
                  handlePayWithEsewa();
                }}
              >
                <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white font-bold text-sm">e</div>
                <span className="font-medium">Pay with eSewa</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              All purchases are non-refundable. By completing this purchase, you agree to our refund policy.
            </p>

            <button
              type="button"
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
