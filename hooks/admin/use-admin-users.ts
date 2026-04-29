"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole, deactivateUser, reactivateUser, type UsersFilter } from "@/services/admin/users.service";

export function useAdminUsers(filters: UsersFilter) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => getUsers(filters),
    staleTime: 30000, // 30s - data is relatively fresh
    gcTime: 60000, // keep in cache for 60s
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "USER" | "MODERATOR" | "ADMIN" }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}