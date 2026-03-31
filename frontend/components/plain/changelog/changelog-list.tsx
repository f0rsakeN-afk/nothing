"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { ChangelogEntry, ChangeType } from "@/types/changelog";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<ChangeType, string> = {
  feature: "bg-primary text-primary-foreground",
  improvement: "bg-muted text-foreground border border-border",
  fix: "bg-muted text-muted-foreground border border-border",
  breaking: "bg-destructive text-destructive-foreground",
};

const TAG_LABEL: Record<ChangeType, string> = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
  breaking: "Breaking",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function matchesQuery(entry: ChangelogEntry, q: string): boolean {
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.version.includes(q) ||
    entry.changes.some((c) => c.text.toLowerCase().includes(q))
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChangelogListProps {
  entries: ChangelogEntry[];
}

export function ChangelogList({ entries }: ChangelogListProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global "/" keybind — focuses search unless user is already in an input
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || target.isContentEditable)
      return;
    if (e.key === "/") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Escape clears query and blurs
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    [],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => matchesQuery(entry, q));
  }, [entries, query]);

  const isSearching = query.trim().length > 0;
  const showKbdHint = !focused && !isSearching;

  return (
    <div>
      {/* Search row */}
      <div className="flex items-center gap-3 mb-10">
        <div className="relative w-full sm:w-80">
          {/* Left icon */}
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search releases, features, fixes…"
            className="pl-8 pr-16"
            aria-label="Search changelog"
          />

          {/* Right side — Kbd hint or clear button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {isSearching ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleClear}
                aria-label="Clear search"
                className="h-5 w-5"
              >
                <X className="w-3 h-3" />
              </Button>
            ) : (
              <span
                className={`transition-opacity duration-150 ${showKbdHint ? "opacity-100" : "opacity-0"}`}
              >
                <Kbd>/</Kbd>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Result count */}
      {isSearching && (
        <p className="text-xs text-muted-foreground -mt-6 mb-8">
          {filteredEntries.length === 0
            ? "No releases matched."
            : `${filteredEntries.length} release${filteredEntries.length === 1 ? "" : "s"} found`}
        </p>
      )}

      {/* Timeline */}
      {filteredEntries.length > 0 ? (
        <div className="relative">
          <div className="absolute left-0 top-2 bottom-0 w-px bg-border hidden lg:block" />

          <ol className="flex flex-col gap-12 lg:gap-14">
            {filteredEntries.map((entry) => (
              <li key={entry.version} className="lg:pl-10 relative">
                <div className="absolute -left-[4.5px] top-2 h-2.5 w-2.5 rounded-full bg-foreground border-2 border-background hidden lg:block" />

                <article>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-foreground tracking-tight">
                      v{entry.version}
                    </span>
                    <time
                      dateTime={entry.date}
                      className="text-xs text-muted-foreground/70"
                    >
                      {formatDate(entry.date)}
                    </time>
                  </div>

                  <h2 className="text-base font-semibold text-foreground tracking-tight mb-1.5">
                    {entry.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {entry.description}
                  </p>

                  <ul className="flex flex-col gap-2.5">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className={`mt-px shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${TAG_STYLES[change.type]}`}
                        >
                          {TAG_LABEL[change.type]}
                        </span>
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {change.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <Search className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">
            Try a version number, feature name, or keyword.
          </p>
          <button
            onClick={handleClear}
            className="mt-1 text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground  "
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
