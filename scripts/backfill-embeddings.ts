/**
 * Backfill Embeddings Script
 * Process existing files and memories to create vector embeddings
 * Run with: bun run scripts/backfill-embeddings.ts
 */

import prisma from "@/lib/prisma";
import { embedFile, embedMemory } from "@/services/rag.service";

async function backfillFileEmbeddings() {
  console.log("=== Backfilling File Embeddings ===\n");

  // Get files with extracted content but no embeddings
  const files = await prisma.file.findMany({
    where: {
      extractedContent: { not: null },
      status: "READY",
    },
    select: {
      id: true,
      name: true,
      extractedContent: true,
    },
  });

  console.log(`Found ${files.length} files with extracted content`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    // FileChunk model is commented out in schema - skip this check
    // const chunkCount = await prisma.fileChunk.count({
    //   where: { fileId: file.id },
    // });

    if (!file.extractedContent) {
      skipped++;
      continue;
    }

    try {
      console.log(`  PROCESSING: ${file.name}...`);
      const result = await embedFile(file.id, file.extractedContent);
      console.log(`    Created ${result.chunkCount} chunks, ${result.tokenCount} tokens`);
      processed++;
    } catch (error) {
      console.error(`    ERROR: ${error}`);
      errors++;
    }
  }

  console.log(`\nFile Embeddings Summary:`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

async function backfillMemoryEmbeddings() {
  console.log("\n=== Backfilling Memory Embeddings ===\n");

  // Get memories with content
  const memories = await prisma.memory.findMany({
    where: {
      content: { not: "" },
    },
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  console.log(`Found ${memories.length} memories with content`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const memory of memories) {
    // MemoryEmbedding model is commented out in schema - skip this check
    // const chunkCount = await prisma.memoryEmbedding.count({
    //   where: { memoryId: memory.id },
    // });

    if (!memory.content) {
      skipped++;
      continue;
    }

    try {
      console.log(`  PROCESSING: ${memory.title}...`);
      const result = await embedMemory(memory.id, memory.content);
      console.log(`    Created ${result.chunkCount} chunks, ${result.tokenCount} tokens`);
      processed++;
    } catch (error) {
      console.error(`    ERROR: ${error}`);
      errors++;
    }
  }

  console.log(`\nMemory Embeddings Summary:`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

async function main() {
  console.log("Starting embeddings backfill...\n");
  console.log("NOTE: Make sure COHERE_API_KEY is set in environment\n");

  const startTime = Date.now();

  try {
    await backfillFileEmbeddings();
    await backfillMemoryEmbeddings();
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Backfill Complete in ${duration}s ===`);
}

main().catch(console.error);
