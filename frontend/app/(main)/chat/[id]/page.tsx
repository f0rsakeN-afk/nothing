"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ChatInput } from "@/components/main/home/chat-input";
import { STATIC_RESPONSE } from "@/components/main/chat/static-response";
import type { Message } from "@/components/main/chat/chat-message";
import {
  SplitViewProvider,
  useSplitView,
} from "@/components/main/chat/split-view-context";
import { Network, X } from "lucide-react";
import { CreditsButton } from "@/components/main/header/credits-button";
import { NotificationsButton } from "@/components/main/header/notifications-button";
import { randomUUID } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Code-split heavy components
// ---------------------------------------------------------------------------

const ChatMessage = dynamic(
  () =>
    import("@/components/main/chat/chat-message").then((m) => ({
      default: m.ChatMessage,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="py-4">
        <div className="flex gap-3">
          <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    ),
  },
);

const SystemDesignCanvas = dynamic(
  () =>
    import("@/components/main/chat/format/system-design").then((m) => ({
      default: m.SystemDesignCanvas,
    })),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Split panel
// ---------------------------------------------------------------------------

function SplitPanel() {
  const splitView = useSplitView();

  // useMemo must be called unconditionally — before any early return
  const nodes = React.useMemo(() => {
    try {
      return JSON.parse(splitView?.splitView?.rawData ?? "")?.nodes ?? [];
    } catch {
      return [];
    }
  }, [splitView?.splitView?.rawData]);

  if (!splitView?.splitView) return null;

  const { title, description, rawData } = splitView.splitView;

  return (
    <div className="flex flex-col w-1/2 shrink-0 border-l border-border bg-card/30 animate-in slide-in-from-right-4 duration-200">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <Network className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-foreground truncate">
              {title || "System Design"}
            </h3>
            {description && (
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => splitView.closeSplitView()}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Close split view"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas fills the rest */}
      <div className="flex-1 min-h-0">
        <SystemDesignCanvas data={rawData} nodes={nodes} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner page (needs access to split view context)
// ---------------------------------------------------------------------------

function ChatPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const splitView = useSplitView();

  const seedMessages = React.useMemo<Message[]>(
    () => [
      { id: randomUUID(), role: "user", content: initialQuery },
      { id: randomUUID(), role: "assistant", content: STATIC_RESPONSE },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [messages, setMessages] = React.useState<Message[]>(seedMessages);
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEdit = React.useCallback((id: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: newContent } : m)),
    );
  }, []);

  const handleSubmit = React.useCallback((value: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };
    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: STATIC_RESPONSE,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* ── Chat column ───────────────────────────────────── */}
      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* {!splitView?.splitView && (
          <div className="absolute right-4 top-2 z-10 flex items-center gap-1.5">
            <CreditsButton />
            <NotificationsButton />
          </div>
        )} */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="mx-auto w-full max-w-3xl px-2 py-2">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onEdit={handleEdit}
              />
            ))}
            {/* <div ref={bottomRef} /> */}
          </div>
        </div>

        <div className="shrink-0">
          <div className="mx-auto w-full max-w-3xl px-2 py-2">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="Ask a follow-up…"
            />
          </div>
        </div>
      </div>

      {/* ── Split panel ───────────────────────────────────── */}
      <SplitPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps everything in SplitViewProvider
// ---------------------------------------------------------------------------

export default function ChatPage() {
  return (
    <SplitViewProvider>
      <ChatPageInner />
    </SplitViewProvider>
  );
}
