"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sileo-toast";

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
    files: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

const FEATURE_LABELS: Record<string, string> = {
  "basic-chat": "Basic chat",
  "basic-projects": "Basic projects",
  "short-memory": "Short-term memory",
  "longer-memory": "Longer conversation memory",
  attachments: "File attachments",
  "advanced-customization": "Advanced customization",
  "chat-folders": "Chat folders",
  "chat-branches": "Chat branches",
  "export-chats": "Export chats",
  "team-collaboration": "Team collaboration",
  "api-access": "API access",
  "priority-support": "Priority support",
  "dedicated-support": "Dedicated support",
};

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

interface PlanSectionProps {
  accountData?: AccountData;
}

function PlanSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

export const PlanSection = React.memo(function PlanSection({
  accountData,
}: PlanSectionProps) {
  const router = useRouter();
  const { data: localData, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    enabled: !accountData,
    staleTime: 30000,
  });

  const data = accountData || localData;
  const isFetching = !accountData && isLoading;

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create checkout");
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.url) {
        window.location.href = result.url;
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("Unauthorized")) {
        toast.error("Please sign in to upgrade");
        router.push("/login");
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleUpgrade = () => {
    const currentPlan = data?.plan?.name?.toLowerCase();
    let targetPlan = "basic";
    if (currentPlan === "basic") {
      targetPlan = "pro";
    } else if (currentPlan === "pro" || currentPlan === "enterprise") {
      router.push("/pricing");
      return;
    }
    checkoutMutation.mutate(targetPlan);
  };

  if (isFetching || !data) {
    return <PlanSkeleton />;
  }

  const plan = data?.plan;
  const usage = data?.usage;

  const creditsUsed = usage?.messages || 0;
  const creditsLimit = typeof plan?.limits?.messages === "number" ? plan.limits.messages : 2500;
  const creditsPct = Math.min((creditsUsed / creditsLimit) * 100, 100);

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
              {plan?.name.toUpperCase() || "FREE"}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-foreground leading-none">
            {plan?.displayName || "Free Plan"} Plan
          </p>
          <p className="text-[12px] text-muted-foreground">
            {plan?.credits?.toLocaleString() || 0} credits remaining
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-[12px] shrink-0"
          onClick={handleUpgrade}
          disabled={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Redirecting...
            </>
          ) : (
            "Upgrade"
          )}
        </Button>
      </div>

      {/* Credits usage */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Credits used
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${creditsPct > 80 ? "bg-red-500" : creditsPct > 50 ? "bg-amber-400" : "bg-primary"}`}
              style={{ width: `${creditsPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-foreground">
              {(creditsLimit - creditsUsed).toLocaleString()} / {creditsLimit.toLocaleString()} remaining
            </span>
            <span className="text-[11px] text-muted-foreground">
              {creditsUsed.toLocaleString()} used
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
          {[
            { label: "Chats", used: usage?.chats || 0, limit: plan?.limits?.chats },
            { label: "Projects", used: usage?.projects || 0, limit: plan?.limits?.projects },
            { label: "Messages", used: usage?.messages || 0, limit: plan?.limits?.messages },
          ].map(({ label, used, limit }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[13px] text-foreground truncate">{label}</span>
                <div className="flex-1 h-1 rounded-full bg-border overflow-hidden min-w-0 max-w-24">
                  <div
                    className="h-full rounded-full bg-primary/50"
                    style={{
                      width: typeof limit === "number" ? `${Math.min((used / limit) * 100, 100)}%` : "100%",
                    }}
                  />
                </div>
              </div>
              <span className="text-[12px] text-muted-foreground shrink-0">
                {typeof limit === "number" ? `${used} / ${limit}` : used.toLocaleString()}
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
          {(plan?.features || []).map((f) => (
            <div
              key={f}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <Check className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[12px] text-foreground">{FEATURE_LABELS[f] || f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
