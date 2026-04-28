"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveUsers, updatePresence, type ActiveUser } from "@/services/collaboration.service";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useChatPresence(chatId: string | undefined) {
  const [localPresence, setLocalPresence] = useState<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active users with better staleness
  const { data: activeUsers = [], refetch } = useQuery({
    queryKey: ["chat", chatId, "presence"],
    queryFn: () => getActiveUsers(chatId!),
    enabled: !!chatId,
    staleTime: 5000, // 5 seconds - presence needs to be fresh
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    refetchInterval: 10000, // Check every 10 seconds for faster updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Update presence heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!chatId) return;
    try {
      await updatePresence(chatId);
    } catch {
      // Silently fail heartbeat
    }
  }, [chatId]);

  // Start heartbeat on mount
  useEffect(() => {
    if (!chatId) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up heartbeat interval
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [chatId, sendHeartbeat]);

  // Track local user's presence
  useEffect(() => {
    if (!chatId) return;

    const handleVisibility = () => {
      if (document.hidden) {
        // Page hidden, stop heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      } else {
        // Page visible, restart heartbeat
        sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [chatId, sendHeartbeat]);

  return {
    activeUsers,
    refetch,
  };
}