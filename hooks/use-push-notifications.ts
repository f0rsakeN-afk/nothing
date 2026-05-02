"use client";

import { useEffect, useCallback, useState } from "react";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  pushPermission: NotificationPermission | null;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook to manage push notification subscription
 * Registers the service worker and subscribes to push notifications
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Get existing subscription
  const checkSubscription = useCallback(async () => {
    if (!registration) return;

    try {
      const existingSubscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!existingSubscription);
    } catch {
      setIsSubscribed(false);
    }
  }, [registration]);

  // Initialize service worker and check subscription
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    // Check current permission
    if (Notification.permission) {
      setPushPermission(Notification.permission);
    }

    // Register service worker
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
        return reg;
      })
      .then((reg) => {
        // Check if already subscribed
        return reg.pushManager.getSubscription();
      })
      .then((subscription) => {
        setIsSubscribed(!!subscription);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[Push] Service worker registration failed:", err);
        setError("Failed to register service worker");
        setIsLoading(false);
      });
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!registration) {
      setError("Service worker not registered");
      return;
    }

    if (!isSupported) {
      setError("Push notifications not supported");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        setError("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get VAPID public key from server
      const response = await fetch("/api/push");
      if (!response.ok) {
        throw new Error("Failed to get VAPID public key");
      }

      const { publicKey } = await response.json();
      if (!publicKey) {
        throw new Error("Push notifications not configured on server");
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to server
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: (subscription as unknown as { keys: { p256dh: string; auth: string } }).keys.p256dh,
          auth: (subscription as unknown as { keys: { p256dh: string; auth: string } }).keys.auth,
        },
      };

      const saveResponse = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscriptionData }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save push subscription");
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setIsLoading(false);
    }
  }, [registration, isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) {
      setError("Service worker not registered");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        setIsLoading(false);
        return;
      }

      // Get endpoint to send to server
      const endpoint = subscription.endpoint;

      // Unsubscribe from push
      await subscription.unsubscribe();

      // Tell server to remove subscription
      const response = await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        console.warn("[Push] Server subscription deletion may have failed");
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    pushPermission,
    error,
    subscribe,
    unsubscribe,
  };
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
