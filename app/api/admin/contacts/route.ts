/**
 * GET /api/admin/contacts - List contact submissions
 * DELETE /api/admin/contacts/[id] - Delete contact submission
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { validateAuth, isAdminOrModerator } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";

const CONTACTS_CACHE_TTL = 60;

async function getContactsCacheKey(search?: string, topic?: string, page?: number, limit?: number): Promise<string> {
  return `admin:contacts:${search || "all"}:${topic || "all"}:${page || 1}:${limit || 20}`;
}

async function getCachedContacts(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }
  return null;
}

async function setContactsCache(cacheKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    await redis.setex(cacheKey, CONTACTS_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }
}

async function invalidateContactsCache(): Promise<void> {
  try {
    const keys = await redis.keys("admin:contacts:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const topic = searchParams.get("topic") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    logAuditEvent({ action: "ADMIN_CONTACTS_LIST", userId: user.id, metadata: { search, topic, page }, request });

    // Try cache
    const cacheKey = await getContactsCacheKey(search, topic, page, limit);
    const cached = await getCachedContacts(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (topic) {
      where.topic = topic;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: contacts,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };

    await setContactsCache(cacheKey, response);

    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Admin contacts list error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to fetch contacts" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdminOrModerator(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin or moderator role required" } },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { type: "invalid_request", message: "Contact ID required" } },
        { status: 400 },
      );
    }

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: { type: "not_found", message: "Contact not found" } },
        { status: 404 },
      );
    }

    await prisma.contact.delete({ where: { id } });

    logAuditEvent({
      action: "ADMIN_CONTACT_DELETE",
      userId: user.id,
      metadata: { contactId: id },
      request,
    });

    await invalidateContactsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete contact error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to delete contact" } },
      { status: 500 },
    );
  }
}