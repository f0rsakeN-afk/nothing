/**
 * Audit Logging - Async, non-blocking audit trail for admin operations
 */

import prisma from "@/lib/prisma";
import type { NextRequest } from "next/server";
import type { Prisma } from "@/src/generated/prisma/client";

export type AuditAction =
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "ADMIN_VIEW_DASHBOARD"
  | "ADMIN_VIEW_USERS"
  | "ADMIN_USER_ROLE_UPDATE"
  | "ADMIN_USER_STATUS_UPDATE"
  | "ADMIN_USER_DEACTIVATE"
  | "ADMIN_USER_REACTIVATE"
  | "ADMIN_USER_LIST"
  | "ADMIN_USER_VIEW"
  | "ADMIN_CHANGELOG_LIST"
  | "ADMIN_CHANGELOG_CREATE"
  | "ADMIN_CHANGELOG_UPDATE"
  | "ADMIN_CHANGELOG_DELETE"
  | "ADMIN_CHATS_LIST"
  | "ADMIN_CHAT_UPDATE"
  | "ADMIN_CHAT_DELETE"
  | "ADMIN_PROJECTS_LIST"
  | "ADMIN_PROJECT_UPDATE"
  | "ADMIN_PROJECT_DELETE"
  | "ADMIN_FILES_LIST"
  | "ADMIN_FILE_DELETE"
  | "ADMIN_MEMORIES_LIST"
  | "ADMIN_MEMORY_DELETE"
  | "ADMIN_MCP_SERVERS_LIST"
  | "ADMIN_MCP_SERVER_UPDATE"
  | "ADMIN_MCP_SERVER_DELETE"
  | "ADMIN_REPORTS_LIST"
  | "ADMIN_REPORT_STATUS_UPDATE"
  | "ADMIN_REPORT_DELETE"
  | "ADMIN_FEEDBACK_LIST"
  | "ADMIN_FEEDBACK_DELETE"
  | "ADMIN_CONTACTS_LIST"
  | "ADMIN_CONTACT_DELETE"
  | "ADMIN_AUDIT_LIST"
  | "ADMIN_NOTIFICATIONS_LIST"
  | "ADMIN_NOTIFICATION_BROADCAST"
  | "ADMIN_NOTIFICATION_UPDATE"
  | "ADMIN_NOTIFICATION_DELETE"
  | "ADMIN_SETTINGS_CHANGE"
  | "ADMIN_PLAN_LIST"
  | "ADMIN_PLAN_UPDATE"
  | "ADMIN_PUSH_LIST"
  | "ADMIN_PUSH_DELETE"
  | "ADMIN_INVITATIONS_LIST"
  | "ADMIN_INVITATION_DELETE"
  | "ADMIN_INCIDENTS_LIST"
  | "ADMIN_INCIDENT_CREATE"
  | "ADMIN_INCIDENT_UPDATE"
  | "ADMIN_INCIDENT_DELETE";

interface AuditLogParams {
  action: AuditAction;
  userId: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
  status?: "success" | "failure";
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const { action, userId, targetUserId, metadata, request, status = "success" } = params;

  const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]
    ?? request?.headers.get("x-real-ip")
    ?? null;

  const userAgent = request?.headers.get("user-agent") ?? null;

  // Fire and forget - don't block the request
  prisma.auditLog
    .create({
      data: {
        action,
        userId,
        ...(targetUserId && { targetUserId }),
        ...(ipAddress && { ipAddress }),
        ...(userAgent && { userAgent }),
        ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
        status,
      },
    })
    .catch((err) => {
      console.error(`[AuditLog] Failed to write ${action} for user ${userId}:`, err);
    });
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  limit?: number;
  cursor?: string;
}) {
  const { userId, action, limit = 50, cursor } = params;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });
}