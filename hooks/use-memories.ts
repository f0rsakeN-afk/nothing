'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MemoryItem } from '@/services/memory.service';

interface MemoryResponse {
  memories: MemoryItem[];
  total: number;
}

export function useMemories() {
  const queryClient = useQueryClient();

  // Get all memories
  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['memories'],
    queryFn: async (): Promise<MemoryResponse> => {
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error('Failed to fetch memories');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Search memories
  const searchMutation = useMutation({
    mutationFn: async (query: string): Promise<MemoryResponse> => {
      const res = await fetch(`/api/memory?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search memories');
      return res.json();
    },
  });

  // Add memory
  const addMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; tags?: string[]; category?: string }): Promise<MemoryItem> => {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add memory');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });

  // Delete memory
  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string): Promise<void> => {
      const res = await fetch(`/api/memory?id=${memoryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete memory');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });

  return {
    memories: data?.memories || [],
    total: data?.total || 0,
    isLoading,
    refetch,
    searchMemories: searchMutation.mutate,
    searchResults: searchMutation.data,
    isSearching: searchMutation.isPending,
    addMemory: addMutation.mutate,
    isAdding: addMutation.isPending,
    deleteMemory: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
