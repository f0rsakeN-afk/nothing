"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { WebHaptics } from "web-haptics";

interface WebHapticsContextValue {
  haptics: WebHaptics | null;
  isSupported: boolean;
  hapticsEnabled: boolean;
}

const WebHapticsContext = createContext<WebHapticsContextValue>({
  haptics: null,
  isSupported: false,
  hapticsEnabled: true,
});

export function WebHapticsProvider({ children }: { children: React.ReactNode }) {
  const hapticsRef = useRef<WebHaptics | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    hapticsRef.current = new WebHaptics({ debug: false });
    setIsSupported(WebHaptics.isSupported);

    return () => {
      hapticsRef.current?.destroy();
      hapticsRef.current = null;
    };
  }, []);

  // Fetch user's haptics setting
  useEffect(() => {
    const fetchHapticsSetting = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const settings = await res.json();
          setHapticsEnabled(settings.hapticsEnabled ?? true);
        }
      } catch {
        // Default to enabled on error
        setHapticsEnabled(true);
      }
    };

    fetchHapticsSetting();
  }, []);

  return (
    <WebHapticsContext.Provider value={{ haptics: hapticsRef.current, isSupported, hapticsEnabled }}>
      {children}
    </WebHapticsContext.Provider>
  );
}

export function useWebHapticsContext() {
  return useContext(WebHapticsContext);
}
