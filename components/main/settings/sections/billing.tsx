"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Crown, Zap, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AccountData {
  plan: {
    name: string;
    displayName: string;
    credits: number;
    limits: {
      chats: string | number;
      projects: string | number;
      messages: string | number;
    };
    features: string[];
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    chats: number;
    projects: number;
    messages: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["25 messages / day", "Standard models", "Basic projects"],
  basic: ["50 messages / day", "Standard models", "5 MB file uploads"],
  pro: [
    "Unlimited messages",
    "Priority access to new models",
    "50 MB file uploads",
    "Context memory",
  ],
  enterprise: [
    "Unlimited everything",
    "Dedicated support",
    "Custom integrations",
    "Advanced security",
  ],
};

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-48" />
      </div>

      <div>
        <Skeleton className="h-3 w-24 mb-2" />
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
      </div>

      <div>
        <Skeleton className="h-3 w-28 mb-1" />
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3.5 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillingSection() {
  const router = useRouter();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  const plan = data?.plan;
  const subscription = data?.subscription;
  const usage = data?.usage;
  const monthlyUsage = data?.monthlyUsage;
  const currentPlanId = plan?.name?.toLowerCase() || "free";

  const messagesLimit = typeof plan?.limits?.messages === "number" ? plan.limits.messages : 0;
  const messagesUsed = monthlyUsage?.messages || 0;
  const messagesPct = messagesLimit > 0 ? Math.min((messagesUsed / messagesLimit) * 100, 100) : 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  if (isLoading || !data) {
    return <BillingSkeleton />;
  }

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
          Current Plan
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {currentPlanId === "pro" || currentPlanId === "enterprise" ? (
                <Crown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[13px] font-semibold text-foreground">
                {plan?.displayName || "Free"} Plan
              </span>
            </div>
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Current
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {plan?.credits?.toLocaleString() || 0} credits
          </p>
          <ul className="space-y-1.5 mb-3">
            {(PLAN_FEATURES[currentPlanId] || PLAN_FEATURES.free).map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[12px] text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>

          {subscription?.active && (
            <div className="mb-3 p-2 rounded-md bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium text-primary">
                  {subscription.status === "active" ? "Active Subscription" : "Subscription"}
                </span>
              </div>
              {subscription.periodEnd && (
                <p className="text-[11px] text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${formatDate(subscription.periodEnd)}`
                    : `Renews on ${formatDate(subscription.periodEnd)}`}
                </p>
              )}
            </div>
          )}

          {currentPlanId !== "pro" && currentPlanId !== "enterprise" && (
            <Button
              size="sm"
              className="w-full h-7 text-[12px]"
              onClick={handleUpgrade}
              disabled={isFetching}
            >
              {isFetching ? "Loading..." : "Upgrade Plan"}
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Usage this month
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3.5 space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-muted-foreground">Messages</span>
              <span className="text-[12px] font-medium text-foreground">
                {messagesUsed} / {messagesLimit === -1 ? "∞" : messagesLimit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${messagesPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-muted-foreground">Chats</span>
              <span className="text-[12px] font-medium text-foreground">
                {monthlyUsage?.chats || 0} / {plan?.limits?.chats === -1 ? "∞" : plan?.limits?.chats}
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-muted-foreground">Projects</span>
              <span className="text-[12px] font-medium text-foreground">
                {usage?.projects || 0} / {plan?.limits?.projects === -1 ? "∞" : plan?.limits?.projects}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
