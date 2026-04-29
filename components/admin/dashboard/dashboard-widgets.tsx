"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, User, MessageSquare, FileText, Settings, ScrollText, Bell, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  action: string;
  userEmail: string;
  createdAt: string;
}

interface TopUser {
  id: string;
  email: string;
  planTier: string;
  chatCount: number;
  projectCount: number;
}

interface PlanDist {
  planTier: string;
  count: number;
}

interface DashboardWidgetsProps {
  recentActivity: ActivityItem[];
  topUsers: TopUser[];
  planDistribution: PlanDist[];
}

function formatTimeAgo(iso: string) {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getActionIcon(action: string) {
  if (action.includes("LOGIN")) return Shield;
  if (action.includes("USER")) return User;
  if (action.includes("CHAT")) return MessageSquare;
  if (action.includes("FILE")) return FileText;
  if (action.includes("REPORT") || action.includes("FEEDBACK")) return Bell;
  if (action.includes("SETTINGS")) return Settings;
  return ScrollText;
}

function getActionLabel(action: string) {
  return action.replace("ADMIN_", "").replace(/_/g, " ").toLowerCase();
}

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-muted text-muted-foreground",
  BASIC: "bg-green-500/10 text-green-600",
  PRO: "bg-primary/10 text-primary",
  ENTERPRISE: "bg-purple-500/10 text-purple-600",
};

const PLAN_ORDER = ["ENTERPRISE", "PRO", "BASIC", "FREE"];

export function DashboardWidgets({ recentActivity, topUsers, planDistribution }: DashboardWidgetsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
          <Link href="/admin/audit" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            recentActivity.map((item) => {
              const Icon = getActionIcon(item.action);
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {getActionLabel(item.action)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.userEmail}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatTimeAgo(item.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-foreground">Top Users</h3>
          <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {topUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No users yet</p>
          ) : (
            topUsers.map((user, idx) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {user.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.chatCount} chats · {user.projectCount} projects
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", PLAN_STYLES[user.planTier] || PLAN_STYLES.FREE)}>
                  {user.planTier}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-medium text-foreground">Plan Distribution</h3>
          <Link href="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {planDistribution.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No data</p>
          ) : (
            PLAN_ORDER.filter(plan => planDistribution.some(p => p.planTier === plan)).length > 0 ? (
              PLAN_ORDER.map((plan) => {
                const entry = planDistribution.find(p => p.planTier === plan);
                if (!entry) return null;
                const total = planDistribution.reduce((sum, p) => sum + p.count, 0);
                const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
                return (
                  <div key={plan} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", PLAN_STYLES[plan]?.replace("text-", "bg-").replace("/10", "") || "bg-muted")} />
                        <span className="text-xs font-medium text-foreground">{plan}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{entry.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", PLAN_STYLES[plan]?.replace("text-", "bg-").replace("/10", "") || "bg-muted")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              planDistribution.map((entry) => {
                const total = planDistribution.reduce((sum, p) => sum + p.count, 0);
                const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
                return (
                  <div key={entry.planTier} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{entry.planTier}</span>
                      <span className="text-xs text-muted-foreground">{entry.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
