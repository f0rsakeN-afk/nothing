// ─── Types ──────────────────────────────────────────────────────────────────────

export type ChangeType = "feature" | "fix" | "improvement" | "breaking";

export interface ChangelogChange {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  changes: ChangelogChange[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangelogResponse {
  data: ChangelogEntry[];
  hasMore: boolean;
  count: number;
  nextCursor?: string;
  search?: string;
}

export interface ChangelogFilter {
  search?: string;
  includeUnpublished?: boolean;
  limit?: number;
  cursor?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────────

export async function getChangelogEntries(
  filter: ChangelogFilter = {},
): Promise<ChangelogResponse> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.includeUnpublished) params.set("includeUnpublished", "true");
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.cursor) params.set("cursor", filter.cursor);

  const res = await fetch(`/api/changelog?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch changelog");
  }
  return res.json();
}

export async function getChangelogEntry(id: string): Promise<{ entry: ChangelogEntry }> {
  const res = await fetch(`/api/changelog/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch changelog entry");
  }
  return res.json();
}

export async function createChangelogEntry(data: {
  version: string;
  date?: string;
  title: string;
  description: string;
  changes: ChangelogChange[];
  isPublished?: boolean;
}): Promise<{ entry: ChangelogEntry }> {
  const res = await fetch("/api/changelog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create changelog entry");
  }
  return res.json();
}

export async function updateChangelogEntry(
  id: string,
  data: Partial<{
    version: string;
    date: string;
    title: string;
    description: string;
    changes: ChangelogChange[];
    isPublished: boolean;
  }>,
): Promise<{ entry: ChangelogEntry }> {
  const res = await fetch(`/api/changelog/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update changelog entry");
  }
  return res.json();
}

export async function deleteChangelogEntry(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/changelog/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete changelog entry");
  }
  return res.json();
}