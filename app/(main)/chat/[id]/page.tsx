"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/sileo-toast";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useChatStream } from "@/hooks/useChatStream";
import type { Message } from "@/services/chat.service";
import { SplitViewContext } from "@/components/main/chat/split-view-context";
import { useOptimizedScroll } from "@/hooks/use-optimized-scroll";
import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MemoryDialog } from "@/components/main/memory/memory-dialog";
import { ChatErrorBoundary } from "@/components/ui/error-boundary";
import { McpElicitationModal } from "@/components/mcp-elicitation-modal";
import {
  ElicitationProvider,
  useElicitation,
} from "@/components/providers/elicitation-provider";

// =========================================
// Code-split heavy components (loaded on demand)
// =========================================

const ChatMessage = dynamic(
  () =>
    import("@/components/main/chat/chat-message").then((m) => ({
      default: m.ChatMessage,
    })),
  {
    ssr: false,
  },
);

const SystemDesignCanvas = dynamic(
  () =>
    import("@/components/main/chat/format/system-design").then((m) => ({
      default: m.SystemDesignCanvas,
    })),
  { ssr: false },
);

const ChatInput = dynamic(
  () =>
    import("@/components/main/home/chat-input").then((m) => ({
      default: m.ChatInput,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] border-t border-border/50 bg-background/50 animate-pulse" />
    ),
  },
);

const SplitViewProvider = dynamic(
  () =>
    import("@/components/main/chat/split-view-context").then((m) => ({
      default: m.SplitViewProvider,
    })),
  { ssr: false },
);

// =========================================
// Skeleton components — premium loading states
// =========================================

// function ChatPageSkeleton() {
//   return (
//     <div className="flex h-dvh flex-col bg-background">
//       {/* Topbar skeleton */}
//       <div className="h-14 border-b border-border/50 px-4 flex items-center gap-4 shrink-0">
//         <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
//         <div className="h-4 w-32 rounded bg-muted/50 animate-pulse" />
//         <div className="ml-auto flex gap-2">
//           <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
//           <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
//         </div>
//       </div>

//       {/* Messages area */}
//       <div className="flex-1 overflow-y-auto">
//         <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-1">
//           {/* Welcome message skeleton */}
//           <div className="py-4 px-2">
//             <div className="flex gap-3">
//               <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20 shrink-0" />
//               <div className="flex-1 space-y-3 max-w-[80%]">
//                 <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
//                 <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
//                 <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse" />
//               </div>
//             </div>
//           </div>

//           {/* User message skeleton */}
//           <MessageSkeleton isUser />

//           {/* Assistant messages */}
//           <MessageSkeleton />
//           <MessageSkeleton />

//           {/* Typing indicator */}
//           <TypingIndicator />
//         </div>
//       </div>

//       {/* Input area skeleton */}
//       <div className="shrink-0 border-t border-border/50 p-3">
//         <div className="mx-auto max-w-3xl">
//           <div className="h-12 rounded-2xl bg-muted/50 ring-1 ring-border/50 animate-pulse" />
//         </div>
//       </div>
//     </div>
//   );
// }

function ErrorState({ onRetry, t }: { onRetry: () => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col items-center justify-center h-dvh gap-4">
      <p className="text-sm text-muted-foreground">{t("errors.description500")}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}

// =========================================
// Memoized components
// =========================================

const MessageItem = React.memo(function MessageItem({
  message,
  chatId,
  onEdit,
}: {
  message: Message;
  chatId: string;
  onEdit: (id: string, content: string) => void;
}) {
  return (
    <ChatMessage
      key={message.id}
      message={message}
      chatId={chatId}
      onEdit={onEdit}
    />
  );
});

const SplitPanel = React.memo(function SplitPanel() {
  const splitView = React.useContext(SplitViewContext);

  if (!splitView?.splitView) return null;

  const { title, description, rawData } = splitView.splitView;

  return (
    <div className="flex flex-col w-1/2 shrink-0 border-l border-border bg-card/30 animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
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
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <SystemDesignCanvas data={rawData} nodes={[]} />
      </div>
    </div>
  );
});

// =========================================
// Virtualized message list
// =========================================

interface VirtualizedMessageListProps {
  messages: Message[];
  chatId: string;
  onEdit: (id: string, content: string) => void;
  onLoadOlder: () => void;
  hasOlder: boolean;
  isLoadingOlder: boolean;
}

function VirtualizedMessageList({
  messages,
  chatId,
  onEdit,
  onLoadOlder,
  hasOlder,
  isLoadingOlder,
}: VirtualizedMessageListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const lastScrollTop = React.useRef(0);
  const isStreamingRef = React.useRef(false);

  const { scrollToBottom, markManualScroll, resetManualScroll } =
    useOptimizedScroll(parentRef);

  const { touchActiveRef } = useScrollTracking(parentRef, {
    onWheelUp: () => markManualScroll({ userScrolledUp: true }),
  });

  // Use simple virtual scrolling with CSS
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  // Scroll handler for loading older messages
  React.useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop } = el;
      const scrollDelta = scrollTop - lastScrollTop.current;
      lastScrollTop.current = scrollTop;

      if (scrollDelta < -50 && scrollTop < 200 && hasOlder && !isLoadingOlder) {
        onLoadOlder();
      }
      if (!touchActiveRef.current) markManualScroll();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasOlder, isLoadingOlder, onLoadOlder, markManualScroll, touchActiveRef]);

  // Auto-scroll to bottom as streaming response arrives
  React.useEffect(() => {
    const hasStreaming = messages.some(
      (m) => "isStreaming" in m && m.isStreaming,
    );
    const wasStreaming = isStreamingRef.current;
    isStreamingRef.current = hasStreaming;

    if (hasStreaming && !wasStreaming) {
      resetManualScroll();
      scrollToBottom();
    } else if (hasStreaming) {
      scrollToBottom();
    } else if (!hasStreaming && wasStreaming) {
      markManualScroll();
    }
  }, [messages.length, scrollToBottom, markManualScroll, resetManualScroll]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto hide-scrollbar">
      {isLoadingOlder && (
        <div className="flex justify-center py-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl px-2">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${items[0]?.start ?? 0}px)`,
            }}
          >
            {items.map((virtualItem) => {
              const message = messages[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{ padding: "8px 0" }}
                >
                  <MessageItem
                    message={message}
                    chatId={chatId}
                    onEdit={onEdit}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================
// Inner page
// =========================================

function ChatPageInner() {
  const t = useTranslations();
  const params = useParams();
  const chatId = params.id as string;
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialWebSearch = searchParams.get("web") === "1";

  const [input, setInput] = React.useState("");
  const [webSearch, setWebSearch] = React.useState(initialWebSearch);
  const [memoryDialogOpen, setMemoryDialogOpen] = React.useState(false);
  const [currentModel, setCurrentModel] = React.useState("gpt-4.1-mini");

  const {
    activeElicitation,
    setActiveElicitation,
    dismissedIds,
    addDismissedId,
  } = useElicitation();

  const {
    messages,
    isLoading,
    isError,
    refetch,
    sendUserMessage,
    loadOlder,
    hasOlder,
    isFetchingOlder,
  } = useChatMessages({
    chatId,
    initialQuery,
    skipFirstMessage:
      searchParams.get("trigger") === "1" && initialQuery.length > 0,
    onElicitation: (data) => {
      if (dismissedIds.has(data.elicitationId)) return;
      setActiveElicitation(data);
    },
    onElicitationDone: (data) => {
      addDismissedId(data.elicitationId);
      setActiveElicitation(null);
    },
  });

  // Auto-trigger AI response when arriving from home with a prompt
  React.useEffect(() => {
    const shouldTrigger =
      searchParams.get("trigger") === "1" && initialQuery.length > 0;
    const hasUserMessage = messages.some((m) => m.role === "user");
    const hasAssistantMessage = messages.some((m) => m.role === "assistant");

    if (shouldTrigger && hasUserMessage && !hasAssistantMessage) {
      // User message exists but no AI response yet - trigger AI
      sendUserMessage(initialQuery);
    }
  }, [messages, initialQuery, searchParams, sendUserMessage]);

  // Clear trigger and q params once AI starts streaming to prevent re-trigger on refresh
  React.useEffect(() => {
    if (messages.some((m) => m.role === "assistant" && m.isStreaming)) {
      // AI started streaming - clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("trigger");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [messages]);

  // Subscribe to real-time message updates from other devices
  const handleNewMessage = React.useCallback((message: Message) => {
    if (message.role === "assistant") {
      toast(t("chat.newAiResponse"), {
        description:
          message.content.slice(0, 100) +
          (message.content.length > 100 ? "..." : ""),
      });
    }
  }, [t]);

  useChatStream({
    chatId,
    onNewMessage: handleNewMessage,
  });

  // Handle MCP elicitation events via useChatMessages callback
  React.useEffect(() => {
    const handleElicitation = (data: {
      elicitationId: string;
      serverName: string;
      message: string;
      mode: "form" | "url";
      requestedSchema?: unknown;
      url?: string;
    }) => {
      if (dismissedIds.has(data.elicitationId)) return;
      setActiveElicitation(data);
    };

    const handleElicitationDone = (data: { elicitationId: string }) => {
      addDismissedId(data.elicitationId);
      setActiveElicitation(null);
    };

    // Pass elicitation handlers to useChatMessages
    // This is done by calling with the callbacks - but we need to integrate with useChatMessages
  }, [dismissedIds, setActiveElicitation, addDismissedId]);

  // For now, elicitation is handled via the data stream in the useChatMessages hook
  // We pass elicitation callbacks to useChatMessages
  React.useEffect(() => {
    // Elicitation handling is done through the streamChat callbacks in useChatMessages
  }, []);

  const handleSubmit = React.useCallback(
    async (value: string) => {
      setInput("");
      try {
        await sendUserMessage(
          value,
          webSearch ? "web" : "chat",
          undefined,
          currentModel,
        );
      } catch (err) {
        const error = err as {
          code?: string;
          message?: string;
          required?: number;
          current?: number;
          upgradeTo?: string;
        };
        if (error.code === "CREDIT_ERROR") {
          toast.error(t("credits.outOfCredits"), {
            description: error.message || t("credits.outOfCreditsDesc"),
            action: {
              label: t("sidebar.upgradeToPro"),
              onClick: () =>
                window.dispatchEvent(new CustomEvent("open-pricing-dialog")),
            },
          });
        }
      }
    },
    [sendUserMessage, webSearch, currentModel],
  );

  if (isError) return <ErrorState onRetry={refetch} t={t} />;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
        <VirtualizedMessageList
          messages={messages}
          chatId={chatId}
          onEdit={() => {}}
          onLoadOlder={loadOlder}
          hasOlder={hasOlder}
          isLoadingOlder={isFetchingOlder}
        />

        <div className="shrink-0">
          <div className="mx-auto w-full max-w-3xl px-2 py-2">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="Ask a follow-up…"
              onOpenMemory={() => setMemoryDialogOpen(true)}
              webSearchEnabled={webSearch}
              onWebSearchToggle={(enabled) => setWebSearch(enabled)}
              suggestionsEnabled={false}
              currentModel={currentModel}
              onModelChange={(model) => setCurrentModel(model)}
            />
          </div>
        </div>

        <MemoryDialog
          isOpen={memoryDialogOpen}
          onOpenChange={setMemoryDialogOpen}
        />

        <McpElicitationModal
          elicitation={activeElicitation}
          onClose={() => setActiveElicitation(null)}
        />
      </div>

      <SplitPanel />
    </div>
  );
}

// =========================================
// Page export
// =========================================

export default function ChatPage() {
  const SplitViewProvider = dynamic(
    () =>
      import("@/components/main/chat/split-view-context").then(
        (m) => m.SplitViewProvider,
      ),
    { ssr: false },
  );

  return (
    <ElicitationProvider>
      <ChatErrorBoundary>
        <SplitViewProvider>
          <ChatPageInner />
        </SplitViewProvider>
      </ChatErrorBoundary>
    </ElicitationProvider>
  );
}
