"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { CodeBlock } from "./code-block";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardData {
  title?: string;
  cards: Flashcard[];
}

export const FlashcardDeck = memo(function FlashcardDeck({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo<FlashcardData | null>(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const prev = useCallback(() => {
    setFlipped(false);
    setIndex(
      (i) =>
        (i - 1 + (parsed?.cards.length ?? 1)) % (parsed?.cards.length ?? 1),
    );
  }, [parsed?.cards.length]);

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i + 1) % (parsed?.cards.length ?? 1));
  }, [parsed?.cards.length]);

  if (!parsed?.cards?.length)
    return <CodeBlock language="json">{data}</CodeBlock>;

  const card = parsed.cards[index];

  return (
    <div className="my-6 rounded-xl border border-border bg-muted/20 p-6">
      {parsed.title && (
        <h4 className="mb-5 text-[15px] font-semibold text-foreground">
          {parsed.title}
        </h4>
      )}

      {/* Card */}
      <div
        className="relative mx-auto mb-4 h-44 max-w-lg cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-6 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="mb-3 shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Question
            </span>
            <div className="w-full flex-1 whitespace-normal wrap-break-word!">
              <p className="wrap-break-word text-[15px] font-semibold text-foreground leading-relaxed">
                {card.front}
              </p>
            </div>
            <span className="mt-3 shrink-0 text-[11px] text-muted-foreground/40">
              Click to reveal answer
            </span>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-6 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <span className="mb-3 shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary/60">
              Answer
            </span>
            <div className="w-full flex-1 whitespace-normal wrap-break-word!">
              <p className="wrap-break-word text-[14px] text-foreground/90 leading-relaxed">
                {card.back}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={prev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
          {index + 1} / {parsed.cards.length}
        </span>
        <button
          onClick={next}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setIndex(0);
            setFlipped(false);
          }}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});
