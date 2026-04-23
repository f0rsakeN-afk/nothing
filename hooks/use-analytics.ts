/**
 * Analytics hook - only tracks if analytics consent is given
 * Usage: const { track } = useAnalytics(); track('page_view', { path: '/home' });
 */

import { useCallback } from "react";
import { useCookieCategory } from "./use-cookie-consent";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
}

export function useAnalytics() {
  const canTrack = useCookieCategory("analytics");

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (!canTrack) return;

      // In production, replace with actual analytics (e.g., Segment, Amplitude, Mixpanel)
      // For now, just log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log("[Analytics]", event, properties);
      }

      // Example: Send to your analytics endpoint
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event, properties, timestamp: Date.now() }),
      // }).catch(() => {});
    },
    [canTrack]
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      if (!canTrack) return;
      console.log("[Analytics] Identify", userId, traits);
      // Send to analytics with userId and traits
    },
    [canTrack]
  );

  const page = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      track("page_view", { name, ...properties });
    },
    [track]
  );

  return { track, identify, page, isEnabled: canTrack };
}
