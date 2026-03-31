"use client";

import * as React from "react";
import { Search, MessageCircle, Clock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
}

const SEARCH_DATA: SearchResult[] = [
  { id: "1", title: "Architecture Review", subtitle: "This Month" },
  { id: "2", title: "API Design Patterns", subtitle: "This Month" },
  { id: "3", title: "Casual Greeting", subtitle: "This Month" },
  { id: "4", title: "Send Mail", subtitle: "Last 3 Months" },
  { id: "5", title: "Database Schema Design", subtitle: "Last 3 Months" },
  { id: "6", title: "React Performance Tips", subtitle: "Last 3 Months" },
  { id: "7", title: "TypeScript Generics Deep Dive", subtitle: "Older" },
  { id: "8", title: "CSS Grid Layout Exploration", subtitle: "Older" },
  { id: "9", title: "Next.js App Router Migration", subtitle: "Older" },
  { id: "10", title: "Tailwind CSS Best Practices", subtitle: "Older" },
];

// ---------------------------------------------------------------------------
// ResultItem — memoized so re-renders only when item or query changes
// ---------------------------------------------------------------------------

interface ResultItemProps {
  item: SearchResult;
  query: string;
}

const ResultItem = React.memo(function ResultItem({
  item,
  query,
}: ResultItemProps) {
  const lowerTitle = item.title.toLowerCase();
  const matchIdx = query ? lowerTitle.indexOf(query) : -1;

  return (
    <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left   hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
      <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <div className="flex-1 min-w-0">
        {matchIdx !== -1 ? (
          <p className="text-[13px] font-medium text-foreground truncate">
            {item.title.slice(0, matchIdx)}
            <mark className="bg-primary/20 text-primary rounded-sm not-italic">
              {item.title.slice(matchIdx, matchIdx + query.length)}
            </mark>
            {item.title.slice(matchIdx + query.length)}
          </p>
        ) : (
          <p className="text-[13px] font-medium text-foreground truncate">
            {item.title}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          {item.subtitle}
        </p>
      </div>
    </button>
  );
});

// ---------------------------------------------------------------------------
// SearchDialog
// ---------------------------------------------------------------------------

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset query whenever dialog closes
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Auto-focus after mount animation settles
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [open]);

  const handleQueryChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    [],
  );

  const clearQuery = React.useCallback(() => setQuery(""), []);

  // Memoized filter — only recalculates when query changes
  const filteredResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_DATA;
    return SEARCH_DATA.filter((item) => item.title.toLowerCase().includes(q));
  }, [query]);

  // Normalised query passed down to ResultItem (stable reference per keystroke)
  const normalisedQuery = query.trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[22%] translate-y-0 sm:max-w-lg p-0 gap-0 overflow-hidden"
      >
        {/* ── Search input ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground   shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── Results ────────────────────────────────────────────────── */}
        <ScrollArea className="max-h-72">
          <div className="py-1">
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <ResultItem key={item.id} item={item} query={normalisedQuery} />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Search className="h-6 w-6 text-muted-foreground/25" />
                <p className="text-[13px] text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center px-4 py-2 border-t border-border/60">
          <span className="text-[10.5px] text-muted-foreground/50">
            {filteredResults.length} result
            {filteredResults.length !== 1 ? "s" : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
