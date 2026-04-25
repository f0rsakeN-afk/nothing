"use client";

import React, { memo, useState, useMemo, useCallback } from "react";
import { Globe, ArrowUpRight, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SearchResult } from "./chat-message";

interface WebSearchResultsProps {
  results: SearchResult[];
  query?: string;
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Get favicon URL for a domain - memoized with Map cache
const getFaviconUrl = (() => {
  const cache = new Map<string, string>();
  return (url: string): string => {
    const domain = extractDomain(url);
    if (cache.has(domain)) return cache.get(domain)!;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    cache.set(domain, favicon);
    return favicon;
  };
})();

// Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Search Result Card - optimized
const SearchResultCard = memo(function SearchResultCard({
  result,
}: {
  result: SearchResult;
}) {
  // Memoize domain extraction
  const domain = useMemo(() => extractDomain(result.url), [result.url]);
  const favicon = useMemo(() => getFaviconUrl(result.url), [result.url]);
  const date = useMemo(() => formatDate(result.publishedDate), [result.publishedDate]);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block",
        "rounded-xl p-4 transition-all duration-200",
        "bg-muted/30 hover:bg-muted/50",
        "border border-transparent hover:border-border",
        "min-w-[280px] max-w-[280px]",
      )}
    >
      {/* Title */}
      <h3 className="font-medium text-[13px] text-justify text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
        {result.title}
      </h3>

      {/* Domain and date */}
      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex items-center justify-center gap-2">
          <img
            src={favicon}
            alt=""
            className="w-3.5 h-3.5 rounded-sm opacity-50 shrink-0"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[11px] text-muted-foreground/70 truncate">
            {domain}
          </span>
        </div>
        {date && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[11px] text-muted-foreground/50 shrink-0">
              {date}
            </span>
          </>
        )}
      </div>

      {/* Description */}
      {result.description && (
        <p className="text-[11px] text-justify text-muted-foreground/60 leading-relaxed line-clamp-2">
          {result.description}
        </p>
      )}

      {/* External link indicator */}
      <div className="mt-3 flex items-center gap-1 text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
        <span className="text-[10px]">Visit source</span>
        <ArrowUpRight className="w-3 h-3" />
      </div>
    </a>
  );
});

// All Results Sheet
const AllResultsSheet = memo(function AllResultsSheet({
  results,
  query,
  open,
  onOpenChange,
}: {
  results: SearchResult[];
  query?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Sources</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {results.length} results{query ? ` for "${query}"` : ""}
            </p>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {results.map((result, i) => {
              const domain = useMemo(() => extractDomain(result.url), [result.url]);
              const favicon = useMemo(() => getFaviconUrl(result.url), [result.url]);
              const date = useMemo(() => formatDate(result.publishedDate), [result.publishedDate]);

              return (
                <a
                  key={`${result.url}-${i}`}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group block",
                    "rounded-lg p-4 transition-all duration-200",
                    "bg-card hover:bg-muted/30",
                    "border border-border hover:border-primary/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={favicon}
                      alt=""
                      className="w-4 h-4 mt-0.5 rounded opacity-50 shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
                        {result.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px] text-muted-foreground/70 truncate">
                          {domain}
                        </span>
                        {date && (
                          <>
                            <span className="text-muted-foreground/30 shrink-0">
                              ·
                            </span>
                            <span className="text-[11px] text-muted-foreground/50 shrink-0">
                              {date}
                            </span>
                          </>
                        )}
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

// Main WebSearchResults Component
export const WebSearchResults = memo(function WebSearchResults({
  results,
  query,
}: WebSearchResultsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const openAllResults = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleViewAllKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
      setSheetOpen(true);
    }
  }, []);

  if (!results || results.length === 0) {
    return null;
  }

  const displayResults = results.slice(0, 5);

  return (
    <div className="w-full my-4">
      {/* Compact header bar - clickable toggle */}
      <button
        type="button"
        onClick={toggleExpanded}
        className={cn(
          "flex items-center justify-between w-full",
          "px-4 py-2.5 rounded-t-lg",
          "bg-muted/40 border border-border/50",
          "transition-colors duration-200",
          "hover:bg-muted/60 cursor-pointer",
          !isExpanded && "rounded-b-lg border-b-0",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "p-1.5 rounded-md",
              "bg-primary/10 dark:bg-primary/20",
            )}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">
            Web Search
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-full text-[11px] px-2 py-0.5 font-medium bg-primary/10 text-primary"
          >
            {results.length} sources
          </Badge>
          {results.length > 5 && (
            <span
              role="button"
              tabIndex={0}
              className="h-6 px-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={openAllResults}
              onKeyDown={handleViewAllKeyDown}
            >
              View all
              <ArrowUpRight className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Results row - collapsible */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 bg-muted/20 border border-border/50 rounded-b-lg">
          {/* Query badge */}
          {query && (
            <div className="mb-3 flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full text-[11px] px-2.5 py-0.5 flex items-center gap-1.5 text-muted-foreground"
              >
                <Search className="w-3 h-3" />
                <span>{query}</span>
              </Badge>
            </div>
          )}

          {/* Horizontal scroll of result cards */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {displayResults.map((result, i) => (
              <SearchResultCard
                key={`${result.url}-${i}`}
                result={result}
              />
            ))}
          </div>
        </div>
      </div>

      {/* All Results Sheet */}
      <AllResultsSheet
        results={results}
        query={query}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
});