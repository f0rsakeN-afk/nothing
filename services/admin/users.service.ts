/**
 * Admin Users Service
 * API calls for admin user management
 */

export interface AdminUser {
  id: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  planTier: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  credits: number;
  _count: {
    chats: number;
    projects: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UsersResponse {
  data: AdminUser[];
  pagination: Pagination;
}

export interface UsersFilter {
  search?: string;
  role?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export async function getUsers(filters: UsersFilter = {}): Promise<UsersResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.isActive) params.set("isActive", filters.isActive);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  const res = await fetch(`/api/admin/users?${params.toString()}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Failed to fetch users" } }));
    throw new Error(error.error?.message ?? "Failed to fetch users");
  }

  return res.json();
}

export async function getUser(userId: string): Promise<{ user: AdminUser }> {
  const res = await fetch(`/api/admin/users/${userId}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Failed to fetch user" } }));
    throw new Error(error.error?.message ?? "Failed to fetch user");
  }

  return res.json();
}

export async function updateUserRole(
  userId: string,
  role: "USER" | "MODERATOR" | "ADMIN",
): Promise<{ user: AdminUser }> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Failed to update user role" } }));
    throw new Error(error.error?.message ?? "Failed to update user role");
  }

  return res.json();
}

export async function deactivateUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/deactivate`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Failed to deactivate user" } }));
    throw new Error(error.error?.message ?? "Failed to deactivate user");
  }
}

export async function reactivateUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/reactivate`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Failed to reactivate user" } }));
    throw new Error(error.error?.message ?? "Failed to reactivate user");
  }
}