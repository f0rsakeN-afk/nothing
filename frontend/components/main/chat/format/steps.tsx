"use client";

import { memo, useMemo } from "react";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
  code?: string;
}

interface StepsData {
  title?: string;
  steps: Step[];
}

export const StepsVisualizer = memo(function StepsVisualizer({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo((): StepsData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.steps)) return null;
      return p as StepsData;
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      {parsed.title && (
        <div className="border-b border-border/50 bg-muted/30 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-foreground">
            {parsed.title}
          </span>
        </div>
      )}
      <div className="p-4">
        {parsed.steps.map((step, i) => {
          const isLast = i === parsed.steps.length - 1;
          return (
            <div key={i} className="flex gap-3.5">
              {/* Number + connector line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border border-primary/25 text-[11px] font-bold text-primary">
                  {i + 1}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/40 my-1.5" />}
              </div>
              {/* Content */}
              <div className={cn("min-w-0 pb-5", isLast && "pb-0")}>
                <p className="text-[13px] font-semibold text-foreground leading-6">
                  {step.title}
                </p>
                {step.description && (
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground/70 wrap-break-word! whitespace-normal">
                    {step.description}
                  </p>
                )}
                {step.code && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-2 font-mono text-[12px] text-foreground/80">
                    <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    <code>{step.code}</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
