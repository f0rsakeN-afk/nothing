"use client";

import { memo, useCallback } from "react";
import { Trash2, Calendar, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MemoryItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: Date;
}

interface MemoryCardProps {
  memory: MemoryItem;
  onEdit: (memory: MemoryItem) => void;
  onDelete: (id: string) => void;
}

function MemoryCardComponent({ memory, onEdit, onDelete }: MemoryCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleEdit = useCallback(() => {
    onEdit(memory);
  }, [onEdit, memory]);

  const handleDelete = useCallback(() => {
    onDelete(memory.id);
  }, [onDelete, memory.id]);

  return (
    <div className="p-4 rounded-lg border bg-card relative group">
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
        <Button
          type="button"
          onClick={handleEdit}
          className="h-7 w-7"
          variant={"ghost"}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={"destructive"}
          onClick={handleDelete}
          className="h-7 w-7"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {memory.title && (
          <h3 className="text-sm font-semibold tracking-wide text-foreground">
            {memory.title}
          </h3>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {memory.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(memory.createdAt)}</span>
          </div>

          {memory.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              {memory.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const MemoryCard = memo(MemoryCardComponent);
