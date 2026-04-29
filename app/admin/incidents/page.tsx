"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";

type IncidentStatus = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
type IncidentSeverity = "CRITICAL" | "MAJOR" | "MINOR";

interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  message: string | null;
  startedAt: string;
  resolvedAt: string | null;
  affectedComponents: string[];
}

interface IncidentsResponse {
  data: Incident[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

async function getIncidents(status?: string, page: number = 1): Promise<IncidentsResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", "20");
  const res = await fetch(`/api/admin/incidents?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

async function createIncident(data: {
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  message?: string;
  affectedComponents?: string[];
}) {
  const res = await fetch("/api/admin/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create incident");
  }
  return res.json();
}

async function updateIncident(id: string, data: {
  status?: IncidentStatus;
  resolvedAt?: string;
}) {
  const res = await fetch(`/api/admin/incidents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update incident");
  }
  return res.json();
}

async function deleteIncident(id: string) {
  const res = await fetch(`/api/admin/incidents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete incident");
  }
  return res.json();
}

const STATUS_CONFIG: Record<IncidentStatus, { icon: typeof Clock; label: string; color: string }> = {
  INVESTIGATING: { icon: AlertTriangle, label: "Investigating", color: "bg-red-500/10 text-red-600" },
  IDENTIFIED: { icon: AlertTriangle, label: "Identified", color: "bg-orange-500/10 text-orange-600" },
  MONITORING: { icon: Clock, label: "Monitoring", color: "bg-yellow-500/10 text-yellow-600" },
  RESOLVED: { icon: CheckCircle, label: "Resolved", color: "bg-green-500/10 text-green-600" },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { color: string }> = {
  CRITICAL: { color: "bg-red-500/10 text-red-600 border-red-500/20" },
  MAJOR: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  MINOR: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
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

function formatDuration(start: string, end: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diff = endDate.getTime() - startDate.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    status: "INVESTIGATING" as IncidentStatus,
    severity: "MINOR" as IncidentSeverity,
    message: "",
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "incidents", statusFilter, page],
    queryFn: () => getIncidents(statusFilter || undefined, page),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      toast.success("Incident created");
      queryClient.invalidateQueries({ queryKey: ["admin", "incidents"] });
      setCreateOpen(false);
      setNewIncident({ title: "", status: "INVESTIGATING", severity: "MINOR", message: "" });
    },
    onError: (err: Error) => {
      toast.error("Failed to create", { description: err.message });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => updateIncident(id, { status: "RESOLVED", resolvedAt: new Date().toISOString() }),
    onSuccess: () => {
      toast.success("Incident resolved");
      queryClient.invalidateQueries({ queryKey: ["admin", "incidents"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to resolve", { description: err.message });
    },
  });

  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => data && p < data.pagination.totalPages ? p + 1 : p), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage system incidents</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Report Incident
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || ""); setPage(1); }}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="IDENTIFIED">Identified</SelectItem>
            <SelectItem value="MONITORING">Monitoring</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} incidents
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
              <p className="text-sm font-medium text-destructive">Failed to load incidents</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Severity</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Components</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Started</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      No incidents found
                    </td>
                  </tr>
                ) : (
                  data.data.map((incident) => {
                    const statusConfig = STATUS_CONFIG[incident.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={incident.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={SEVERITY_CONFIG[incident.severity].color}>
                            {incident.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{incident.title}</span>
                            {incident.message && (
                              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {incident.message}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {incident.affectedComponents.slice(0, 2).map((comp) => (
                              <Badge key={comp} variant="outline" className="text-[10px] h-5">
                                {comp}
                              </Badge>
                            ))}
                            {incident.affectedComponents.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{incident.affectedComponents.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(incident.startedAt, incident.resolvedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{formatDate(incident.startedAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {incident.status !== "RESOLVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-green-600 hover:text-green-700"
                              onClick={() => resolveMutation.mutate({ id: incident.id })}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Resolve
                            </Button>
                          )}
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

      {/* Create Incident Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
            <DialogDescription>Create a new system incident</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                placeholder="e.g., API latency spike"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(v) => setNewIncident({ ...newIncident, severity: v as IncidentSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINOR">Minor</SelectItem>
                    <SelectItem value="MAJOR">Major</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newIncident.status}
                  onValueChange={(v) => setNewIncident({ ...newIncident, status: v as IncidentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="IDENTIFIED">Identified</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Input
                value={newIncident.message}
                onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                placeholder="Brief description of the incident"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newIncident)}
              disabled={!newIncident.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}