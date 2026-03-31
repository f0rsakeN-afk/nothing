"use client";

import React, { memo } from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShineBorder } from "@/components/ui/shine-border";
// ─── Feature Cell ────────────────────────────────────────

interface FeatureCellProps {
  value: string | boolean;
  featured?: boolean;
}

export const FeatureCell = memo(function FeatureCell({
  value,
  featured,
}: FeatureCellProps) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className={cn(
          "w-4 h-4",
          featured ? "text-primary" : "text-foreground/70",
        )}
        strokeWidth={3}
      />
    ) : (
      <span className="text-muted-foreground/30">—</span>
    );
  }
  return (
    <span
      className={cn(
        "text-xs font-medium tracking-tight",
        featured ? "text-primary" : "text-foreground/70",
      )}
    >
      {value}
    </span>
  );
});

// ─── Pricing Card ────────────────────────────────────────

interface PricingCardProps {
  tier: {
    id: string;
    name: string;
    price: string;
    priceNote: string;
    description: string;
    cta: string;
    featured: boolean;
  };
}

export const PricingCard = memo(function PricingCard({
  tier,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl flex flex-col overflow-hidden transition-all duration-300",
        tier.featured
          ? "bg-card border border-primary/25 shadow-xl shadow-primary/8 md:-mt-3"
          : "bg-card border border-border hover:border-border/60 hover:shadow-sm",
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
          className="rounded-2xl"
        />
      )}

      {tier.featured && (
        <div className="bg-primary/8 border-b border-primary/15 px-7 py-2.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
            Most Popular
          </span>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-primary/40" />
            ))}
          </div>
        </div>
      )}

      <div className="p-7 flex flex-col gap-7 relative z-10">
        <div>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-widest mb-4",
              tier.featured ? "text-primary" : "text-muted-foreground",
            )}
          >
            {tier.name}
          </p>
          <div className="flex items-end gap-1.5 mb-3">
            <span className="text-[2.25rem] font-semibold tracking-tight text-foreground leading-none">
              {tier.price}
            </span>
            <span className="text-xs text-muted-foreground pb-1">
              {tier.priceNote}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
            "w-full py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 group",
            tier.featured
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-background border border-border text-foreground hover:bg-muted",
          )}
        >
          {tier.cta}
          <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
});

// ─── Comparison Table Row ────────────────────────────────

interface ComparisonRowProps {
  label: string;
  values: Record<string, string | boolean>;
  isLast?: boolean;
}

export const ComparisonRow = memo(function ComparisonRow({
  label,
  values,
  isLast,
}: ComparisonRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 group/row hover:bg-muted/[0.04]  ",
        !isLast && "border-b border-border/30",
      )}
    >
      <div className="py-3.5 px-6 flex items-center">
        <p className="text-sm text-foreground/80">{label}</p>
      </div>
      {(["free", "pro", "enterprise"] as const).map((tid) => (
        <div
          key={tid}
          className={cn(
            "py-3.5 px-4 flex items-center justify-center",
            tid === "pro" && "bg-primary/[0.03]",
          )}
        >
          <FeatureCell value={values[tid]} featured={tid === "pro"} />
        </div>
      ))}
    </div>
  );
});
