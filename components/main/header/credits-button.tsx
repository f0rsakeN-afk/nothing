"use client";

import { memo, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PricingDialog } from "../sidebar/dialogs/pricing/pricing-dialog";
import { useCreditsStream } from "@/hooks/useCreditsStream";

interface CreditsData {
  credits: {
    current: number;
    plan: number;
    used: number;
    usedPct: number;
    isRollover: boolean;
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    daysUntilReset?: number;
  };
  plan: {
    name: string;
    tier: string;
  };
}

async function fetchCredits(): Promise<CreditsData> {
  const res = await fetch("/api/credits");
  if (!res.ok) throw new Error("Failed to fetch credits");
  return res.json();
}

async function fetchPlans() {
  const res = await fetch("/api/polar/plans");
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export const CreditsButton = memo(function CreditsButton() {
  const [pricingDialogOpen, setPricingDialogOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Subscribe to real-time credit updates via SSE instead of polling
  useCreditsStream();

  const { data, isLoading } = useQuery({
    queryKey: ["credits"],
    queryFn: fetchCredits,
    // No refetchInterval - updates come via SSE push
    staleTime: Infinity, // Data is fresh until SSE update arrives
  });

  const openPricing = useCallback(() => setPricingDialogOpen(true), []);

  // Prefetch plans when user hovers over upgrade button
  const prefetchPlans = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["stripe-plans"],
      queryFn: fetchPlans,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);

  const currentCredits = data?.credits.current ?? 0;
  const planCredits = data?.credits.plan ?? 25;
  const usedPct = data?.credits.usedPct ?? 0;
  const daysUntilReset = data?.subscription.daysUntilReset;
  const hasSubscription = data?.subscription.active ?? false;

  return (
    <>
      <Popover>
        <PopoverTrigger
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border bg-card",
            "px-3 py-1.5 text-[12px] font-medium text-foreground/70",
            "hover:border-foreground/20 hover:bg-accent/60 hover:text-foreground",
            "transition-colors duration-150",
          )}
          aria-label="View credits"
        >
          <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            currentCredits.toLocaleString()
          )}
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="w-64 p-0"
        >
          {/* Header */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Credits
              </p>
              {hasSubscription && (
                <span className="text-[10px] text-primary font-medium">
                  Rollover enabled
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {currentCredits.toLocaleString()}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {planCredits.toLocaleString()}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3">
            {/* Progress bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {usedPct}% used
                </span>
                {daysUntilReset !== null && daysUntilReset !== undefined ? (
                  <span className="text-[11px] text-muted-foreground">
                    Resets in {daysUntilReset}d
                  </span>
                ) : hasSubscription ? (
                  <span className="text-[11px] text-muted-foreground">
                    Credits roll over
                  </span>
                ) : null}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usedPct > 80 ? "bg-red-500" : usedPct > 50 ? "bg-amber-400" : "bg-primary"
                  )}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            {/* Plan name */}
            {data?.plan && (
              <p className="text-[11px] text-muted-foreground text-center">
                {data.plan.name} plan
              </p>
            )}

            {/* Upgrade CTA */}
            <button
              onClick={openPricing}
              onMouseEnter={prefetchPlans}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 rounded-lg",
                "border border-border bg-background py-2 text-[12px] font-medium",
                "text-foreground/70 hover:border-foreground/20 hover:bg-accent/50 hover:text-foreground",
                "transition-colors duration-150",
              )}
            >
              Upgrade plan
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <PricingDialog
        isOpen={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
      />
    </>
  );
});
