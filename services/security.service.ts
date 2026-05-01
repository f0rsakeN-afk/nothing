/**
 * Security Service
 * Device fingerprinting, request signing, and anomaly detection
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import redis, { KEYS } from "@/lib/redis";
import { withCircuitBreaker } from "@/lib/redis-resilience";

const SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || "eryx-signing-secret-change-in-production";

// Device fingerprinting
export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  ip: string;
}

// Anomaly detection
export interface AnomalyAlert {
  type: "multi_account_device" | "suspicious_location" | "rate_anomaly" | "auth_pattern";
  severity: "low" | "medium" | "high" | "critical";
  deviceId: string;
  userIds: string[];
  details: string;
  detectedAt: Date;
}

/**
 * Generate device fingerprint from request headers
 */
export function generateDeviceFingerprint(request: NextRequest | Request): string {
  const ua = request.headers.get("user-agent") || "unknown";
  const acceptLang = request.headers.get("accept-language") || "";
  const acceptEnc = request.headers.get("accept-encoding") || "";
  const ip = getClientIP(request);

  // Create a hash of the device characteristics
  const raw = `${ip}|${ua}|${acceptLang}|${acceptEnc}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Extract client IP from request
 */
export function getClientIP(request: NextRequest | Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Register device for a user and check for anomalies
 */
export async function registerDeviceForUser(
  userId: string,
  request: NextRequest | Request
): Promise<{ deviceId: string; isNewDevice: boolean; anomaly: AnomalyAlert | null }> {
  const fingerprint = generateDeviceFingerprint(request);
  const ip = getClientIP(request);
  const key = KEYS.deviceFingerprint(fingerprint);

  return withCircuitBreaker(
    "security",
    async () => {
      // Get existing device data
      const existing = await redis.get(key);
      let deviceData: { userIds: string[]; lastSeen: number; firstSeen: number };

      if (existing) {
        deviceData = JSON.parse(existing);
        deviceData.lastSeen = Date.now();

        // Check if user already registered on this device
        const isKnownUser = deviceData.userIds.includes(userId);

        if (!isKnownUser) {
          deviceData.userIds.push(userId);

          // Check for anomaly: same device used by many accounts
          if (deviceData.userIds.length > 3) {
            // Potential account sharing or credential stuffing
            const anomaly: AnomalyAlert = {
              type: "multi_account_device",
              severity: deviceData.userIds.length > 5 ? "high" : "medium",
              deviceId: fingerprint,
              userIds: deviceData.userIds,
              details: `Device used by ${deviceData.userIds.length} different accounts`,
              detectedAt: new Date(),
            };

            // Log anomaly
            await logAnomaly(anomaly);

            // Still allow the request, but flag it
            await redis.setex(key, 60 * 60 * 24 * 7, JSON.stringify(deviceData)); // 7 days
            return { deviceId: fingerprint, isNewDevice: false, anomaly };
          }
        }

        await redis.setex(key, 60 * 60 * 24 * 7, JSON.stringify(deviceData)); // 7 days TTL
        return { deviceId: fingerprint, isNewDevice: false, anomaly: null };
      } else {
        // New device
        deviceData = {
          userIds: [userId],
          lastSeen: Date.now(),
          firstSeen: Date.now(),
        };
        await redis.setex(key, 60 * 60 * 24 * 7, JSON.stringify(deviceData)); // 7 days TTL
        return { deviceId: fingerprint, isNewDevice: true, anomaly: null };
      }
    },
    { deviceId: fingerprint, isNewDevice: false, anomaly: null }
  );
}

/**
 * Log security anomaly
 */
async function logAnomaly(anomaly: AnomalyAlert): Promise<void> {
  const key = KEYS.anomalyLog(anomaly.type);
  await withCircuitBreaker(
    "security",
    async () => {
      const data = JSON.stringify(anomaly);
      await redis.zadd(key, Date.now(), data);
      // Also publish for real-time alerting
      await redis.publish("security:anomaly", data);
    },
    undefined
  );
}

/**
 * Get anomalies for a user
 */
export async function getUserAnomalies(userId: string): Promise<AnomalyAlert[]> {
  return withCircuitBreaker(
    "security",
    async () => {
      const anomalies: AnomalyAlert[] = [];
      const types: AnomalyAlert["type"][] = ["multi_account_device", "suspicious_location", "rate_anomaly", "auth_pattern"];

      for (const type of types) {
        const key = KEYS.anomalyLog(type);
        const allAnomalies = await redis.zrange(key, 0, -1);

        for (const data of allAnomalies) {
          try {
            const anomaly = JSON.parse(data) as AnomalyAlert;
            if (anomaly.userIds.includes(userId)) {
              anomalies.push(anomaly);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      return anomalies;
    },
    []
  );
}

// Request signing
export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a request signature
 */
export function generateRequestSignature(
  method: string,
  pathname: string,
  timestamp: number,
  nonce: string,
  bodyHash?: string
): string {
  const data = `${method}|${pathname}|${timestamp}|${nonce}${bodyHash ? `|${bodyHash}` : ""}`;
  return crypto.createHmac("sha256", SIGNING_SECRET).update(data).digest("hex");
}

/**
 * Verify a request signature
 */
export function verifyRequestSignature(
  method: string,
  pathname: string,
  timestamp: number,
  nonce: string,
  signature: string,
  bodyHash?: string
): boolean {
  // Check timestamp is within 5 minutes
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return false; // Timestamp too old or in future
  }

  // Generate expected signature
  const expected = generateRequestSignature(method, pathname, timestamp, nonce, bodyHash);

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Hash request body for signing
 */
export function hashRequestBody(body: string | null): string | undefined {
  if (!body) return undefined;
  return crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
}

/**
 * Create a signed request (for internal service calls)
 */
export function createSignedHeaders(
  method: string,
  pathname: string,
  body?: string
): Record<string, string> {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString("hex");
  const bodyHash = hashRequestBody(body || null);
  const signature = generateRequestSignature(method, pathname, timestamp, nonce, bodyHash);

  return {
    "x-request-signature": signature,
    "x-request-timestamp": timestamp.toString(),
    "x-request-nonce": nonce,
    ...(bodyHash && { "x-request-body-hash": bodyHash }),
  };
}

/**
 * Verify signed request headers
 */
export async function verifySignedRequest(
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  const signature = request.headers.get("x-request-signature");
  const timestamp = request.headers.get("x-request-timestamp");
  const nonce = request.headers.get("x-request-nonce");
  const bodyHash = request.headers.get("x-request-body-hash");

  if (!signature || !timestamp || !nonce) {
    return { valid: false, error: "Missing signature headers" };
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, error: "Invalid timestamp" };
  }

  // Check nonce hasn't been used (replay attack prevention)
  const nonceKey = KEYS.requestNonce(nonce);
  try {
    const existing = await redis.get(nonceKey);
    if (existing) {
      return { valid: false, error: "Nonce already used" };
    }
    // Store nonce with 5 minute expiry
    await redis.setex(nonceKey, 300, "1");
  } catch {
    // Redis error, continue with verification
  }

  const method = request.method;
  const pathname = request.nextUrl.pathname;

  const valid = verifyRequestSignature(
    method,
    pathname,
    timestampNum,
    nonce,
    signature,
    bodyHash || undefined
  );

  if (!valid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

/**
 * Get device history for a user
 */
export async function getUserDevices(userId: string): Promise<Array<{
  deviceId: string;
  lastSeen: Date;
  userCount: number;
}>> {
  return withCircuitBreaker(
    "security",
    async () => {
      const devices: Array<{ deviceId: string; lastSeen: Date; userCount: number }> = [];
      let cursor = "0";
      const allKeys: string[] = [];

      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "device:*", "COUNT", "100");
        cursor = nextCursor;
        allKeys.push(...keys);
      } while (cursor !== "0" && allKeys.length < 1000);

      for (const key of allKeys) {
        const data = await redis.get(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.userIds.includes(userId)) {
              const deviceId = key.replace("device:", "");
              devices.push({
                deviceId,
                lastSeen: new Date(parsed.lastSeen),
                userCount: parsed.userCount,
              });
            }
          } catch {
            // Skip invalid data
          }
        }
      }

      return devices;
    },
    []
  );
}

/**
 * Calculate risk score for a request
 */
export async function calculateRequestRiskScore(
  userId: string,
  request: NextRequest
): Promise<{ score: number; factors: string[] }> {
  let score = 0;
  const factors: string[] = [];

  try {
    const fingerprint = generateDeviceFingerprint(request);
    const deviceKey = KEYS.deviceFingerprint(fingerprint);
    const existing = await withCircuitBreaker("security", () => redis.get(deviceKey), null);

    if (existing) {
      const data = JSON.parse(existing);

      // Multiple accounts on same device
      if (data.userIds.length > 2) {
        score += (data.userIds.length - 2) * 10;
        factors.push(`multi_account_device:${data.userIds.length}`);
      }

      // Check for recent anomalies
      const anomalies = await getUserAnomalies(userId);
      const recentAnomalies = anomalies.filter(
        a => Date.now() - new Date(a.detectedAt).getTime() < 60 * 60 * 1000 // Last hour
      );

      for (const anomaly of recentAnomalies) {
        score += anomaly.severity === "critical" ? 50 :
                 anomaly.severity === "high" ? 30 :
                 anomaly.severity === "medium" ? 15 : 5;
        factors.push(`anomaly:${anomaly.type}`);
      }
    } else {
      // New device
      score += 5;
      factors.push("new_device");
    }

    // Check IP against known suspicious IPs
    const ip = getClientIP(request);
    const ipKey = KEYS.suspiciousIP(ip);
    const ipFlags = await withCircuitBreaker("security", () => redis.get(ipKey), null);
    if (ipFlags) {
      score += 20;
      factors.push("suspicious_ip");
    }

    // Auth failure pattern
    const authBackoffKey = KEYS.authFailures(ip);
    const authFailures = await withCircuitBreaker("auth", () => redis.get(authBackoffKey), null);
    if (authFailures && parseInt(authFailures) > 3) {
      score += 15;
      factors.push("auth_failure_pattern");
    }

  } catch (error) {
    console.error("Risk calculation error:", error);
  }

  // Cap at 100
  score = Math.min(100, score);

  return { score, factors };
}