"use client";

import { useEffect } from "react";
import { useCookieCategory } from "@/hooks/use-cookie-consent";

interface UmamiConfig {
  websiteId: string;
  src?: string;
  autoTrack?: boolean;
  dynamic?: boolean;
}

const DEFAULT_UMAMI_SRC = "https://analytics.eryx.ai/script.js";

export function UmamiScript({ websiteId, src = DEFAULT_UMAMI_SRC, autoTrack = true, dynamic = true }: UmamiConfig) {
  const isAllowed = useCookieCategory("analytics");

  useEffect(() => {
    if (!isAllowed) return;

    // Create script element
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.setAttribute("data-website-id", websiteId);
    script.setAttribute("data-auto-track", autoTrack ? "true" : "false");
    if (dynamic) {
      script.setAttribute("data-dynamic", "true");
    }

    // Add the script to the document
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount or when consent changes
      document.head.removeChild(script);
    };
  }, [isAllowed, websiteId, src, autoTrack, dynamic]);

  return null;
}

// Hook to track custom events
export function useUmamiTrack() {
  const isAllowed = useCookieCategory("analytics");

  return (eventName: string, eventData?: Record<string, string | number | boolean>) => {
    if (!isAllowed) return;

    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(eventName, eventData);
    }
  };
}

// Type declaration for umami object
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, string | number | boolean>) => void;
    };
  }
}

// Simple component to track events
export function UmamiTracker({
  eventName,
  eventData,
  children,
}: {
  eventName: string;
  eventData?: Record<string, string | number | boolean>;
  children: React.ReactNode;
}) {
  const track = useUmamiTrack();

  useEffect(() => {
    track(eventName, eventData);
  }, [eventName, eventData, track]);

  return <>{children}</>;
}
