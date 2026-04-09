/**
 * Content Extraction Service
 * Extracts text content from various file types for AI context
 */

import { PDFParse } from "pdf-parse";

export interface ExtractionResult {
  text: string;
  wordCount: number;
  tokenCount: number;
  extractionMethod: "full" | "partial" | "failed";
  error?: string;
}

const MAX_CONTENT_SIZE = 100 * 1024; // 100KB
const CHARS_PER_TOKEN = 4; // Rough estimate

/**
 * Extract content from buffer based on MIME type
 */
export async function extractFileContent(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    switch (mimeType) {
      case "text/plain":
      case "text/markdown":
        return extractText(buffer);

      case "application/json":
        return extractJson(buffer);

      case "text/csv":
        return extractCsv(buffer);

      case "application/pdf":
        return extractPdf(buffer);

      default:
        return {
          text: "",
          wordCount: 0,
          tokenCount: 0,
          extractionMethod: "failed",
          error: `Unsupported content type: ${mimeType}`,
        };
    }
  } catch (error) {
    return {
      text: "",
      wordCount: 0,
      tokenCount: 0,
      extractionMethod: "failed",
      error: error instanceof Error ? error.message : "Extraction failed",
    };
  }
}

/**
 * Extract plain text
 */
function extractText(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8");
  return createResult(text);
}

/**
 * Extract JSON - format and stringify
 */
function extractJson(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8");
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    return createResult(formatted);
  } catch {
    return createResult(text);
  }
}

/**
 * Extract CSV - convert to structured text
 */
function extractCsv(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8");
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return createResult("");
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1, 11); // First 10 data rows

  const formatted = rows
    .map((row) => {
      const values = row.split(",").map((v) => v.trim().replace(/"/g, ""));
      return header
        .map((h, i) => `${h}: ${values[i] || ""}`)
        .join(" | ");
    })
    .join("\n");

  return createResult(formatted);
}

/**
 * Extract PDF text
 */
async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    return createResult(textResult.text);
  } catch (error) {
    return {
      text: "",
      wordCount: 0,
      tokenCount: 0,
      extractionMethod: "failed",
      error: error instanceof Error ? error.message : "PDF extraction failed",
    };
  }
}

/**
 * Create extraction result with word/token counts
 */
function createResult(text: string): ExtractionResult {
  // Truncate if too large
  let finalText = text;
  let extractionMethod: ExtractionResult["extractionMethod"] = "full";

  if (text.length > MAX_CONTENT_SIZE) {
    finalText = text.slice(0, MAX_CONTENT_SIZE);
    extractionMethod = "partial";
  }

  const wordCount = finalText.split(/\s+/).filter((w) => w.length > 0).length;
  const tokenCount = Math.ceil(finalText.length / CHARS_PER_TOKEN);

  return {
    text: finalText,
    wordCount,
    tokenCount,
    extractionMethod,
  };
}

/**
 * Get content preview (first 500 chars)
 */
export function getContentPreview(text: string, maxLength = 500): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}

/**
 * Estimate tokens from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if content type is supported for extraction
 */
export function isExtractionSupported(mimeType: string): boolean {
  const supported = [
    "text/plain",
    "text/markdown",
    "application/json",
    "text/csv",
    "application/pdf",
  ];
  return supported.includes(mimeType);
}
