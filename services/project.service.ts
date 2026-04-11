/**
 * Project API Client - Clean API calls separated from UI logic
 */

import type {
  Project,
  ProjectListResponse,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectFile,
} from "@/types/project";

// Re-export types for convenience
export type { Project, ProjectListResponse, CreateProjectParams, UpdateProjectParams, ProjectFile };

// =========================================
// Project CRUD
// =========================================

/**
 * Get all projects for the current user
 */
export async function getProjects(): Promise<ProjectListResponse> {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

/**
 * Get archived projects only
 */
export async function getArchivedProjects(): Promise<ProjectListResponse> {
  const res = await fetch("/api/projects?archived=true");
  if (!res.ok) throw new Error("Failed to fetch archived projects");
  return res.json();
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectParams): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create project");
  }
  return res.json();
}

/**
 * Update a project (partial update)
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectParams
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update project");
  }
  return res.json();
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete project");
  }
}

// =========================================
// Archive Operations
// =========================================

/**
 * Archive a project
 */
export async function archiveProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    archivedAt: new Date().toISOString(),
  });
}

/**
 * Unarchive a project (restore)
 */
export async function unarchiveProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    archivedAt: null,
  });
}

// =========================================
// Pin Operations
// =========================================

/**
 * Pin a project
 */
export async function pinProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    pinnedAt: new Date().toISOString(),
  });
}

/**
 * Unpin a project
 */
export async function unpinProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    pinnedAt: null,
  });
}

// =========================================
// Project Files
// =========================================

/**
 * Get files for a project
 */
export async function getProjectFiles(
  projectId: string
): Promise<{ files: ProjectFile[] }> {
  const res = await fetch(`/api/projects/${projectId}/files`);
  if (!res.ok) throw new Error("Failed to fetch project files");
  return res.json();
}
