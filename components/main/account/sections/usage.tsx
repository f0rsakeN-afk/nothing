"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AccountData {
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
    memories: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
  limits: {
    chats: number;
    projects: number;
    messages: number;
  };
  resetDate?: string;
}

interface UsageSectionProps {
  accountData?: AccountData;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SimpleProgress({ value, color, isWarning }: { value: number; color: string; isWarning: boolean }) {
  return (
    <div className={cn("h-1 rounded-full bg-muted overflow-hidden", isWarning && "bg-amber-500/20")}>
      <div
        className={cn("h-full rounded-full transition-all", color, isWarning && "bg-amber-500")}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function UsageCard({ label, value, limit, color, subLabel }: {
  label: string;
  value: number;
  limit: number;
  color: string;
  subLabel: string;
}) {
  const percentage = limit > 0 ? Math.min(100, (value / limit) * 100) : 0;
  const isUnlimited = limit === -1;
  const isWarning = percentage >= 80;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {isWarning && !isUnlimited && (
          <span className="text-[10px] text-amber-500 font-medium">Warning</span>
        )}
      </div>
      <p className="text-[22px] font-bold text-foreground leading-none">
        {isUnlimited ? "∞" : formatNumber(value)}
        {!isUnlimited && limit > 0 && (
          <span className="text-[14px] font-normal text-muted-foreground">/{formatNumber(limit)}</span>
        )}
      </p>
      {!isUnlimited && limit > 0 && (
        <SimpleProgress value={percentage} color={color} isWarning={isWarning} />
      )}
      <p className="text-[11px] text-muted-foreground/70">{subLabel}</p>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-4 w-20 mb-1 bg-muted animate-pulse rounded" />
        <div className="h-3 w-52 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export const UsageSection = React.memo(function UsageSection({
  accountData,
}: UsageSectionProps) {
  const t = useTranslations("account");

  if (!accountData) {
    return <UsageSkeleton />;
  }

  const stats = [
    {
      label: t("messages"),
      value: accountData.monthlyUsage?.messages || 0,
      limit: accountData.limits?.messages || 0,
      color: "bg-blue-500",
      subLabel: accountData.resetDate ? `Resets ${formatDate(accountData.resetDate)}` : t("thisMonth"),
    },
    {
      label: t("chats"),
      value: accountData.usage?.chats || 0,
      limit: accountData.limits?.chats || 0,
      color: "bg-purple-500",
      subLabel: t("allTime"),
    },
    {
      label: t("projects"),
      value: accountData.usage?.projects || 0,
      limit: accountData.limits?.projects || 0,
      color: "bg-amber-400",
      subLabel: t("allTime"),
    },
    {
      label: t("memories"),
      value: accountData.usage?.memories || 0,
      limit: -1, // Memories don't have a hard limit display
      color: "bg-green-500",
      subLabel: t("allTime"),
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          {t("usageTitle")}
        </h3>
        <p className="text-[12px] text-muted-foreground">
          {t("usageSubtitle")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, limit, color, subLabel }) => (
          <UsageCard
            key={label}
            label={label}
            value={value}
            limit={limit}
            color={color}
            subLabel={subLabel}
          />
        ))}
      </div>

      {/* Monthly activity breakdown */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {t("activityBreakdown")}
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {[
            { color: "bg-blue-500", label: t("messagesThisMonth"), count: (accountData?.monthlyUsage?.messages || 0).toLocaleString() },
            { color: "bg-purple-500", label: t("chatsThisMonth"), count: (accountData?.monthlyUsage?.chats || 0).toLocaleString() },
            { color: "bg-amber-400", label: t("projects"), count: (accountData?.usage?.projects || 0).toLocaleString() },
            { color: "bg-green-500", label: t("memories"), count: (accountData?.usage?.memories || 0).toLocaleString() },
          ].map(({ color, label, count }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
                <span className="text-[13px] text-foreground">{label}</span>
              </div>
              <span className="text-[12px] font-medium text-muted-foreground">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});