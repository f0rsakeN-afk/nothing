"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Chat } from "@/services/chat.service";

interface ProjectChatListProps {
  chats: Chat[];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ProjectChatList({ chats }: ProjectChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="space-y-0 w-full pt-2 border-t border-border/40">
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No chats in this project yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Start a new chat to begin researching
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 w-full pt-2 border-t border-border/40">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          href={`/chat/${chat.id}`}
          className="block py-4 border-b border-border/40 hover:bg-muted/10 transition-colors cursor-pointer group"
        >
          <h3 className="text-[14.5px] font-medium text-foreground group-hover:underline decoration-muted-foreground underline-offset-4">
            {chat.title}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1.5 font-medium">
            {formatRelativeTime(chat.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}
