import { StatsCards } from "@/components/admin/dashboard/stats-cards";
import { SystemHealth } from "@/components/admin/dashboard/system-health";
import { DashboardCharts } from "@/components/admin/dashboard/dashboard-charts";
import { MoreStatsCards } from "@/components/admin/dashboard/more-stats-cards";
import { DashboardWidgets } from "@/components/admin/dashboard/dashboard-widgets";

export const metadata = {
  title: "Admin Dashboard",
  description: "Overview of platform metrics, system health, and admin statistics",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function getAdminStats() {
  try {
    const res = await fetch(`${SITE_URL}/api/admin/stats`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const data = await getAdminStats();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again</p>
      </div>
    );
  }

  const { stats, system, cachedAt } = data;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your platform metrics and system status
        </p>
      </div>

      {/* Primary stats */}
      <StatsCards
        totalUsers={stats.totalUsers}
        activeUsersToday={stats.activeUsersToday}
        totalChats={stats.totalChats}
        totalProjects={stats.totalProjects}
      />

      {/* Charts */}
      <DashboardCharts chartData={stats.chartData} />

      {/* Widgets */}
      <DashboardWidgets
        recentActivity={stats.recentActivity}
        topUsers={stats.topUsers}
        planDistribution={stats.planDistribution}
      />

      {/* More stats */}
      <MoreStatsCards
        newSignupsThisWeek={stats.newSignupsThisWeek}
        openReports={stats.openReports}
        openFeedback={stats.openFeedback}
        activeIncidents={stats.activeIncidents}
        totalFiles={stats.totalFiles}
        totalMemories={stats.totalMemories}
        totalCredits={stats.totalCredits}
      />

      {/* System health */}
      <SystemHealth
        redis={system.redis}
        db={system.db}
        apiLatencyMs={system.apiLatencyMs}
        cachedAt={cachedAt}
      />

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="/admin/users"
          className="flex flex-col gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Manage Users
          </span>
          <span className="text-xs text-muted-foreground">
            View, edit roles, and manage user accounts
          </span>
        </a>
        <a
          href="/admin/changelog"
          className="flex flex-col gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Changelog
          </span>
          <span className="text-xs text-muted-foreground">
            Create and manage release notes
          </span>
        </a>
        <a
          href="/admin/audit"
          className="flex flex-col gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            Audit Log
          </span>
          <span className="text-xs text-muted-foreground">
            View admin activity history
          </span>
        </a>
      </div>
    </div>
  );
}