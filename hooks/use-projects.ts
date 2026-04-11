/**
 * Projects React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, ProjectListResponse } from "@/types/project";
import {
  getProjects,
  getArchivedProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
  pinProject,
  unpinProject,
  type CreateProjectParams,
  type UpdateProjectParams,
} from "@/services/project.service";

/**
 * Get user's projects
 */
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<ProjectListResponse> => {
      return getProjects();
    },
    retry: 1,
  });
}

/**
 * Get archived projects
 */
export function useArchivedProjects() {
  return useQuery({
    queryKey: ["projects", "archived"],
    queryFn: async (): Promise<ProjectListResponse> => {
      return getArchivedProjects();
    },
    retry: 1,
  });
}

/**
 * Get single project with files
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");
      return getProject(projectId);
    },
    enabled: !!projectId,
  });
}

/**
 * Create project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateProjectParams): Promise<Project> => {
      return createProject(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * Update project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string } & UpdateProjectParams): Promise<Project> => {
      const { id, ...body } = params;
      return updateProject(id, body);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

/**
 * Delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      return deleteProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] });
    },
  });
}

/**
 * Archive project
 */
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<Project> => {
      return archiveProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] });
    },
  });
}

/**
 * Unarchive project (restore)
 */
export function useUnarchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<Project> => {
      return unarchiveProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] });
    },
  });
}

/**
 * Pin project
 */
export function usePinProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<Project> => {
      return pinProject(projectId);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const previous = queryClient.getQueryData(["projects"]);

      queryClient.setQueryData(
        ["projects"],
        (old: ProjectListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            projects: old.projects.map((p) =>
              p.id === projectId ? { ...p, pinnedAt: new Date().toISOString() } : p
            ),
          };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["projects"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * Unpin project
 */
export function useUnpinProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<Project> => {
      return unpinProject(projectId);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const previous = queryClient.getQueryData(["projects"]);

      queryClient.setQueryData(
        ["projects"],
        (old: ProjectListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            projects: old.projects.map((p) =>
              p.id === projectId ? { ...p, pinnedAt: null } : p
            ),
          };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["projects"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
