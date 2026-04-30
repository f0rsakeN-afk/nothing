/**
 * GET /api/admin/stats
 * Protected - requires admin/moderator role
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const ADMIN_STATS_CACHE_KEY = "admin:stats";
const ADMIN_STATS_CACHE_TTL = 60; // 60 seconds

interface SystemHealth {
  redis: "connected" | "disconnected";
  db: "connected" | "disconnected";
  apiLatencyMs: number | null;
}

interface DashboardStats {
  totalUsers: number;
  activeUsersToday: number;
  totalChats: number;
  totalProjects: number;
  newSignupsThisWeek: number;
  openReports: number;
  openFeedback: number;
  activeIncidents: number;
  totalFiles: number;
  totalMemories: number;
  chartData: { date: string; users: number; chats: number }[];
  recentActivity: {
    id: string;
    action: string;
    userEmail: string;
    createdAt: string;
  }[];
  topUsers: {
    id: string;
    email: string;
    planTier: string;
    chatCount: number;
    projectCount: number;
  }[];
  planDistribution: {
    planTier: string;
    count: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    // Log dashboard view
    logAuditEvent({
      action: "ADMIN_VIEW_DASHBOARD",
      userId: user.id,
      request,
    });

    // Check cache first (30s TTL)
    try {
      const cached = await redis.get(ADMIN_STATS_CACHE_KEY);
      if (cached) {
        return NextResponse.json(JSON.parse(cached), { status: 200 });
      }
    } catch {
      // Redis unavailable, continue
    }

    const startTime = Date.now();

    // Fetch stats in parallel
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      totalUsers,
      activeUsersToday,
      totalChats,
      totalProjects,
      newSignupsThisWeek,
      openReports,
      openFeedback,
      activeIncidents,
      totalFiles,
      totalMemories,
      recentUsers,
      recentChats,
      recentLogs,
      topUsers,
      planDistribution,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          isActive: true,
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.chat.count(),
      prisma.project.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.report.count({ where: { status: { in: ["pending", "in_progress"] } } }),
      prisma.feedback.count(),
      prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
      prisma.file.count(),
      prisma.memory.count(),
      // Get users created in last 30 days for chart
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Get chats created in last 30 days for chart
      prisma.chat.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Recent audit logs for activity feed
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      // Top users by chat count
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          planTier: true,
          _count: { select: { chats: true, projects: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      // Plan distribution
      prisma.user.groupBy({
        by: ["planTier"],
        _count: true,
      }),
    ]);

    // Check system health
    const health: SystemHealth = {
      redis: "connected",
      db: "connected",
      apiLatencyMs: Date.now() - startTime,
    };

    try {
      await redis.ping();
    } catch {
      health.redis = "disconnected";
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      health.db = "disconnected";
      health.apiLatencyMs = null;
    }

    // Process chart data - group users and chats by date
    const chartMap = new Map<string, { users: number; chats: number }>();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split("T")[0];
      chartMap.set(key, { users: 0, chats: 0 });
    }
    for (const user of recentUsers) {
      const key = user.createdAt.toISOString().split("T")[0];
      if (chartMap.has(key)) {
        const entry = chartMap.get(key)!;
        entry.users++;
      }
    }
    for (const chat of recentChats) {
      const key = chat.createdAt.toISOString().split("T")[0];
      if (chartMap.has(key)) {
        const entry = chartMap.get(key)!;
        entry.chats++;
      }
    }
    const chartData = Array.from(chartMap.entries()).map(([date, data]) => ({
      date,
      users: data.users,
      chats: data.chats,
    }));

    const stats: DashboardStats = {
      totalUsers,
      activeUsersToday,
      totalChats,
      totalProjects,
      newSignupsThisWeek,
      openReports,
      openFeedback,
      activeIncidents,
      totalFiles,
      totalMemories,
      chartData,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        userEmail: log.userId || "System",
        createdAt: log.createdAt.toISOString(),
      })),
      topUsers: topUsers.map((u) => ({
        id: u.id,
        email: u.email,
        planTier: u.planTier,
        chatCount: u._count.chats,
        projectCount: u._count.projects,
      })),
      planDistribution: planDistribution.map((p) => ({
        planTier: p.planTier,
        count: p._count,
      })),
    };

    const response = {
      stats,
      system: health,
      cachedAt: new Date().toISOString(),
    };

    // Cache the response
    try {
      await redis.setex(ADMIN_STATS_CACHE_KEY, ADMIN_STATS_CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch dashboard stats" } },
      { status: 500 },
    );
  }
}