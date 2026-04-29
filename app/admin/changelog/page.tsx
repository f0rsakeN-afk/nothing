"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/components/ui/sileo-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChangelogTable } from "@/components/admin/changelog/changelog-table";
import { ChangelogForm } from "@/components/admin/changelog/changelog-form";
import { useChangelog, useDeleteChangelog, useCreateChangelog, useUpdateChangelog } from "@/hooks/admin/use-admin-changelog";
import type { ChangelogEntry } from "@/services/admin/changelog.service";
import type { ChangelogEntryInput } from "@/lib/validations/changelog.validation";
import { Plus } from "lucide-react";

export default function ChangelogPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isPublished, setIsPublished] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ChangelogEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const filters = {
    search: debouncedSearch || undefined,
    isPublished: isPublished || undefined,
    limit: 20,
  };

  const { data, isLoading, isError, error, refetch } = useChangelog(filters);
  const deleteMutation = useDeleteChangelog();
  const createMutation = useCreateChangelog();
  const updateMutation = useUpdateChangelog();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePublishedChange = useCallback((value: string) => {
    setIsPublished(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const handleEdit = useCallback((entry: ChangelogEntry) => {
    setEditEntry(entry);
    setEditOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Changelog entry deleted" });
        setDeleteId(null);
      },
      onError: (err: Error) => {
        toast.error("Failed to delete", { description: err.message });
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteMutation, toast]);

  const handleCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    async (formData: ChangelogEntryInput) => {
      try {
        await createMutation.mutateAsync(formData as any);
        toast({ title: "Changelog entry created" });
        setCreateOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create";
        toast.error("Failed to create", { description: message });
      }
    },
    [createMutation, toast],
  );

  const handleEditSubmit = useCallback(
    async (formData: ChangelogEntryInput) => {
      if (!editEntry) return;
      try {
        await updateMutation.mutateAsync({ id: editEntry.id, data: formData as any });
        toast({ title: "Changelog entry updated" });
        setEditOpen(false);
        setEditEntry(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update";
        toast.error("Failed to update", { description: message });
      }
    },
    [editEntry, updateMutation, toast],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Changelog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage release notes
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading changelog...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              {error instanceof Error ? error.message : "Failed to load changelog"}
            </p>
            <button onClick={handleRetry} className="text-xs text-primary hover:underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && data && (
        <ChangelogTable
          entries={data.data}
          pagination={{
            page,
            limit: 20,
            total: data.count,
            totalPages: Math.ceil(data.count / 20),
            hasMore: data.hasMore,
          }}
          search={search}
          isPublished={isPublished}
          onSearchChange={handleSearchChange}
          onPublishedChange={handlePublishedChange}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this changelog entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Changelog Entry</DialogTitle>
            <DialogDescription>Create a new release note</DialogDescription>
          </DialogHeader>
          <ChangelogForm onSubmit={handleCreateSubmit} isLoading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditEntry(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Changelog Entry</DialogTitle>
            <DialogDescription>Update this release note</DialogDescription>
          </DialogHeader>
          <ChangelogForm entry={editEntry ?? undefined} onSubmit={handleEditSubmit} isLoading={updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}