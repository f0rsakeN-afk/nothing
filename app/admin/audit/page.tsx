"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "@/services/admin/audit.service";
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
import { Search, ChevronLeft, ChevronRight, ScrollText, Filter, X, Download } from "lucide-react";

const AUDIT_ACTIONS = [
  { value: "ADMIN_LOGIN", label: "Login" },
  { value: "ADMIN_LOGOUT", label: "Logout" },
  { value: "ADMIN_VIEW_DASHBOARD", label: "Dashboard View" },
  { value: "ADMIN_VIEW_USERS", label: "Users View" },
  { value: "ADMIN_USER_ROLE_UPDATE", label: "Role Update" },
  { value: "ADMIN_USER_STATUS_UPDATE", label: "Status Update" },
  { value: "ADMIN_CHANGELOG_LIST", label: "Changelog List" },
  { value: "ADMIN_CHANGELOG_CREATE", label: "Changelog Create" },
  { value: "ADMIN_CHANGELOG_UPDATE", label: "Changelog Update" },
  { value: "ADMIN_CHANGELOG_DELETE", label: "Changelog Delete" },
  { value: "ADMIN_REPORTS_LIST", label: "Reports List" },
  { value: "ADMIN_REPORT_STATUS_UPDATE", label: "Report Status Update" },
  { value: "ADMIN_REPORT_DELETE", label: "Report Delete" },
  { value: "ADMIN_FEEDBACK_LIST", label: "Feedback List" },
  { value: "ADMIN_FEEDBACK_DELETE", label: "Feedback Delete" },
  { value: "ADMIN_CONTACTS_LIST", label: "Contacts List" },
  { value: "ADMIN_CONTACT_DELETE", label: "Contact Delete" },
  { value: "ADMIN_AUDIT_LIST", label: "Audit List" },
];

const ACTION_STYLES: Record<string, string> = {
  LOGIN: "bg-green-500/10 text-green-600",
  UPDATE: "bg-blue-500/10 text-blue-600",
  DELETE: "bg-red-500/10 text-red-600",
  LIST: "bg-purple-500/10 text-purple-600",
  VIEW: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionStyle(action: string) {
  if (action.includes("DELETE")) return ACTION_STYLES.DELETE;
  if (action.includes("UPDATE") || action.includes("CREATE")) return ACTION_STYLES.UPDATE;
  if (action.includes("LIST") || action.includes("VIEW")) return ACTION_STYLES.LIST;
  if (action.includes("LOGIN")) return ACTION_STYLES.LOGIN;
  return ACTION_STYLES.VIEW;
}

function getActionLabel(action: string) {
  return action.replace("ADMIN_", "").replace(/_/g, " ").toLowerCase();
}

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const filters = useMemo(() => ({
    action: actionFilter || undefined,
    page,
    limit,
  }), [actionFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: () => getAuditLogs(filters),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handlePrevPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(p => data && p < data.pagination.totalPages ? p + 1 : p);
  }, [data]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setActionFilter("");
    setPage(1);
  }, []);

  const hasActiveFilters = search || actionFilter;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Audit Log</h1>
            <p className="text-sm text-muted-foreground">Track all admin actions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            const params = new URLSearchParams();
            if (actionFilter) params.set("action", actionFilter);
            window.location.href = `/api/admin/audit/export?${params.toString()}`;
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search logs..."
            className="pl-8"
          />
        </div>

        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v || ""); setPage(1); }}>
          <SelectTrigger className="h-10 w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            {AUDIT_ACTIONS.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} entries
        </span>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading audit logs...</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load audit logs</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Timestamp</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">IP Address</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Details</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  data.data.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getActionStyle(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{log.userId.slice(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{log.ipAddress || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {JSON.stringify(log.metadata).slice(0, 50)}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>
                          {log.status}
                        </Badge>
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
    </div>
  );
}