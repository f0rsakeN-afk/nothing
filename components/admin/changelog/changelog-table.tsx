"use client";

import { useMemo, useCallback, memo } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ChangelogChange {
  type: "feature" | "fix" | "improvement" | "breaking";
  text: string;
}

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  changes: ChangelogChange[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ChangelogFiltersProps {
  search: string;
  isPublished: string;
  total: number;
  onSearchChange: (value: string) => void;
  onPublishedChange: (value: string) => void;
}

const CHANGE_TYPE_STYLES: Record<string, string> = {
  feature: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  fix: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  breaking: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

const ChangelogFilters = memo(function ChangelogFilters({
  search,
  isPublished,
  total,
  onSearchChange,
  onPublishedChange,
}: ChangelogFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or version..."
          className="pl-8"
        />
      </div>

      <Select value={isPublished} onValueChange={(v) => onPublishedChange(v || "")}>
        <SelectTrigger className="h-10 w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="true">Published</SelectItem>
          <SelectItem value="false">Draft</SelectItem>
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground ml-auto">
        {total.toLocaleString()} entr{total !== 1 ? "ies" : "y"}
      </span>
    </div>
  );
});

interface ChangelogRowProps {
  entry: ChangelogEntry;
  onDelete: (id: string) => void;
  onEdit: (entry: ChangelogEntry) => void;
}

const ChangelogRow = memo(function ChangelogRow({ entry, onDelete, onEdit }: ChangelogRowProps) {
  const date = new Date(entry.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{entry.title}</span>
          <span className="text-xs text-muted-foreground max-w-[250px] truncate">
            {entry.description}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs font-mono">
          v{entry.version}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{date}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {entry.changes.slice(0, 3).map((change, i) => (
            <Badge
              key={i}
              variant="outline"
              className={cn("text-[10px] font-medium", CHANGE_TYPE_STYLES[change.type])}
            >
              {change.type}
            </Badge>
          ))}
          {entry.changes.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{entry.changes.length - 3}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={entry.isPublished ? "default" : "secondary"} className="text-xs">
          {entry.isPublished ? "Published" : "Draft"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(entry)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

interface ChangelogTableProps {
  entries: ChangelogEntry[];
  pagination: Pagination;
  search: string;
  isPublished: string;
  onSearchChange: (value: string) => void;
  onPublishedChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: ChangelogEntry) => void;
}

export function ChangelogTable({
  entries,
  pagination,
  search,
  isPublished,
  onSearchChange,
  onPublishedChange,
  onPageChange,
  onDelete,
  onEdit,
}: ChangelogTableProps) {
  const entryRows = useMemo(
    () => entries.map((entry) => <ChangelogRow key={entry.id} entry={entry} onDelete={onDelete} onEdit={onEdit} />),
    [entries, onDelete, onEdit],
  );

  const handlePrevPage = useCallback(() => {
    onPageChange(pagination.page - 1);
  }, [pagination.page, onPageChange]);

  const handleNextPage = useCallback(() => {
    onPageChange(pagination.page + 1);
  }, [pagination.page, onPageChange]);

  return (
    <div className="flex flex-col gap-4">
      <ChangelogFilters
        search={search}
        isPublished={isPublished}
        total={pagination.total}
        onSearchChange={onSearchChange}
        onPublishedChange={onPublishedChange}
      />

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Title</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No changelog entries found
                </TableCell>
              </TableRow>
            ) : (
              entryRows
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={pagination.page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!pagination.hasMore}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}