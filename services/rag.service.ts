/**
 * RAG Retrieval Service
 * Vector similarity search + hybrid search for context retrieval
 */

import { embedText, getEmbeddings } from "./embedding.service";
import { semanticChunk } from "./chunking.service";
import prisma from "@/lib/prisma";

export interface RetrievedContext {
  content: string;
  source: string;
  sourceId: string;
  sourceType: "file" | "memory";
  score: number;
  tokenCount: number;
}

const DEFAULT_MAX_TOKENS = 4000; // 4000 token budget for context
const TOP_K = 10; // Retrieve top K results then filter by token budget
const SIMILARITY_THRESHOLD = 0.05; // Minimum similarity score

/**
 * Retrieve relevant context for a query
 */
export async function retrieveContext(
  query: string,
  options: {
    fileIds?: string[];
    memoryIds?: string[];
    maxTokens?: number;
    userId?: string;
  } = {}
): Promise<RetrievedContext[]> {
  const { fileIds, memoryIds, maxTokens = DEFAULT_MAX_TOKENS, userId } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Embed the query
    const queryEmbedding = await embedText(query);

    // Skip if embeddings not available
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return [];
    }

    // Search vectors in parallel
    const [fileResults, memoryResults] = await Promise.all([
      fileIds && fileIds.length > 0
        ? searchFileChunks(queryEmbedding, fileIds)
        : Promise.resolve([]),
      memoryIds && memoryIds.length > 0
        ? searchMemoryChunks(queryEmbedding, memoryIds)
        : userId
        ? searchUserMemoryChunks(queryEmbedding, userId)
        : Promise.resolve([]),
    ]);

    // Combine and deduplicate results
    const allResults = [...fileResults, ...memoryResults];

    // Sort by score descending
    allResults.sort((a, b) => b.score - a.score);

    // Filter by token budget
    let totalTokens = 0;
    const filteredResults: RetrievedContext[] = [];

    for (const result of allResults) {
      if (totalTokens + result.tokenCount <= maxTokens) {
        filteredResults.push(result);
        totalTokens += result.tokenCount;
      }

      // Stop if we're close to the token budget
      if (totalTokens >= maxTokens * 0.9) break;
    }

    return filteredResults;
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return [];
  }
}

/**
 * Search file chunks by embedding similarity
 */
async function searchFileChunks(
  queryEmbedding: number[],
  fileIds: string[]
): Promise<RetrievedContext[]> {
  if (fileIds.length === 0) return [];

  try {
    const placeholders = fileIds.map((_, i) => `$${i + 2}`).join(", ");
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        fileId: string;
        chunkIndex: number;
        content: string;
        tokenCount: number;
        similarity: number;
        fileName: string;
      }>
    >(
      `SELECT
        fc.id,
        fc."fileId",
        fc."chunkIndex",
        fc.content,
        fc."tokenCount",
        1 - (fc.embedding <=> '${vectorStr}'::vector) as similarity,
        f.name as "fileName"
      FROM "FileChunk" fc
      JOIN "File" f ON f.id = fc."fileId"
      WHERE fc."fileId" IN (${placeholders})
      ORDER BY fc.embedding <=> '${vectorStr}'::vector
      LIMIT ${TOP_K}`,
      fileIds
    );

    return results.map((row) => ({
      content: row.content,
      source: `File: ${row.fileName}`,
      sourceId: row.id,
      sourceType: "file",
      score: Number(row.similarity),
      tokenCount: row.tokenCount,
    }));
  } catch (error) {
    console.warn("[RAG] searchFileChunks failed:", error);
    return [];
  }
}

/**
 * Search memory chunks by embedding similarity
 */
async function searchMemoryChunks(
  queryEmbedding: number[],
  memoryIds: string[]
): Promise<RetrievedContext[]> {
  if (memoryIds.length === 0) return [];

  try {
    const placeholders = memoryIds.map((_, i) => `$${i + 2}`).join(", ");
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        memoryId: string;
        content: string;
        tokenCount: number;
        similarity: number;
        memoryTitle: string;
      }>
    >(
      `SELECT
        me.id,
        me."memoryId",
        me.content,
        me."tokenCount",
        1 - (me.embedding <=> '${vectorStr}'::vector) as similarity,
        m.title as "memoryTitle"
      FROM "MemoryEmbedding" me
      JOIN "Memory" m ON m.id = me."memoryId"
      WHERE me."memoryId" IN (${placeholders})
      ORDER BY me.embedding <=> '${vectorStr}'::vector
      LIMIT ${TOP_K}`,
      memoryIds
    );

    return results.map((row) => ({
      content: row.content,
      source: `Memory: ${row.memoryTitle}`,
      sourceId: row.id,
      sourceType: "memory",
      score: Number(row.similarity),
      tokenCount: row.tokenCount,
    }));
  } catch (error) {
    console.warn("[RAG] searchMemoryChunks failed:", error);
    return [];
  }
}

/**
 * Search all user memory chunks
 */
async function searchUserMemoryChunks(
  queryEmbedding: number[],
  userId: string
): Promise<RetrievedContext[]> {
  try {
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        memoryId: string;
        content: string;
        tokenCount: number;
        similarity: number;
        memoryTitle: string;
      }>
    >(
      `SELECT
        me.id,
        me."memoryId",
        me.content,
        me."tokenCount",
        1 - (me.embedding <=> '${vectorStr}'::vector) as similarity,
        m.title as "memoryTitle"
      FROM "MemoryEmbedding" me
      JOIN "Memory" m ON m.id = me."memoryId"
      WHERE m."userId" = $1
      ORDER BY me.embedding <=> '${vectorStr}'::vector
      LIMIT ${TOP_K}`,
      [userId]
    );

    return results.map((row) => ({
      content: row.content,
      source: `Memory: ${row.memoryTitle}`,
      sourceId: row.id,
      sourceType: "memory",
      score: Number(row.similarity),
      tokenCount: row.tokenCount,
    }));
  } catch (error) {
    // Table might not exist or other DB error
    console.warn("[RAG] searchUserMemoryChunks failed:", error);
    return [];
  }
}

/**
 * Create embeddings for a file's content
 */
export async function embedFile(
  fileId: string,
  extractedContent: string
): Promise<{ chunkCount: number; tokenCount: number }> {
  const chunks = semanticChunk(extractedContent);

  if (chunks.length === 0) {
    return { chunkCount: 0, tokenCount: 0 };
  }

  // Get embeddings for all chunks in batch
  const texts = chunks.map((c) => c.content);
  const embeddings = await getEmbeddings(texts);

  // Store chunks in database using raw SQL (pgvector needs special handling)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "FileChunk" ("id", "fileId", "chunkIndex", "content", "embedding", "tokenCount", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5, NOW())`,
      fileId,
      chunk.chunkIndex,
      chunk.content,
      vectorStr,
      chunk.tokenCount
    );
  }

  return {
    chunkCount: chunks.length,
    tokenCount: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
  };
}

/**
 * Create embeddings for a memory
 */
export async function embedMemory(
  memoryId: string,
  content: string
): Promise<{ chunkCount: number; tokenCount: number }> {
  const chunks = semanticChunk(content);

  if (chunks.length === 0) {
    return { chunkCount: 0, tokenCount: 0 };
  }

  // Get embeddings for all chunks
  const texts = chunks.map((c) => c.content);
  const embeddings = await getEmbeddings(texts);

  // Store in database using raw SQL
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "MemoryEmbedding" ("id", "memoryId", "content", "embedding", "tokenCount", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, NOW())`,
      memoryId,
      chunk.content,
      vectorStr,
      chunk.tokenCount
    );
  }

  return {
    chunkCount: chunks.length,
    tokenCount: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
  };
}

/**
 * Delete embeddings for a file
 */
export async function deleteFileEmbeddings(fileId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "FileChunk" WHERE "fileId" = $1`,
    fileId
  );
}

/**
 * Delete embeddings for a memory
 */
export async function deleteMemoryEmbeddings(memoryId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "MemoryEmbedding" WHERE "memoryId" = $1`,
    memoryId
  );
}

/**
 * Format retrieved context for system prompt
 */
export function formatContextForPrompt(
  contexts: RetrievedContext[]
): string {
  if (contexts.length === 0) return "";

  const formatted = contexts
    .map((ctx, index) => {
      return `[${index + 1}] ${ctx.source}\n${ctx.content}`;
    })
    .join("\n\n");

  return `RELEVANT CONTEXT FROM YOUR KNOWLEDGE:\n${formatted}\n\nUse the above context to inform your response. Cite sources using [1], [2], etc. when referencing specific information.`;
}
