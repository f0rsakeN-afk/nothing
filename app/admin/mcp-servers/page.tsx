"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Server, Trash2, Shield, Zap, Globe } from "lucide-react";

interface McpServer {
  id: string;
  name: string;
  url: string;
  authType: string;
  transportType: string;
  isEnabled: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
  userId: string;
}

interface McpServersResponse {
  data: McpServer[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

interface McpServersFilters {
  search?: string;
  authType?: string;
  page?: number;
  limit?: number;
}

async function getMcpServers(filters: McpServersFilters = {}): Promise<McpServersResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.authType) params.set("authType", filters.authType);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const res = await fetch(`/api/admin/mcp-servers?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch MCP servers");
  return res.json();
}

async function deleteMcpServer(id: string) {
  const res = await fetch(`/api/admin/mcp-servers/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete MCP server");
  }
  return res.json();
}

async function toggleMcpServer(id: string, enabled: boolean) {
  const res = await fetch(`/api/admin/mcp-servers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isEnabled: enabled }),
  });
  if (!res.ok) throw new Error("Failed to update MCP server");
  return res.json();
}

const AUTH_TYPE_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  none: { icon: Globe, label: "None", color: "bg-muted text-muted-foreground" },
  apikey: { icon: Shield, label: "API Key", color: "bg-blue-500/10 text-blue-600" },
  oauth: { icon: Zap, label: "OAuth", color: "bg-green-500/10 text-green-600" },
  bearer: { icon: Shield, label: "Bearer", color: "bg-purple-500/10 text-purple-600" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function McpServersPage() {
  const [search, setSearch] = useState("");
  const [authTypeFilter, setAuthTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters = useMemo(() => ({
    search: search || undefined,
    authType: authTypeFilter || undefined,
    page,
    limit,
  }), [search, authTypeFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "mcp-servers", filters],
    queryFn: () => getMcpServers(filters),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this MCP server? This cannot be undone.")) return;
    try {
      await deleteMcpServer(id);
      toast.success("MCP server deleted");
      refetch();
    } catch {
      toast.error("Failed to delete MCP server");
    }
  }, [refetch]);

  const handleToggle = useCallback(async (id: string, current: boolean) => {
    try {
      await toggleMcpServer(id, !current);
      toast.success(!current ? "Server enabled" : "Server disabled");
      refetch();
    } catch {
      toast.error("Failed to update server");
    }
  }, [refetch]);

  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => data && p < data.pagination.totalPages ? p + 1 : p), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">MCP Servers</h1>
            <p className="text-sm text-muted-foreground">Manage user MCP integrations</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search servers..."
            className="pl-8"
          />
        </div>

        <Select value={authTypeFilter} onValueChange={(v) => { setAuthTypeFilter(v || ""); setPage(1); }}>
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue placeholder="All Auth Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Auth Types</SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="apikey">API Key</SelectItem>
            <SelectItem value="oauth">OAuth</SelectItem>
            <SelectItem value="bearer">Bearer</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} servers
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
              <p className="text-sm font-medium text-destructive">Failed to load MCP servers</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">URL</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Auth Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last Tested</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No MCP servers found
                    </td>
                  </tr>
                ) : (
                  data.data.map((server) => {
                    const authConfig = AUTH_TYPE_CONFIG[server.authType] || AUTH_TYPE_CONFIG.none;
                    return (
                      <tr key={server.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate max-w-[150px]">{server.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{server.url}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={authConfig.color}>
                            {authConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {server.lastError ? (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          ) : server.isEnabled ? (
                            <Badge variant="default" className="bg-green-500/10 text-green-600">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">Disabled</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {server.lastTestedAt ? formatDate(server.lastTestedAt) : "Never"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggle(server.id, server.isEnabled)}
                              title={server.isEnabled ? "Disable" : "Enable"}
                            >
                              {server.isEnabled ? (
                                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                              ) : (
                                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(server.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
    </div>
  );
}