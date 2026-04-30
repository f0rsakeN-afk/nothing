"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getChats } from "@/services/chat.service";

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
  nextCursor: string | null;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const t = useTranslations();
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  // Uses same query key as sidebar - shares cache (no extra DB call if sidebar loaded)
  const { data: allChats, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: () => getChats(50, true) as unknown as Promise<ChatsResponse>,
    enabled: open,
    staleTime: 30000,
  });

  // Client-side filter from cached chats
  const filteredChats = React.useMemo(() => {
    const chats = allChats?.chats ?? [];
    if (!query.trim()) return chats;
    const lower = query.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(lower) ||
        chat.firstMessagePreview?.toLowerCase().includes(lower)
    );
  }, [allChats, query]);

  const chats = filteredChats;

  const handleSelectChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    onOpenChange(false);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && chats.length > 0) {
      handleSelectChat(chats[0].id);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return t("sidebar.today");
    if (diffDays === 1) return t("sidebar.yesterday");
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
            {t("search.searchChats")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2">
          <form onSubmit={handleSubmit}>
            <Input
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="mb-3"
            />
          </form>
          <p className="text-xs text-muted-foreground">
            {query.trim()
              ? `${chats.length} result${chats.length !== 1 ? "s" : ""} for "${query}"`
              : `${chats.length} recent chat${chats.length !== 1 ? "s" : ""}`}
          </p>
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
                {query.trim() ? t("search.noResults") : t("chat.noChatsDesc")}
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
                      {chat.messageCount} {chat.messageCount !== 1 ? t("chat.messageSent") : t("chat.messageSent")}
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