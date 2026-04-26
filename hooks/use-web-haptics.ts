"use client";

import { useCallback } from "react";
import { useWebHapticsContext } from "@/components/providers/web-haptics-provider";

type HapticPreset = "success" | "nudge" | "error" | "buzz";

export function useHaptics() {
  const { haptics, isSupported, hapticsEnabled } = useWebHapticsContext();

  const trigger = useCallback(
    async (preset: HapticPreset) => {
      if (!haptics || !isSupported || !hapticsEnabled) return;
      await haptics.trigger(preset);
    },
    [haptics, isSupported, hapticsEnabled],
  );

  return { trigger, isSupported, hapticsEnabled };
}
