"use client";

import * as React from "react";
import { Check, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tiers, featureGroups } from "@/lib/data/pricing";
import { ShineBorder } from "@/components/ui/shine-border";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PricingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// PricingCard — memoised, renders one tier card
// ---------------------------------------------------------------------------

interface TierCardProps {
  tier: (typeof tiers)[number];
}

const TierCard = React.memo(function TierCard({ tier }: TierCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl flex flex-col overflow-hidden transition-all duration-300",
        tier.featured
          ? "bg-card border border-primary/25 shadow-lg shadow-primary/8"
          : "bg-card border border-border hover:border-border/60",
      )}
    >
      {tier.featured && (
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

      {tier.featured && (
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

      <div className="p-5 flex flex-col gap-5 relative z-10 flex-1">
        <div>
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-widest mb-3",
              tier.featured ? "text-primary" : "text-muted-foreground",
            )}
          >
            {tier.name}
          </p>
          <div className="flex items-end gap-1.5 mb-2">
            <span className="text-[1.875rem] font-semibold tracking-tight text-foreground leading-none">
              {tier.price}
            </span>
            <span className="text-[11px] text-muted-foreground pb-0.5">
              {tier.priceNote}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {tier.description}
          </p>
        </div>

        <div
          className={cn(
            "h-px",
            tier.featured ? "bg-primary/15" : "bg-border/60",
          )}
        />

        <button
          className={cn(
            "w-full py-2 rounded-lg font-medium text-[12px] transition-all flex items-center justify-center gap-1.5 group",
            tier.featured
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-background border border-border text-foreground hover:bg-muted",
          )}
        >
          {tier.cta}
          <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
});

interface FeatureCellProps {
  value: string | boolean;
  featured?: boolean;
}

const FeatureCell = React.memo(function FeatureCell({
  value,
  featured,
}: FeatureCellProps) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className={cn(
          "w-3.5 h-3.5",
          featured ? "text-primary" : "text-foreground/70",
        )}
        strokeWidth={3}
      />
    ) : (
      <span className="text-muted-foreground/30 text-sm">—</span>
    );
  }
  return (
    <span
      className={cn(
        "text-[11px] font-medium",
        featured ? "text-primary" : "text-foreground/70",
      )}
    >
      {value}
    </span>
  );
});

// ---------------------------------------------------------------------------
// PricingDialog
// ---------------------------------------------------------------------------

export function PricingDialog({ isOpen, onOpenChange }: PricingDialogProps) {
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} />
              ))}
            </div>

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
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={cn(
                        "py-3 px-3 text-center",
                        tier.featured && "bg-primary/5",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-widest",
                          tier.featured
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {tier.name}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Feature groups */}
                {featureGroups.map((group) => (
                  <div key={group.group}>
                    {/* Group label row */}
                    <div className="grid grid-cols-4 bg-muted/10">
                      <div className="col-span-4 py-2 px-4 border-b border-border/40">
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                          {group.group}
                        </p>
                      </div>
                    </div>
                    {/* Feature rows */}
                    {group.features.map((feature, fi) => {
                      const isLast = fi === group.features.length - 1;
                      return (
                        <div
                          key={feature.label}
                          className={cn(
                            "grid grid-cols-4 hover:bg-muted/[0.04]  ",
                            !isLast && "border-b border-border/30",
                          )}
                        >
                          <div className="py-3 px-4 flex items-center">
                            <p className="text-[12px] text-foreground/80">
                              {feature.label}
                            </p>
                          </div>
                          {(["free", "pro", "enterprise"] as const).map(
                            (tid) => (
                              <div
                                key={tid}
                                className={cn(
                                  "py-3 px-3 flex items-center justify-center",
                                  tid === "pro" && "bg-primary/[0.03]",
                                )}
                              >
                                <FeatureCell
                                  value={feature[tid] as string | boolean}
                                  featured={tid === "pro"}
                                />
                              </div>
                            ),
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
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
