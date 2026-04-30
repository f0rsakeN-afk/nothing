"use client";

import { useState, useCallback, useEffect } from "react";
import { MemoryHeader } from "@/components/main/memory/memory-header";
import { MemoryGrid } from "@/components/main/memory/memory-grid";
import { MemoryModal } from "@/components/main/memory/memory-modal";
import type { MemoryItem } from "@/components/main/memory/memory-modal";
import { useMemory } from "@/hooks/use-memory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MemoryPage() {
  const {
    memories,
    isLoading,
    error,
    addMemory,
    updateMemory,
    deleteMemory,
    searchMemories,
    total,
  } = useMemory();
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemoryItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMemories(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMemories]);

  const handleEdit = useCallback((memory: MemoryItem) => {
    setEditingMemory(memory);
    setEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((memory: MemoryItem) => {
    setDeleteTarget(memory);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMemory(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMemory]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleAdd = useCallback(
    async (data: { title: string; content: string; category: string }) => {
      await addMemory({
        title: data.title,
        content: data.content,
        category: data.category || undefined,
      });
      setAddModalOpen(false);
    },
    [addMemory],
  );

  const handleUpdate = useCallback(
    async (data: { title: string; content: string; category: string }) => {
      if (!editingMemory) return;
      await updateMemory(editingMemory.id, {
        title: data.title,
        content: data.content,
        category: data.category || undefined,
      });
      setEditingMemory(null);
      setEditModalOpen(false);
    },
    [editingMemory, updateMemory],
  );

  return (
    <div className="flex flex-col h-full max-w-6xl w-full mx-auto">
      <MemoryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setAddModalOpen(true)}
      />

      <MemoryGrid
        memories={memories}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <MemoryModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAdd}
      />
      <MemoryModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingMemory(null);
        }}
        onSubmit={handleUpdate}
        memory={editingMemory}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title || "this memory"}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}