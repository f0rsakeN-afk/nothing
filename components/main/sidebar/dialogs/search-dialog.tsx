"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  firstMessagePreview: string | null;
}

interface ChatsResponse {
  chats: Chat[];
}

async function fetchChats(): Promise<ChatsResponse> {
  const res = await fetch("/api/chats?limit=50");
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

async function searchChats(query: string): Promise<ChatsResponse> {
  const res = await fetch(`/api/chats/search?q=${encodeURIComponent(query)}&limit=50`);
  if (!res.ok) throw new Error("Failed to search chats");
  return res.json();
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  // Fetch all chats when dialog opens
  const { data: allChats, isLoading: loadingAll } = useQuery({
    queryKey: ["chats", "all"],
    queryFn: fetchChats,
    enabled: open,
    staleTime: 30000,
  });

  // Search chats when query changes
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["chats", "search", query],
    queryFn: () => searchChats(query),
    enabled: query.trim().length > 0,
    staleTime: 10000,
  });

  const isLoading = query.trim() ? searching : loadingAll;
  const chats = query.trim()
    ? searchResults?.chats ?? []
    : allChats?.chats ?? [];

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    onOpenChange(false);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If there's a query, search and navigate to first result
    // Otherwise just close
    if (query.trim() && chats.length > 0) {
      handleSelectChat(chats[0].id);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) setQuery("");
      }}
    >
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Chats
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <form onSubmit={handleSubmit}>
            <Input
              placeholder="Search your chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="mb-3"
            />
          </form>
          {query.trim() ? (
            <p className="text-xs text-muted-foreground">
              {chats.length} result{chats.length !== 1 ? "s" : ""} for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Search through your chat history
            </p>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-[300px] overflow-y-auto px-2 pb-2 hide-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {query.trim()
                  ? `No chats found for "${query.trim()}"`
                  : "No chats yet. Start a conversation!"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/60"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {chat.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {formatTime(chat.updatedAt)}
                      </span>
                    </div>
                    {chat.firstMessagePreview && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {chat.firstMessagePreview}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {chat.messageCount} message{chat.messageCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
