"use client";

import { memo, useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  name: string;
  status: ServiceStatus;
  note?: string;
}

interface StatusData {
  title?: string;
  overall?: ServiceStatus;
  updated?: string;
  services: Service[];
}

const STATUS_CFG = {
  operational: {
    label: "Operational",
    Icon: CheckCircle2,
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    banner: "bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    label: "Degraded Performance",
    Icon: AlertTriangle,
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    banner: "bg-amber-500/5",
    text: "text-amber-600 dark:text-amber-400",
  },
  outage: {
    label: "Outage",
    Icon: XCircle,
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    banner: "bg-red-500/5",
    text: "text-red-600 dark:text-red-400",
  },
  maintenance: {
    label: "Maintenance",
    Icon: Clock,
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    banner: "bg-blue-500/5",
    text: "text-blue-600 dark:text-blue-400",
  },
} satisfies Record<ServiceStatus, object>;

export const StatusBoard = memo(function StatusBoard({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo((): StatusData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.services)) return null;
      return p as StatusData;
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed) return null;

  const overall = parsed.overall ?? "operational";
  const cfg = STATUS_CFG[overall];
  const { Icon } = cfg;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      {/* Overall banner */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-border/50",
          cfg.banner,
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-4 w-4 shrink-0", cfg.text)} />
          <span className="text-[13px] font-semibold text-foreground">
            {parsed.title ?? "System Status"}
          </span>
          <span
            className={cn(
              "text-[10.5px] font-semibold px-2 py-0.5 rounded-full border",
              cfg.badge,
            )}
          >
            {cfg.label}
          </span>
        </div>
        {parsed.updated && (
          <span className="text-[11px] text-muted-foreground/40">
            Updated {parsed.updated}
          </span>
        )}
      </div>

      {/* Service rows */}
      <div className="divide-y divide-border/30">
        {parsed.services.map((service, i) => {
          const s = STATUS_CFG[service.status ?? "operational"];
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    s.dot,
                  )}
                />
                <span className="text-[13px] text-foreground truncate">
                  {service.name}
                </span>
                {service.note && (
                  <span className="hidden sm:inline text-[11.5px] text-muted-foreground/45 truncate">
                    — {service.note}
                  </span>
                )}
              </div>
              <span className={cn("text-[11.5px] font-medium shrink-0", s.text)}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
