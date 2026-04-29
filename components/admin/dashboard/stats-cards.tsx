"use client";

import { Users, MessageSquare, FolderOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: "up" | "down" | "neutral";
}

function StatCard({ label, value, icon: Icon, change, changeType = "neutral" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-semibold text-foreground">{value}</span>
        {change && (
          <span
            className={cn(
              "text-xs font-medium",
              changeType === "up" && "text-green-600 dark:text-green-400",
              changeType === "down" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground",
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatsCardsProps {
  totalUsers: number;
  activeUsersToday: number;
  totalChats: number;
  totalProjects: number;
}

export function StatsCards({ totalUsers, activeUsersToday, totalChats, totalProjects }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Users"
        value={totalUsers.toLocaleString()}
        icon={Users}
        change="Active today"
        changeType="neutral"
      />
      <StatCard
        label="Active Today"
        value={activeUsersToday.toLocaleString()}
        icon={TrendingUp}
        change="Today only"
        changeType="neutral"
      />
      <StatCard
        label="Total Chats"
        value={totalChats.toLocaleString()}
        icon={MessageSquare}
      />
      <StatCard
        label="Total Projects"
        value={totalProjects.toLocaleString()}
        icon={FolderOpen}
      />
    </div>
  );
}