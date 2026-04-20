/**
 * Push Notification Service
 * Handles web push notifications using VAPID protocol
 *
 * Flow:
 * 1. Client generates push subscription (pushManager.subscribe())
 * 2. Client sends subscription to /api/push/subscribe
 * 3. Server stores subscription in database
 * 4. Server can then send push notifications via sendPushNotification()
 */

import webpush, { type PushSubscription } from "web-push";
import prisma from "@/lib/prisma";

// VAPID keys - generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:notify@eryx.ai";

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredPushSubscription extends PushSubscription {
  userId: string;
  createdAt: Date;
}

/**
 * Get the VAPID public key for client subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  // Store subscription in database
  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId,
        endpoint: subscription.endpoint,
      },
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(
  userId: string,
  endpoint: string
): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: {
      userId,
      endpoint,
    },
  });
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  return subs.map((sub) => ({
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  }));
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getUserPushSubscriptions(userId);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || "/icon-192.png",
    badge: notification.badge || "/badge-72.png",
    tag: notification.tag || "eryx-notification",
    data: notification.data,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub as PushSubscription, payload).catch((err: unknown) => {
        console.error("[Push] Failed to send:", err);
        return err;
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Clean up invalid subscriptions
  if (failed > 0) {
    const invalidEndpoints = subscriptions
      .filter((_, i) => results[i].status === "rejected")
      .map((sub) => sub.endpoint);

    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: { in: invalidEndpoints },
      },
    });
  }

  return { sent, failed };
}

/**
 * Notify user of new message (when they're not viewing the chat)
 */
export async function notifyNewMessage(
  userId: string,
  chatId: string,
  messagePreview: string,
  senderName: string
): Promise<{ sent: number; failed: number }> {
  return sendPushNotification(userId, {
    title: senderName,
    body: messagePreview.slice(0, 100),
    icon: "/icon-192.png",
    tag: `chat:${chatId}`,
    data: {
      type: "new_message",
      chatId,
    },
  });
}

/**
 * Notify user that AI is typing (for long responses)
 */
export async function notifyAITyping(
  userId: string,
  chatId: string
): Promise<{ sent: number; failed: number }> {
  return sendPushNotification(userId, {
    title: "Eryx is thinking...",
    body: "Your AI assistant is preparing a response",
    tag: `typing:${chatId}`,
    data: {
      type: "ai_typing",
      chatId,
    },
  });
}
