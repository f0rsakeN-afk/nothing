"use client";

import React, { useState, useEffect } from "react";
import { TextEffect } from "./text-effect";
import type { Variants } from "motion/react";

const CYCLE_MS = 3500;
const EXIT_MS = 450; // enough time for the per-word exit stagger

// Enter from below, exit upward — asymmetric y so it feels like a conveyor belt.
const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -16, filter: "blur(8px)" },
};

// Stable object reference — avoids TextEffect recomputing computedVariants on every render.
const TEXT_EFFECT_VARIANTS = { item: ITEM_VARIANTS };

interface AnimatedPlaceholderProps {
  placeholders: string[];
  /** Controls visibility — pass `false` when the input has content */
  active?: boolean;
  className?: string;
}

export const AnimatedPlaceholder = React.memo(function AnimatedPlaceholder({
  placeholders,
  active = true,
  className,
}: AnimatedPlaceholderProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Reset to visible whenever the placeholder becomes active again (e.g. user
  // clears the input mid-cycle when visible might still be false).
  useEffect(() => {
    if (active) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [active]);

  // Cycle through placeholders only while the placeholder is shown.
  useEffect(() => {
    if (!active) return;

    let exitTimer: ReturnType<typeof setTimeout>;

    const cycleTimer = setInterval(() => {
      setVisible(false);
      exitTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % placeholders.length);
        setVisible(true);
      }, EXIT_MS);
    }, CYCLE_MS);

    return () => {
      clearInterval(cycleTimer);
      clearTimeout(exitTimer);
    };
  }, [active, placeholders.length]);

  return (
    <TextEffect
      as="p"
      per="word"
      variants={TEXT_EFFECT_VARIANTS}
      trigger={active && visible}
      speedReveal={1.2}
      speedSegment={1.2}
      className={className}
    >
      {placeholders[index]}
    </TextEffect>
  );
});
