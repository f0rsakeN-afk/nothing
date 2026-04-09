"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/main/home/chat-input";
import { Chip } from "@/components/main/home/chip";
import { PromptModal } from "@/components/main/home/prompt-modal";
import { CHIPS, type ChipData } from "@/components/main/home/data";
import { HEADING_PHRASES } from "@/components/main/home/data/headings";
import { CreditsButton } from "@/components/main/header/credits-button";
import { NotificationsButton } from "@/components/main/header/notifications-button";
import { MemoryDialog } from "@/components/main/memory/memory-dialog";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [heading] = useState(
    () => HEADING_PHRASES[Math.floor(Math.random() * HEADING_PHRASES.length)],
  );
  const [activeChip, setActiveChip] = useState<ChipData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

        const { id: chatId, shouldTriggerAI } = await res.json();

        // Navigate to the new chat with the message as a query param
        const triggerParam = shouldTriggerAI ? "&trigger=1" : "";
        const webSearchParam = webSearch ? "&web=1" : "";
        router.push(`/chat/${chatId}?q=${encodeURIComponent(value)}${triggerParam}${webSearchParam}`);
      } catch (error) {
        console.error("Error creating chat:", error);
        setIsCreating(false);
      }
    },
    [router, isCreating, webSearch]
  );

  // Closes the modal and populates the input in one go.
  const handlePromptSelect = useCallback((prompt: string) => {
    setActiveChip(null);
    setInput(prompt);
  }, []);

  const handleModalClose = useCallback(() => setActiveChip(null), []);

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
            webSearch={webSearch}
            setWebSearch={setWebSearch}
          />
        </div>
      </div>

      <PromptModal
        chip={activeChip}
        onClose={handleModalClose}
        onSelect={handlePromptSelect}
      />
    </div>
  );
}
