"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ChatInput } from "@/components/main/home/chat-input";
import { STATIC_RESPONSE } from "@/components/main/chat/static-response";
import type { Message } from "@/components/main/chat/chat-message";

// ---------------------------------------------------------------------------
// Code-split heavy components
// ChatMessage pulls in AiResponseFormatter → react-markdown + syntax
// highlighter, so we lazy-load it. The skeleton prevents layout shift.
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  // Seed messages: user's initial prompt + static assistant response.
  // useMemo so this only runs once per mount — the deps never change after
  // the initial render (initialQuery comes from the URL).
  const seedMessages = React.useMemo<Message[]>(
    () => [
      { id: crypto.randomUUID(), role: "user", content: initialQuery },
      { id: crypto.randomUUID(), role: "assistant", content: STATIC_RESPONSE },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentionally empty — URL param is stable for the lifetime of this page
  );

  const [messages, setMessages] = React.useState<Message[]>(seedMessages);
  const [input, setInput] = React.useState("");

  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever a new message arrives
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
    <div className="flex h-[calc(100dvh-3rem)] flex-col bg-background md:h-dvh">
      {/* ── Scrollable messages ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full xl:max-w-3xl px-2 py-2">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onEdit={handleEdit}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Sticky input ───────────────────────────────────── */}
      <div className="shrink-0">
        <div className="mx-auto w-full xl:max-w-3xl px-2 xl:px-0 py-2">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Ask a follow-up…"
          />
          <p className="mt-2 text-center text-[10px] text-muted-foreground/25">
            Eryx can make mistakes.
          </p>
        </div>
      </div>
    </div>
  );
}
