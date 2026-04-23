import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis, { KEYS, TTL } from '@/lib/redis';
import type { CategoryId, CatalogAuth } from '@/components/apps/catalog-data';
import { logger } from '@/lib/logger';

function serializeCatalogItem(item: {
  id: string;
  name: string;
  category: string;
  url: string;
  authType: string;
  maintainer: string;
  maintainerUrl: string;
  customIcon: string | null;
  isFeatured: boolean;
}) {
  return {
    id: item.id,
    name: item.name,
    category: item.category as CategoryId,
    url: item.url,
    auth: item.authType as CatalogAuth,
    maintainer: item.maintainer,
    maintainerUrl: item.maintainerUrl,
    customIcon: item.customIcon,
    isFeatured: item.isFeatured,
  };
}

export async function GET() {
  try {
    // Try cache first
    try {
      const cached = await redis.get(KEYS.mcpCatalog);
      if (cached) {
        return Response.json({ items: JSON.parse(cached) });
      }
    } catch {
      // Redis error, continue to DB
    }

    const items = await prisma.mcpCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });

    const serialized = items.map(serializeCatalogItem);

    // Cache the result
    try {
      await redis.setex(KEYS.mcpCatalog, TTL.mcpCatalog, JSON.stringify(serialized));
    } catch {
      // Redis error, ignore
    }

    return Response.json({ items: serialized });
  } catch (error) {
    logger.error("[Catalog] Failed to fetch catalog", error as Error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}
