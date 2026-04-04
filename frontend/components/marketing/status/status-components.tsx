"use client";

import React, { memo } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Uptime Bar ──────────────────────────────────────────

const UPTIME_DAYS = 40;

export const UptimeBar = memo(function UptimeBar() {
  return (
    <div className="flex gap-[2px] w-full h-8 items-end">
      {Array.from({ length: UPTIME_DAYS }).map((_, i) => {
        const isDegraded = i === 12 || i === 31;
        const isDown = i === 25;

        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-all duration-300",
              isDown
                ? "h-4 bg-destructive/60"
                : isDegraded
                  ? "h-6 bg-amber-500/60"
                  : "h-8 bg-green-500/60",
              "hover:opacity-80 cursor-help",
            )}
            title={`Day ${UPTIME_DAYS - i} ago: ${isDown ? "Major Outage" : isDegraded ? "Partial Outage" : "Operational"}`}
          />
        );
      })}
    </div>
  );
});

// ─── Service Card ────────────────────────────────────────

interface ServiceCardProps {
  name: string;
  description: string;
  status: string;
  uptime: string;
  icon: React.ReactNode;
}

export const ServiceCard = memo(function ServiceCard({
  name,
  description,
  status,
  uptime,
  icon,
}: ServiceCardProps) {
  return (
    <div className="group p-5 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-border/80 transition-all duration-300 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground   duration-300">
              {icon}
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {name}
              </h3>
              <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest">
              {status}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/80">
              {uptime} uptime
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <UptimeBar />
          <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 font-medium px-0.5 tracking-tight font-mono">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Incident Item ──────────────────────────────────────

interface IncidentItemProps {
  date: string;
  title: string;
  description: string;
  status: string;
  isLast?: boolean;
}

export const IncidentItem = memo(function IncidentItem({
  date,
  title,
  description,
  status,
  isLast,
}: IncidentItemProps) {
  return (
    <div className="flex gap-6 items-start relative pb-6 group">
      {!isLast && (
        <div className="absolute left-1.5 top-8 bottom-0 w-px bg-border/40 group-hover:bg-border   duration-300" />
      )}
      <div className="h-3 w-3 rounded-full bg-muted border border-border mt-1.5 relative z-10 shrink-0 group-hover:border-foreground/20  " />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="w-3 h-3" />
          {date}
        </div>
        <div className="flex flex-col gap-1.5">
          <h4 className="text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            {description}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/5 border border-green-500/10 text-[10px] font-bold text-green-600 dark:text-green-500 tracking-wider uppercase w-fit mt-1">
          <CheckCircle2 className="w-3 h-3" />
          {status === "resolved" ? "Resolved" : "Active"}
        </div>
      </div>
    </div>
  );
});
