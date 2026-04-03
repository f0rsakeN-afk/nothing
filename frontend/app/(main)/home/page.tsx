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
import { randomUUID } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [heading] = useState(
    () => HEADING_PHRASES[Math.floor(Math.random() * HEADING_PHRASES.length)],
  );
  const [activeChip, setActiveChip] = useState<ChipData | null>(null);

  const handleSubmit = useCallback(
    (value: string) => {
      router.push(`/chat/${randomUUID()}?q=${encodeURIComponent(value)}`);
    },
    [router],
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
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <h1
          suppressHydrationWarning
          className="mb-8 text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
        >
          {heading}
        </h1>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip) => (
            // setActiveChip is stable (from useState) — no useCallback wrapper needed.
            <Chip key={chip.label} chip={chip} onOpen={setActiveChip} />
          ))}
        </div>

        <div className="w-full max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
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
