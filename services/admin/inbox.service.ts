// ─── Types ──────────────────────────────────────────────────────────────────────

export type ReportStatus = "pending" | "in_progress" | "resolved" | "dismissed";
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface Report {
  id: string;
  reason: string;
  description: string;
  email: string;
  image: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    email: string;
  };
}

export interface Feedback {
  id: string;
  rating: number;
  comment: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    email: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
}

export interface ReportsFilter {
  search?: string;
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export interface FeedbackFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ContactFilter {
  search?: string;
  topic?: string;
  page?: number;
  limit?: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────────

export async function getReports(filter: ReportsFilter = {}): Promise<{
  data: Report[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.status) params.set("status", filter.status);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await fetch(`/api/admin/reports?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch reports");
  }
  return res.json();
}

export async function getReport(id: string): Promise<{ report: Report }> {
  const res = await fetch(`/api/admin/reports/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch report");
  }
  return res.json();
}

export async function updateReportStatus(
  id: string,
  data: { status: ReportStatus },
): Promise<{ report: Report }> {
  const res = await fetch(`/api/admin/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update report");
  }
  return res.json();
}

export async function getFeedback(filter: FeedbackFilter = {}): Promise<{
  data: Feedback[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await fetch(`/api/admin/feedback?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch feedback");
  }
  return res.json();
}

export async function deleteReport(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete report");
  }
  return res.json();
}

export async function deleteFeedback(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete feedback");
  }
  return res.json();
}

export async function getContacts(filter: ContactFilter = {}): Promise<{
  data: Contact[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.topic) params.set("topic", filter.topic);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const res = await fetch(`/api/admin/contacts?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch contacts");
  }
  return res.json();
}

export async function deleteContact(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete contact");
  }
  return res.json();
}