"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/main/home/chat-input";
import { Chip } from "@/components/main/home/chip";
import { PromptModal } from "@/components/main/home/prompt-modal";
import {
  getChipsByProfession,
  type ChipData,
} from "@/components/main/home/data";
import { getTimeBasedHeading } from "@/components/main/home/data/headings";
// import { CreditsButton } from "@/components/main/header/credits-button";
// import { NotificationsButton } from "@/components/main/header/notifications-button";
import { MemoryDialog } from "@/components/main/memory/memory-dialog";
import { ShortcutHandler } from "@/components/main/shortcut-handler";
import { AuthDialog } from "@/components/main/sidebar/dialogs/auth/auth-dialog";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useCreateChat } from "@/hooks/use-create-chat";
import { usePendingPrompt } from "@/hooks/use-pending-prompt";
import { useProfession } from "@/hooks/use-profession";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [heading] = useState(() => getTimeBasedHeading());
  const [activeChip, setActiveChip] = useState<ChipData | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [currentModel, setCurrentModel] = useState("gpt-4.1-mini");

  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { pendingPrompt, setPendingPrompt, clearPendingPrompt } =
    usePendingPrompt();
  const { profession } = useProfession();

  useEffect(() => {
    if (pendingPrompt) {
      setInput(pendingPrompt);
      clearPendingPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { createChat, isCreating } = useCreateChat({
    getNavigatePath: (chatId, firstMessage, shouldTriggerAI) => {
      const triggerParam = shouldTriggerAI ? "&trigger=1" : "";
      const webParam = webSearchEnabled ? "&web=1" : "";
      return `/chat/${chatId}?q=${encodeURIComponent(firstMessage)}${triggerParam}${webParam}`;
    },
  });

  // Redirect based on auth status
  useEffect(() => {
    if (authStatus?.authenticated && !authStatus.seenOnboarding) {
      router.push("/onboarding");
    } else if (authStatus?.authenticated && authStatus.isActive === false) {
      router.push("/deactivated");
    }
  }, [authStatus, router]);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (isCreating) return;

      // Auth check - if not authenticated, save prompt and show auth dialog
      if (!authStatus?.authenticated) {
        setPendingPrompt(value);
        setAuthDialogOpen(true);
        return;
      }

      await createChat(value);
    },
    [createChat, isCreating, authStatus, setPendingPrompt],
  );

  // Closes the modal and populates the input in one go.
  const handlePromptSelect = useCallback((prompt: string) => {
    setActiveChip(null);
    setInput(prompt);
  }, []);

  const handleModalClose = useCallback(() => setActiveChip(null), []);

  if (authLoading) {
    return null;
  }

  return (
    <div className="relative flex h-full min-h-[calc(100dvh-3rem)] flex-col bg-background md:min-h-dvh">
      {/* <div className="absolute right-4 top-2 z-10 flex items-center gap-1.5">
        <CreditsButton />
        <NotificationsButton /> 
      </div> */}
      <div className="flex flex-1 flex-col items-center px-2 pb-2 pt-12 md:justify-center">
        <div className="flex flex-1 flex-col items-center justify-center w-full md:flex-none">
          <h1
            suppressHydrationWarning
            className="mb-8 text-center text-3xl font-semibold text-foreground md:text-4xl font-display tracking-wide select-none"
          >
            {heading}
          </h1>

          <div className="mb-6 xl:hidden flex flex-wrap items-center justify-center gap-2">
            {getChipsByProfession(profession).map((chip) => (
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
            currentModel={currentModel}
            onModelChange={setCurrentModel}
          />
        </div>

        <div className="mt-6 hidden xl:flex flex-wrap items-center justify-center gap-2">
          {getChipsByProfession(profession).map((chip) => (
            <Chip key={chip.label} chip={chip} onOpen={setActiveChip} />
          ))}
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

      <ShortcutHandler />

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
