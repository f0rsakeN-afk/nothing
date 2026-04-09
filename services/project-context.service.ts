/**
 * Project Context Service
 * Builds project context for system prompts with token budget management
 */

import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";

const TOKEN_BUDGET = {
  INSTRUCTION: 1000,
  KEY_FACTS: 500,
  FILE_CONTENTS: 4000,
  TOTAL: 6000,
};

export interface ProjectFileContext {
  id: string;
  name: string;
  extractedContent: string;
  tokenCount: number;
}

export interface ProjectContext {
  instruction: string | null;
  files: ProjectFileContext[];
  totalTokens: number;
}

/**
 * Build project context with token budget management
 * Prioritizes: instruction > key facts > file contents
 */
export async function buildProjectContext(
  projectId: string
): Promise<ProjectContext> {
  // Try cache first
  const cacheKey = KEYS.projectContext(projectId);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ProjectContext;
    }
  } catch {
    // Cache miss
  }

  // Get project from database
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: {
        where: { deletedAt: null, status: "READY" },
        select: {
          id: true,
          name: true,
          extractedContent: true,
          tokenCount: true,
        },
      },
    },
  });

  if (!project) {
    return { instruction: null, files: [], totalTokens: 0 };
  }

  // Build file context array
  const files: ProjectFileContext[] = project.files
    .filter((f) => f.extractedContent)
    .map((f) => ({
      id: f.id,
      name: f.name,
      extractedContent: f.extractedContent || "",
      tokenCount: f.tokenCount || Math.ceil((f.extractedContent?.length || 0) / 4),
    }));

  // Calculate total tokens
  const instructionTokens = project.instruction
    ? Math.ceil(project.instruction.length / 4)
    : 0;
  const fileTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);
  const totalTokens = instructionTokens + fileTokens;

  const context: ProjectContext = {
    instruction: project.instruction,
    files,
    totalTokens,
  };

  // Cache for 5 minutes
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(context));
  } catch {
    // Cache failed
  }

  return context;
}

/**
 * Get project files for context injection
 * Respects token budget - truncates if needed
 */
export function getProjectFilesForContext(
  files: ProjectFileContext[],
  maxTokens: number = TOKEN_BUDGET.FILE_CONTENTS
): ProjectFileContext[] {
  let totalTokens = 0;
  const selected: ProjectFileContext[] = [];

  // Sort by token count (smaller first to fit more)
  const sorted = [...files].sort((a, b) => a.tokenCount - b.tokenCount);

  for (const file of sorted) {
    if (totalTokens + file.tokenCount <= maxTokens) {
      selected.push(file);
      totalTokens += file.tokenCount;
    } else {
      break;
    }
  }

  return selected;
}

/**
 * Invalidate project context cache
 */
export async function invalidateProjectContext(projectId: string): Promise<void> {
  const cacheKey = KEYS.projectContext(projectId);
  try {
    await redis.del(cacheKey);
  } catch {
    // Cache invalidation failed
  }
}

/**
 * Build project context section for system prompt
 */
export function buildProjectContextSection(
  projectName: string,
  projectInstruction: string | null,
  projectFiles: ProjectFileContext[]
): string {
  const sections: string[] = [];

  sections.push(`## Project: ${projectName}`);

  if (projectInstruction) {
    sections.push(`### Instructions`);
    sections.push(projectInstruction);
  }

  if (projectFiles.length > 0) {
    sections.push(`### Context Files`);
    for (const file of projectFiles) {
      sections.push(`#### ${file.name}`);
      sections.push(file.extractedContent.slice(0, 4000));
      sections.push("---");
    }
  }

  return sections.join("\n");
}
