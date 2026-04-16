"use client";

import { useCallback, useRef } from "react";

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playClick = useCallback(() => {
    try {
      // Check if user prefers reduced motion or sound is muted
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      // Lazy init AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      // Create a short click/snap sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch {
      // Silently fail if audio doesn't work
    }
  }, []);

  const playSelect = useCallback(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      // Create a soft "pop" sound for selection
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch {
      // Silently fail
    }
  }, []);

  return { playClick, playSelect };
}
