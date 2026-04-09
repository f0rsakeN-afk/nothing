"use client";

import { Sparkles } from "lucide-react";
import { MemoryCard } from "./memory-card";
import type { MemoryItem } from "./memory-modal";

interface MemoryGridProps {
  memories: MemoryItem[];
  searchQuery: string;
  onEdit: (memory: MemoryItem) => void;
  onDelete: (id: string) => void;
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Categories */}
        {categories.length > 0 && !searchQuery.trim() && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <span key={cat} className="px-3 py-1 rounded-full text-xs bg-muted">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        {searchQuery.trim() && (
          <div className="mb-4 text-sm text-muted-foreground">
            {memories.length} results for &quot;{searchQuery}&quot;
          </div>
        )}

        {/* Empty state */}
        {memories.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? "No results" : "No memories yet"}
            </p>
          </div>
        )}

        {/* Grid */}
        {memories.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
