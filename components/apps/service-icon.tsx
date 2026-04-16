"use client";

import { getMcpCatalogIcon, MCP_COMPONENT_ICON_URLS } from "@/lib/mcp/catalog-icons";
import { faviconUrl } from "./catalog-data";

interface ServiceIconProps {
  url: string;
  name: string;
  size?: number;
  customIcon?: string | null;
}

export function ServiceIcon({ url, name, size = 24, customIcon }: ServiceIconProps) {
  const checkUrl = url.replace(/\/+$/, "");
  if (MCP_COMPONENT_ICON_URLS.has(checkUrl)) {
    return <div className="size-6 rounded bg-muted" />;
  }
  const src = customIcon || getMcpCatalogIcon(url) || faviconUrl(url);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="object-contain rounded"
      loading="lazy"
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground/70"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}