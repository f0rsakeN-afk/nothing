"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface NotificationData {
  id: string;
  title: string;
  description: string;
  read: boolean;
  archived: boolean;
  snoozed: boolean;
  accent: string;
  createdAt: string;
}

// Event types for notification stream
type NotificationStreamEvent =
  | { type: "connected"; userId: string }
  | { type: "notification:created"; notification: NotificationData }
  | { type: "notification:updated"; id: string; read?: boolean; archived?: boolean; snoozed?: boolean }
  | { type: "notifications:bulk"; action: "read-all" };

interface UseNotificationStreamOptions {
  /** Called when a new notification arrives */
  onNewNotification?: (notification: NotificationData) => void;
  /** Called when notifications are bulk-updated (e.g., read-all) */
  onBulkUpdate?: (action: string) => void;
}

/**
 * Subscribe to real-time notification updates
 * Shows toast notifications and updates badge counts
 */
export function useNotificationStream({
  onNewNotification,
  onBulkUpdate,
}: UseNotificationStreamOptions = {}) {
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

    const eventSource = new EventSource("/api/notifications/stream");
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

    eventSource.addEventListener("notification:created", (e) => {
      if (isUnmounted.current) return;

      try {
        const data: NotificationStreamEvent = JSON.parse(e.data);
        if (data.type !== "notification:created") return;

        const notification = data.notification;

        // Update notifications cache - prepend new notification
        queryClient.setQueryData(
          ["notifications"],
          (old: { notifications: NotificationData[] } | undefined) => {
            if (!old) return { notifications: [notification] };
            // Avoid duplicate
            if (old.notifications.some((n) => n.id === notification.id)) {
              return old;
            }
            return {
              ...old,
              notifications: [notification, ...old.notifications],
            };
          }
        );

        // Update unread count
        queryClient.setQueryData(
          ["notifications", "unread-count"],
          (old: number | undefined) => (old ?? 0) + 1
        );

        // Call callback for toast etc
        onNewNotification?.(notification);
      } catch {
        // Silently ignore parse errors
      }
    });

    eventSource.addEventListener("notification:updated", (e) => {
      if (isUnmounted.current) return;

      try {
        const data: NotificationStreamEvent = JSON.parse(e.data);
        if (data.type !== "notification:updated") return;

        // Update notification in cache
        queryClient.setQueryData(
          ["notifications"],
          (old: { notifications: NotificationData[] } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              notifications: old.notifications.map((n) =>
                n.id === data.id
                  ? {
                      ...n,
                      read: data.read ?? n.read,
                      archived: data.archived ?? n.archived,
                      snoozed: data.snoozed ?? n.snoozed,
                    }
                  : n
              ),
            };
          }
        );

        // Update unread count if marked as read
        if (data.read) {
          queryClient.setQueryData(
            ["notifications", "unread-count"],
            (old: number | undefined) => Math.max((old ?? 1) - 1, 0)
          );
        }
      } catch {
        // Silently ignore parse errors
      }
    });

    eventSource.addEventListener("notifications:bulk", (e) => {
      if (isUnmounted.current) return;

      try {
        const data: NotificationStreamEvent = JSON.parse(e.data);
        if (data.type !== "notifications:bulk") return;

        if (data.action === "read-all") {
          // Mark all as read in cache
          queryClient.setQueryData(
            ["notifications"],
            (old: { notifications: NotificationData[] } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                notifications: old.notifications.map((n) => ({ ...n, read: true })),
              };
            }
          );
          queryClient.setQueryData(
            ["notifications", "unread-count"],
            0
          );
        }

        onBulkUpdate?.(data.action);
      } catch {
        // Silently ignore parse errors
      }
    });

    eventSource.addEventListener("connected", () => {
      reconnectAttempts.current = 0;
    });
  }, [queryClient, onNewNotification, onBulkUpdate]);

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