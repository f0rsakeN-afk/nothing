"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, MessageSquare, Trash2, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AiResponseFormatter = dynamic(
  () => import("@/components/main/chat/ai-response-formatter").then((mod) => mod.AiResponseFormatter),
  { ssr: false, loading: () => <div className="h-4 w-full bg-muted animate-pulse rounded" /> },
);

interface Chat {
  id: string;
  title: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  userId: string;
  user?: { email: string };
  projectId: string | null;
}

interface ChatWithMessages {
  id: string;
  title: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  user: { email: string; displayName: string | null };
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

interface ChatsResponse {
  data: Chat[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

interface ChatsFilters {
  search?: string;
  visibility?: string;
  page?: number;
  limit?: number;
}

async function getChats(filters: ChatsFilters = {}): Promise<ChatsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.visibility) params.set("visibility", filters.visibility);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const res = await fetch(`/api/admin/chats?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

async function deleteChat(id: string) {
  const res = await fetch(`/api/admin/chats/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete chat");
  }
  return res.json();
}

async function bulkDeleteChats(ids: string[]) {
  const res = await fetch("/api/admin/chats/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to delete chats");
  }
  return res.json();
}

async function toggleChatVisibility(id: string, visibility: string) {
  const res = await fetch(`/api/admin/chats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });
  if (!res.ok) throw new Error("Failed to update chat");
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const VISIBILITY_STYLES: Record<string, { bg: string; text: string }> = {
  public: { bg: "bg-green-500/10", text: "text-green-600" },
  private: { bg: "bg-muted", text: "text-muted-foreground" },
};

export default function ChatsPage() {
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [viewChatId, setViewChatId] = useState<string | null>(null);
  const limit = 20;

  const queryClient = useQueryClient();

  const filters = useMemo(() => ({
    search: search || undefined,
    visibility: visibilityFilter || undefined,
    page,
    limit,
  }), [search, visibilityFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "chats", filters],
    queryFn: () => getChats(filters),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      toast.success("Chat deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
    },
    onError: (err: Error) => toast.error("Failed to delete", { description: err.message }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteChats,
    onSuccess: (result) => {
      toast.success(`${result.deletedCount} chats deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (err: Error) => toast.error("Failed to bulk delete", { description: err.message }),
  });

  const handleToggleVisibility = useCallback(async (id: string, current: string) => {
    const next = current === "public" ? "private" : "public";
    try {
      await toggleChatVisibility(id, next);
      toast.success(`Chat set to ${next}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "chats"] });
    } catch {
      toast.error("Failed to update visibility");
    }
  }, [queryClient]);

  const { data: viewChat } = useQuery({
    queryKey: ["admin", "chat", viewChatId],
    queryFn: async () => {
      if (!viewChatId) return null;
      const res = await fetch(`/api/admin/chats/${viewChatId}`);
      if (!res.ok) throw new Error("Failed to fetch chat");
      return res.json();
    },
    enabled: !!viewChatId,
    staleTime: 30 * 1000,
  });

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
      setSelectedIds(new Set(data.data.map((c) => c.id)));
    }
  }, [data, selectedIds.size]);

  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => data && p < data.pagination.totalPages ? p + 1 : p), [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Chats</h1>
            <p className="text-sm text-muted-foreground">Manage all platform chats</p>
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
            placeholder="Search chats..."
            className="pl-8"
          />
        </div>

        <Select value={visibilityFilter} onValueChange={(v) => { setVisibilityFilter(v || ""); setPage(1); }}>
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue placeholder="All Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.pagination.total.toLocaleString() ?? 0} chats
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
              <p className="text-sm font-medium text-destructive">Failed to load chats</p>
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
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Visibility</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Messages</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Updated</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                      No chats found
                    </td>
                  </tr>
                ) : (
                  data.data.map((chat) => (
                    <tr key={chat.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(chat.id)}
                          onCheckedChange={() => handleToggleSelect(chat.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate max-w-[200px]">{chat.title || "Untitled"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{chat.user?.email || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${VISIBILITY_STYLES[chat.visibility]?.bg} ${VISIBILITY_STYLES[chat.visibility]?.text}`}>
                          {chat.visibility}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{chat.messageCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{formatDate(chat.updatedAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewChatId(chat.id)}
                            title="View chat"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(chat.id)}
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
            <AlertDialogTitle>Delete {selectedIds.size} Chats</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected chats. This action cannot be undone.
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

      <Dialog open={!!viewChatId} onOpenChange={(open) => !open && setViewChatId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewChat?.chat?.title || "Chat Messages"}</DialogTitle>
          </DialogHeader>
          {viewChat?.chat ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {viewChat.chat.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => (
                <div key={msg.id} className={cn(
                  "rounded-lg p-3",
                  msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {msg.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <AiResponseFormatter content={msg.content} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
