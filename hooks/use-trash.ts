/**
 * Trash React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TrashItem {
  id: string;
  modelType: "PROJECT" | "CHAT" | "MESSAGE" | "FILE";
  modelId: string;
  data: unknown;
  deletedAt: string;
  deletedBy: string | null;
  reason: string | null;
}

interface TrashListResponse {
  items: TrashItem[];
}

/**
 * Get user's trash items
 */
export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: async (): Promise<TrashListResponse> => {
      const res = await fetch("/api/trash");
      if (!res.ok) throw new Error("Failed to fetch trash");
      return res.json();
    },
  });
}

/**
 * Restore item from trash
 */
export function useRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trashId: string): Promise<{ restored: string[]; orphans: string[] }> => {
      const res = await fetch(`/api/trash/${trashId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to restore item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

/**
 * Permanent delete from trash
 */
export function usePermanentDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trashId: string): Promise<void> => {
      const res = await fetch(`/api/trash/${trashId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to permanently delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
