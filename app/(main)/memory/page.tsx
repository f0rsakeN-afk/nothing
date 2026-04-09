"use client";

import { useState, useCallback } from "react";
import { MemoryHeader } from "@/components/main/memory/memory-header";
import { MemoryGrid } from "@/components/main/memory/memory-grid";
import { MemoryModal } from "@/components/main/memory/memory-modal";
import type { MemoryItem } from "@/components/main/memory/memory-modal";

const DUMMY_MEMORIES: MemoryItem[] = [
  {
    id: "1",
    title: "Project Architecture",
    content:
      "The main backend uses Node.js with Express. PostgreSQL for data, Redis for caching. Frontend is Next.js 16 with TypeScript.",
    category: "work",
    createdAt: new Date("2026-04-01"),
  },
  {
    id: "2",
    title: "Meeting Notes - Q1 Planning",
    content:
      "Focus on three main initiatives: user growth, API improvements, and mobile app. Budget allocated for Q2.",
    category: "work",
    createdAt: new Date("2026-03-28"),
  },
  {
    id: "3",
    title: "Personal Goals 2026",
    content:
      "Learn Rust, run a half marathon, read 24 books. Focus on deep work and reducing meetings.",
    category: "personal",
    createdAt: new Date("2026-03-15"),
  },
  {
    id: "4",
    title: "Technical Preferences",
    content:
      "Prefer functional components in React. Use TypeScript strict mode. API responses should be consistent.",
    category: null,
    createdAt: new Date("2026-03-10"),
  },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>(DUMMY_MEMORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);

  const filteredMemories = searchQuery.trim()
    ? memories.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memories;

  const handleDelete = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleEdit = useCallback((memory: MemoryItem) => {
    setEditingMemory(memory);
    setEditModalOpen(true);
  }, []);

  const handleAdd = useCallback(
    (data: { title: string; content: string; category: string }) => {
      const newMemory: MemoryItem = {
        id: Date.now().toString(),
        title: data.title,
        content: data.content,
        category: data.category || null,
        createdAt: new Date(),
      };
      setMemories((prev) => [newMemory, ...prev]);
    },
    [],
  );

  const handleUpdate = useCallback(
    (data: { title: string; content: string; category: string }) => {
      if (!editingMemory) return;
      setMemories((prev) =>
        prev.map((m) =>
          m.id === editingMemory.id
            ? {
                ...m,
                title: data.title,
                content: data.content,
                category: data.category || null,
              }
            : m,
        ),
      );
      setEditingMemory(null);
    },
    [editingMemory],
  );

  return (
    <div className="flex flex-col h-full max-w-6xl w-full mx-auto">
      <MemoryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => setAddModalOpen(true)}
      />

      <MemoryGrid
        memories={filteredMemories}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
    </div>
  );
}
