"use client";

import { Crown, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    id: "basic",
    label: "Basic",
    price: "Free",
    description: "For casual use",
    features: ["50 messages / day", "Standard models", "5 MB file uploads"],
    current: true,
  },
  {
    id: "pro",
    label: "Pro",
    price: "$12/mo",
    description: "For power users",
    features: [
      "Unlimited messages",
      "Priority access to new models",
      "50 MB file uploads",
      "Context memory",
    ],
    current: false,
  },
] as const;

export function BillingSection() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Billing
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Manage your plan and usage.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Plans
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.current
                  ? "rounded-lg border border-border/60 bg-muted/20 p-4"
                  : "rounded-lg border border-primary/30 bg-primary/5 p-4 ring-1 ring-primary/20"
              }
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {plan.id === "pro" ? (
                    <Crown className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[13px] font-semibold text-foreground">
                    {plan.label}
                  </span>
                </div>
                {plan.current && (
                  <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Current
                  </span>
                )}
              </div>
              <p className="text-[18px] font-bold text-foreground leading-none mb-0.5">
                {plan.price}
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                {plan.description}
              </p>
              <ul className="space-y-1.5 mb-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[12px] text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <Button size="sm" className="w-full h-7 text-[12px]">
                  Upgrade to Pro
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Usage this month
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-muted-foreground">Messages</span>
              <span className="text-[12px] font-medium text-foreground">34 / 50</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: "68%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-muted-foreground">File storage</span>
              <span className="text-[12px] font-medium text-foreground">1.2 MB / 5 MB</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: "24%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
