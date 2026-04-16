"use client";

import { memo, useMemo } from "react";
import { CatalogCard } from "./catalog-card";
import { FEATURED_NAMES, CategoryId } from "./catalog-data";

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  url: string;
  authType: string;
  maintainer: string;
  maintainerUrl: string;
  customIcon?: string | null;
  isFeatured: boolean;
}

interface CatalogGridProps {
  search: string;
  category: CategoryId;
  connectedUrls: Set<string>;
  addingUrl: string | null;
  items: CatalogItem[];
  onAdd: (item: CatalogItem) => void;
}

export const CatalogGrid = memo(function CatalogGrid({
  search,
  category,
  connectedUrls,
  addingUrl,
  items,
  onAdd,
}: CatalogGridProps) {
  const filtered = useMemo(() => {
    let result = items;

    if (category !== "all") {
      result = result.filter((item) => item.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.maintainer.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      // Featured first
      const aFeatured = FEATURED_NAMES.includes(a.name);
      const bFeatured = FEATURED_NAMES.includes(b.name);
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [search, category, items]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No apps found</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Try adjusting your search or filter
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {filtered.map((item) => (
        <CatalogCard
          key={item.url}
          item={item}
          isConnected={connectedUrls.has(item.url.replace(/\/$/, ""))}
          isAdding={addingUrl === item.url}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
});