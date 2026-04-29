import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChangelogEntries,
  getChangelogEntry,
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
  type ChangelogFilter,
} from "@/services/admin/changelog.service";

export function useChangelog(filter: ChangelogFilter = {}) {
  return useQuery({
    queryKey: ["admin", "changelog", filter],
    queryFn: () => getChangelogEntries({ ...filter, includeUnpublished: true }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useChangelogEntry(id: string) {
  return useQuery({
    queryKey: ["admin", "changelog", id],
    queryFn: () => getChangelogEntry(id),
    enabled: !!id,
  });
}

export function useCreateChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChangelogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] });
      queryClient.refetchQueries({ queryKey: ["admin", "changelog"] });
    },
  });
}

export function useUpdateChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateChangelogEntry>[1] }) =>
      updateChangelogEntry(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "changelog", id] });
      queryClient.refetchQueries({ queryKey: ["admin", "changelog"] });
      queryClient.refetchQueries({ queryKey: ["admin", "changelog", id] });
    },
  });
}

export function useDeleteChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChangelogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "changelog"] });
      queryClient.refetchQueries({ queryKey: ["admin", "changelog"] });
    },
  });
}