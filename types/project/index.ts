// Project types

export interface Project {
  id: string;
  name: string;
  description: string;
  instruction: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  pinnedAt: string | null;
}

export interface ProjectListResponse {
  projects: Project[];
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  instruction?: string;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  instruction?: string;
  archivedAt?: string | null;
  pinnedAt?: string | null;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  createdAt: string;
}
