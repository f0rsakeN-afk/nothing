/**
 * Notification Service
 * Handles creating and managing notifications
 * Publishes to Redis Pub/Sub for real-time SSE updates
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL, CHANNELS } from "@/lib/redis";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  description: string;
  accent?: string;
}

/**
 * Create a new notification and push to SSE subscribers
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string }> {
  const { userId, title, description, accent = "bg-blue-400" } = params;

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      description,
      accent,
    },
  });

  // Invalidate notifications cache
  try {
    await redis.del(KEYS.userNotifications(userId));
  } catch {
    // Redis error, ignore
  }

  // Publish to Redis for real-time SSE subscribers
  try {
    const channel = CHANNELS.notifications(userId);
    const payload = JSON.stringify({
      type: "notification:created",
      timestamp: new Date().toISOString(),
      notification: {
        id: notification.id,
        title: notification.title,
        description: notification.description,
        read: false,
        archived: false,
        snoozed: false,
        accent: notification.accent,
        time: "Just now",
      },
    });
    await redis.publish(channel, payload);
  } catch {
    // Redis publish error, ignore
  }

  return { id: notification.id };
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const now = new Date();
  return prisma.notification.count({
    where: {
      userId,
      read: false,
      archived: false,
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  // Invalidate cache
  try {
    await redis.del(KEYS.userNotifications(userId));
  } catch {
    // Redis error, ignore
  }

  // Publish to SSE
  try {
    const channel = CHANNELS.notifications(userId);
    await redis.publish(
      channel,
      JSON.stringify({
        type: "notification:updated",
        timestamp: new Date().toISOString(),
        notification: {
          id: notification.id,
          read: true,
        },
      })
    );
  } catch {
    // Ignore
  }
}
