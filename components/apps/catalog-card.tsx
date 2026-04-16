"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ServiceIcon } from "./service-icon";
import { CATEGORIES } from "./catalog-data";

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

interface CatalogCardProps {
  item: CatalogItem;
  isConnected: boolean;
  isAdding: boolean;
  onAdd: (item: CatalogItem) => void;
}

export const CatalogCard = memo(function CatalogCard({
  item,
  isConnected,
  isAdding,
  onAdd,
}: CatalogCardProps) {
  const catLabel = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
  const authLabel = item.authType === "oauth" ? "OAuth" : item.authType === "apikey" ? "API Key" : "Free";

  return (
    <Card className="shadow-none bg-card/50 border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all duration-200 h-full flex flex-col rounded-xl group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="size-8 flex items-center justify-center overflow-hidden shrink-0">
            <ServiceIcon
              url={item.maintainerUrl}
              name={item.name}
              size={24}
              customIcon={item.customIcon ?? null}
            />
          </div>
          {isConnected ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Added
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(item)}
              disabled={isAdding}
              aria-label={`Add ${item.name}`}
              className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors disabled:opacity-50 px-2 py-1 rounded-md hover:bg-muted"
            >
              {isAdding ? <Loader2 className="size-3 animate-spin" /> : null}
              {isAdding ? "Adding" : "Add"}
            </button>
          )}
        </div>
        <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1 mt-2 ml-1">
          {item.name}
        </CardTitle>
      </CardHeader>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5 mt-auto">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {catLabel}
        </Badge>
        <Badge
          variant={item.authType === "open" ? "secondary" : "outline"}
          className="text-[10px] px-1.5 py-0"
        >
          {authLabel}
        </Badge>
      </div>
    </Card>
  );
});