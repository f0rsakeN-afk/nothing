"use client";

import { Brain, SearchX } from "lucide-react";
import { MemoryCard } from "./memory-card";
import type { MemoryItem } from "./memory-modal";

interface MemoryGridProps {
  memories: MemoryItem[];
  searchQuery: string;
  onEdit: (memory: MemoryItem) => void;
  onDelete: (memory: MemoryItem) => void;
}

export function MemoryGrid({
  memories,
  searchQuery,
  onEdit,
  onDelete,
}: MemoryGridProps) {
  const categories = [
    ...new Set(memories.map((m) => m.category).filter(Boolean)),
  ];

  const isSearchResult = searchQuery.trim().length > 0;
  const isEmpty = memories.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Categories */}
        {categories.length > 0 && !isSearchResult && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Empty state */}
        {memories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              {isSearchResult ? (
                <SearchX className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Brain className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {isSearchResult ? "No results found" : "No memories yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSearchResult
                ? `No memories matching "${searchQuery}"`
                : "Your AI memories will appear here"}
            </p>
          </div>
        )}

        {/* Results count */}
        {!isEmpty && isSearchResult && (
          <div className="mb-4 text-xs text-muted-foreground">
            {memories.length} result{memories.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </div>
        )}

        {/* Grid */}
        {!isEmpty && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={onEdit}
                onDelete={() => onDelete(memory)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}