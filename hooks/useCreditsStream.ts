"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface CreditsData {
  credits: {
    current: number;
    plan: number;
    used: number;
    usedPct: number;
    isRollover: boolean;
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string | null;
    daysUntilReset?: number;
  };
  plan: {
    name: string;
    tier: string;
  };
}

// Event types for credit stream
type CreditStreamEvent =
  | { type: "connected"; userId: string }
  | { type: "credits:updated"; credits: CreditsData["credits"]; subscription: CreditsData["subscription"]; plan: CreditsData["plan"]; reason: string };

interface UseCreditsStreamOptions {
  /** Called when credits are updated */
  onCreditsUpdated?: (data: CreditsData) => void;
}

/**
 * Subscribe to real-time credit updates via SSE
 * Replaces polling-based refetch with push updates from server
 */
export function useCreditsStream({
  onCreditsUpdated,
}: UseCreditsStreamOptions = {}) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isUnmounted = useRef(false);

  const connect = useCallback(() => {
    if (isUnmounted.current) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/credits/stream");
    eventSourceRef.current = eventSource;

    eventSource.onerror = () => {
      if (isUnmounted.current) return;

      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmounted.current) {
          connect();
        }
      }, delay);
    };

    eventSource.addEventListener("credits:updated", (e) => {
      if (isUnmounted.current) return;

      try {
        const data: CreditStreamEvent = JSON.parse(e.data);
        if (data.type !== "credits:updated") return;

        const creditsData: CreditsData = {
          credits: data.credits,
          subscription: data.subscription,
          plan: data.plan,
        };

        // Update credits query cache directly
        queryClient.setQueryData(["credits"], creditsData);

        // Also invalidate to ensure consistency across all listeners
        queryClient.invalidateQueries({ queryKey: ["credits"] });

        onCreditsUpdated?.(creditsData);
      } catch {
        // Silently ignore parse errors
      }
    });

    eventSource.addEventListener("connected", () => {
      reconnectAttempts.current = 0;
    });
  }, [queryClient, onCreditsUpdated]);

  useEffect(() => {
    isUnmounted.current = false;
    connect();

    return () => {
      isUnmounted.current = true;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
}
