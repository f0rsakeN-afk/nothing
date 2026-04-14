"use client";

import * as React from "react";
import { Search, Loader2, ExternalLink, Clock } from "lucide-react";
import { toast } from "@/components/ui/sileo-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  engine: string;
  publishedDate?: string;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export function SearchDialog({ isOpen, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [cached, setCached] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setHasSearched(true);
    setCached(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setResults(data.results || []);
      setCached(data.cached || false);
    } catch (error) {
      toast.error("Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e);
    }
  }, [handleSearch]);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setCached(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Web Search
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <form onSubmit={handleSearch} className="relative">
            <Input
              ref={inputRef}
              placeholder="Search the web..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-20 h-10"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 h-8 px-3"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>
          {cached && (
            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Cached result
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((result, index) => (
                <a
                  key={`${result.url}-${index}`}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block p-3 rounded-lg border border-transparent",
                    "hover:bg-muted/50 hover:border-border/50",
                    "transition-colors group"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-foreground line-clamp-1 group-hover:text-primary">
                        {result.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {result.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">
                          {result.engine}
                        </span>
                        {result.publishedDate && (
                          <>
                            <span className="text-[9px] text-muted-foreground/30">•</span>
                            <span className="text-[9px] text-muted-foreground/60">
                              {formatTimeAgo(result.publishedDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-primary" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {!hasSearched && !isLoading && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Search the web
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Powered by SearxNG
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
