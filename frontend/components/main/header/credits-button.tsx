"use client";

import { memo } from "react";
import { Zap, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// Mock data — replace with real API data later
// ---------------------------------------------------------------------------

const CREDITS = {
  remaining: 1_750,
  total: 2_500,
  resetsInDays: 18,
};

const used = CREDITS.total - CREDITS.remaining;
const usedPct = Math.round((used / CREDITS.total) * 100);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CreditsButton = memo(function CreditsButton() {
  return (
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
        {CREDITS.remaining.toLocaleString()}
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-64 p-0">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Credits
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {CREDITS.remaining.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / {CREDITS.total.toLocaleString()}
            </span>
          </p>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{usedPct}% used</span>
              <span className="text-[11px] text-muted-foreground">
                Resets in {CREDITS.resetsInDays}d
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>

          {/* Upgrade CTA */}
          <button
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
  );
});
