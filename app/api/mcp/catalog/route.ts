import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { CategoryId, CatalogAuth } from '@/components/apps/catalog-data';

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
    const items = await prisma.mcpCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });

    return Response.json({ items: items.map(serializeCatalogItem) });
  } catch (error) {
    console.error('Failed to fetch catalog:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}
