"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Workflow, Globe, Code2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInput } from "@/components/main/home/chat-input";

// ---------------------------------------------------------------------------
// Suggestion chips data
// ---------------------------------------------------------------------------

const CHIPS = [
  {
    label: "Design",
    icon: Workflow,
    prompt: "Help me design a system architecture for ",
  },
  {
    label: "Search",
    icon: Globe,
    prompt: "Search the web for the latest info on ",
  },
  { label: "Code", icon: Code2, prompt: "Write or review code for " },
  { label: "Explain", icon: Lightbulb, prompt: "Explain how this works: " },
] as const;

// ---------------------------------------------------------------------------
// Chip — memoised, one per suggestion
// ---------------------------------------------------------------------------

interface ChipProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  onSelect: (prompt: string) => void;
}

const Chip = React.memo(function Chip({
  label,
  icon: Icon,
  prompt,
  onSelect,
}: ChipProps) {
  const handleClick = React.useCallback(
    () => onSelect(prompt),
    [prompt, onSelect],
  );

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-card",
        "px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground",
        "hover:border-foreground/20 hover:bg-accent/50 hover:text-foreground",
        "  duration-150",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = React.useState("");

  const handleChipSelect = React.useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const handleSubmit = React.useCallback(
    (value: string) => {
      const id = crypto.randomUUID();
      router.push(`/chat/${id}?q=${encodeURIComponent(value)}`);
    },
    [router],
  );

  return (
    <div className="flex h-full min-h-[calc(100dvh-3rem)] flex-col bg-background md:min-h-dvh">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        {/* ── Greeting ──────────────────────────────────────── */}
        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          How can I help you?
        </h1>

        {/* ── Suggestion chips ──────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip) => (
            <Chip key={chip.label} {...chip} onSelect={handleChipSelect} />
          ))}
        </div>

        {/* ── Chat input ────────────────────────────────────── */}
        <div className="w-full max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/35">
            Eryx can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
