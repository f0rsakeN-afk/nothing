"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChatInput } from "@/components/main/home/chat-input";
import { Chip } from "@/components/main/home/chip";
import { PromptModal } from "@/components/main/home/prompt-modal";
import { CHIPS, type ChipData } from "@/components/main/home/data";
import { HEADING_PHRASES } from "@/components/main/home/data/headings";
import { CreditsButton } from "@/components/main/header/credits-button";
import { NotificationsButton } from "@/components/main/header/notifications-button";
import { MemoryDialog } from "@/components/main/memory/memory-dialog";
import type { Chat } from "@/services/chat.service";

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [heading] = useState(
    () => HEADING_PHRASES[Math.floor(Math.random() * HEADING_PHRASES.length)],
  );
  const [activeChip, setActiveChip] = useState<ChipData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Check auth and onboarding status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && !data.seenOnboarding) {
            router.push("/onboarding");
            return;
          }
          if (data.authenticated && data.isActive === false) {
            router.push("/deactivated");
            return;
          }
        }
      } catch {
        // Auth check failed, let user continue
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (isCreating) return;
      setIsCreating(true);

      try {
        // Create chat via API
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstMessage: value }),
        });

        if (!res.ok) {
          throw new Error("Failed to create chat");
        }

        const { id: chatId, shouldTriggerAI, title } = await res.json();

        // Optimistically add chat to sidebar before navigating
        const tempChat: Chat = {
          id: chatId,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: null,
          messageCount: 0,
          firstMessagePreview: value,
        };

        queryClient.setQueryData(
          ["chats"],
          (old: { chats: Chat[]; nextCursor: string | null } | undefined) => {
            if (!old) return { chats: [tempChat], nextCursor: null };
            // Avoid duplicates
            if (old.chats.some((c) => c.id === chatId)) return old;
            return { ...old, chats: [tempChat, ...old.chats] };
          }
        );

        // Navigate to the new chat with the message as a query param
        const triggerParam = shouldTriggerAI ? "&trigger=1" : "";
        const webParam = webSearchEnabled ? "&web=1" : "";
        router.push(`/chat/${chatId}?q=${encodeURIComponent(value)}${triggerParam}${webParam}`);
      } catch (error) {
        console.error("Error creating chat:", error);
        setIsCreating(false);
      }
    },
    [router, isCreating, queryClient]
  );

  // Closes the modal and populates the input in one go.
  const handlePromptSelect = useCallback((prompt: string) => {
    setActiveChip(null);
    setInput(prompt);
  }, []);

  const handleModalClose = useCallback(() => setActiveChip(null), []);

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[calc(100dvh-3rem)] flex-col bg-background md:min-h-dvh">
      <div className="absolute right-4 top-2 z-10 flex items-center gap-1.5">
        <CreditsButton />
        <NotificationsButton />
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-12 md:justify-center">
        <div className="flex flex-1 flex-col items-center justify-center w-full md:flex-none">
          <h1
            suppressHydrationWarning
            className="mb-8 text-center text-3xl font-semibold text-foreground md:text-4xl font-display tracking-wide"
          >
            {heading}
          </h1>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {CHIPS.map((chip) => (
              <Chip key={chip.label} chip={chip} onOpen={setActiveChip} />
            ))}
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isCreating}
            onOpenMemory={() => setMemoryDialogOpen(true)}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={(enabled) => setWebSearchEnabled(enabled)}
          />
        </div>
      </div>

      <PromptModal
        chip={activeChip}
        onClose={handleModalClose}
        onSelect={handlePromptSelect}
      />

      <MemoryDialog
        isOpen={memoryDialogOpen}
        onOpenChange={setMemoryDialogOpen}
      />
    </div>
  );
}
