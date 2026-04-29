"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ChevronLeft, ChevronRight, Folder, Archive, Trash2, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: Date | null;
  pinnedAt: Date | null;
  userId: string;
  user?: { email: string };
  _count?: { chats: number };
}

interface ProjectsResponse {
  data: Project[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

interface ProjectsFilters {
  search?: string;
  page?: number;
  limit?: number;
}

async function getProjects(filters: ProjectsFilters = {}): Promise<ProjectsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const res = await fetch(`/api/admin/projects?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

async function deleteProject(id: string) {
  const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete project");
  }
  return res.json();
}

async function bulkDeleteProjects(ids: string[]) {
  const res = await fetch("/api/admin/projects/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete projects");
  }
  return res.json();
}

async function archiveProject(id: string) {
  const res = await fetch(`/api/admin/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) throw new Error("Failed to archive project");
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectsAdminPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const limit = 20;

  const queryClient = useQueryClient();

  const filters = useMemo(() => ({
    search: search || undefined,
    page,
    limit,
  }), [search, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "projects", filters],
    queryFn: () => getProjects(filters),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    },
    onError: (err: Error) => toast.error("Failed to delete", { description: err.message }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProjects,
    onSuccess: (result) => {
      toast.success(`${result.deletedCount} projects deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (err: Error) => toast.error("Failed to bulk delete", { description: err.message }),
  });

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveProject(id);
      toast.success("Project archived");
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    } catch {
      toast.error("Failed to archive project");
    }
  }, [queryClient]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (!data?.data) return;
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.data.map((p) => p.id)));
    }
  }, [data, selectedIds.size]);

  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => data && p < data.pagination.totalPages ? p + 1 : p), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Folder className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">Manage all platform projects</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects..."
            className="pl-8"
          />
        </div>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} projects
        </span>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load projects</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-10">
                    <Checkbox
                      checked={data?.data?.length ? selectedIds.size === data.data.length : false}
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Chats</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  data.data.map((project) => (
                    <tr key={project.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={() => handleToggleSelect(project.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate max-w-[200px]">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{project.user?.email || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{project._count?.chats ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        {project.archivedAt ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">Archived</Badge>
                        ) : project.pinnedAt ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pinned</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{formatDate(project.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!project.archivedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleArchive(project.id)}
                              title="Archive project"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(project.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!data.pagination.hasMore}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Projects</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected projects and all linked chats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
