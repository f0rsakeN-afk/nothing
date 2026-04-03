"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "2,500 credits/mo",
  "GPT-4o access",
  "5 projects",
  "File uploads",
] as const;

const USAGE_BREAKDOWN = [
  { label: "Chat messages", used: 1240, pct: "50%" },
  { label: "Web searches", used: 380, pct: "15%" },
  { label: "File analyses", used: 130, pct: "5%" },
] as const;

export const PlanSection = React.memo(function PlanSection() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Plan
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Your current plan and credit usage.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-border/60 bg-card/80 p-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Basic
            </span>
          </div>
          <p className="text-[15px] font-semibold text-foreground leading-none">
            Basic Plan
          </p>
          <p className="text-[12px] text-muted-foreground">
            Free tier · 2,500 credits/month
          </p>
        </div>
        <Button size="sm" className="h-7 text-[12px] shrink-0">
          Upgrade
        </Button>
      </div>

      {/* Credits usage */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Credits this month
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: "70%" }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-foreground">
              1,750 / 2,500 remaining
            </span>
            <span className="text-[11px] text-muted-foreground">
              Resets in 18 days
            </span>
          </div>
        </div>
      </div>

      {/* Usage breakdown */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Usage breakdown
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {USAGE_BREAKDOWN.map(({ label, used, pct }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[13px] text-foreground truncate">{label}</span>
                <div className="flex-1 h-1 rounded-full bg-border overflow-hidden min-w-0 max-w-24">
                  <div className="h-full rounded-full bg-primary/50" style={{ width: pct }} />
                </div>
              </div>
              <span className="text-[12px] text-muted-foreground shrink-0">
                {used.toLocaleString()} used
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Included features */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Included features
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <div
              key={f}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <Check className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[12px] text-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
