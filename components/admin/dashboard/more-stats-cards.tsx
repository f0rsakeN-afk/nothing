"use client";

import { Users, MessageSquare, FolderOpen, TrendingUp, AlertTriangle, FileText, Brain, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreStatsCardsProps {
  newSignupsThisWeek: number;
  openReports: number;
  openFeedback: number;
  activeIncidents: number;
  totalFiles: number;
  totalMemories: number;
  totalCredits: number;
}

interface MiniStatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
}

function MiniStatCard({ label, value, icon: Icon, color, description }: MiniStatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {description && (
          <p className="text-[10px] text-muted-foreground/70">{description}</p>
        )}
      </div>
    </div>
  );
}

export function MoreStatsCards({
  newSignupsThisWeek,
  openReports,
  openFeedback,
  activeIncidents,
  totalFiles,
  totalMemories,
  totalCredits,
}: MoreStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MiniStatCard
        label="New This Week"
        value={newSignupsThisWeek}
        icon={Users}
        color="bg-green-500/10 text-green-600"
        description="Signups last 7 days"
      />
      <MiniStatCard
        label="Open Reports"
        value={openReports}
        icon={AlertTriangle}
        color="bg-red-500/10 text-red-600"
        description="Requires attention"
      />
      <MiniStatCard
        label="Feedback"
        value={openFeedback}
        icon={MessageSquare}
        color="bg-blue-500/10 text-blue-600"
        description="User submissions"
      />
      <MiniStatCard
        label="Active Incidents"
        value={activeIncidents}
        icon={AlertTriangle}
        color={activeIncidents > 0 ? "bg-orange-500/10 text-orange-600" : "bg-green-500/10 text-green-600"}
        description={activeIncidents > 0 ? "Needs monitoring" : "All clear"}
      />
      <MiniStatCard
        label="Total Files"
        value={totalFiles}
        icon={FileText}
        color="bg-purple-500/10 text-purple-600"
      />
      <MiniStatCard
        label="Total Credits"
        value={totalCredits.toLocaleString()}
        icon={CreditCard}
        color="bg-amber-500/10 text-amber-600"
        description="Platform-wide"
      />
    </div>
  );
}
