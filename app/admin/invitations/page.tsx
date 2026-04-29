"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Mail, Trash2, Clock, CheckCircle, XCircle, UserPlus } from "lucide-react";

interface Invitation {
  id: string;
  email: string | null;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  chat: { id: string; title: string };
}

interface InvitationsResponse {
  data: Invitation[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

async function getInvitations(status?: string, page: number = 1, limit: number = 20): Promise<InvitationsResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  const res = await fetch(`/api/admin/invitations?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch invitations");
  return res.json();
}

async function deleteInvitation(id: string) {
  const res = await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete invitation");
  }
  return res.json();
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "bg-yellow-500/10 text-yellow-600" },
  accepted: { icon: CheckCircle, label: "Accepted", color: "bg-green-500/10 text-green-600" },
  declined: { icon: XCircle, label: "Declined", color: "bg-red-500/10 text-red-600" },
  expired: { icon: XCircle, label: "Expired", color: "bg-muted text-muted-foreground" },
};

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-purple-500/10 text-purple-600",
  EDITOR: "bg-blue-500/10 text-blue-600",
  VIEWER: "bg-muted text-muted-foreground",
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

function formatExpiry(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export default function InvitationsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "invitations", statusFilter, page],
    queryFn: () => getInvitations(statusFilter || undefined, page, limit),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this invitation?")) return;
    try {
      await deleteInvitation(id);
      toast.success("Invitation deleted");
      refetch();
    } catch {
      toast.error("Failed to delete invitation");
    }
  }, [refetch]);

  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => data && p < data.pagination.totalPages ? p + 1 : p), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Invitations</h1>
            <p className="text-sm text-muted-foreground">Manage chat collaboration invitations</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || ""); setPage(1); }}>
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} invitations
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
              <p className="text-sm font-medium text-destructive">Failed to load invitations</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Chat</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expires</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      No invitations found
                    </td>
                  </tr>
                ) : (
                  data.data.map((inv) => {
                    const statusConfig = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate max-w-[150px]">{inv.chat.title || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{inv.email || "Link invite"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={ROLE_STYLES[inv.role] || "bg-muted"}>
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${inv.status === "expired" ? "text-destructive" : "text-muted-foreground"}`}>
                            {formatExpiry(inv.expiresAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(inv.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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