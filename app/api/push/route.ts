/**
 * Push Notification API
 * POST /api/push/subscribe - Subscribe to push notifications
 * DELETE /api/push/subscribe - Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getVapidPublicKey,
  isPushConfigured,
} from "@/services/push-notification.service";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { rateLimitError, unauthorizedError } from "@/lib/api-response";

/**
 * Get VAPID public key for client
 * GET /api/push
 */
export async function GET(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey: getVapidPublicKey(),
  });
}

/**
 * Subscribe to push notifications
 * POST /api/push
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    await subscribeToPush(user.id, subscription);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

/**
 * Unsubscribe from push notifications
 * DELETE /api/push
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await validateAuth(request);
    if (!user) {
      return unauthorizedError();
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint required" },
        { status: 400 }
      );
    }

    await unsubscribeFromPush(user.id, endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push] Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
