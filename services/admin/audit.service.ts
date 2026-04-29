import { z } from "zod";

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AuditFilters {
  search?: string;
  action?: string;
  userId?: string;
  status?: "success" | "failure";
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.action) params.set("action", filters.action);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  const res = await fetch(`/api/admin/audit?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch audit logs");
  }
  return res.json();
}