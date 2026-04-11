/**
 * Context Manager - Anti-Hallucination & Context Preservation
 * Ensures AI never loses critical context or makes up information.
 * Thread-aware: keeps parent-child message groups together when truncating.
 */

import { aiConfig } from "./config";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  parentId?: string | null;  // Thread support
  replies?: Message[];       // Thread support
}

interface ContextChunk {
  messages: Message[];
  summary: string;
  keyFacts: string[];
  tokenCount: number;
}

// Token estimation (~4 chars per token for English)
const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = aiConfig.maxContextTokensFallback; // For direct usage
const MIN_RECENT_TOKENS = aiConfig.minRecentTokens; // Keep more recent context
const KEY_FACT_EXTRACTION_ENABLED = true;

// Important patterns that should never be truncated
const KEY_FACT_PATTERNS = [
  /import\s+[\s\S]*?from/,
  /export\s+(default\s+)?[\s\S]*/,
  /const\s+\w+\s*=/,
  /function\s+\w+/,
  /class\s+\w+/,
  /interface\s+\w+/,
  /type\s+\w+\s*=/,
  /API\s*[=:]/i,
  /URL\s*[=:]/i,
  /endpoint\s*[=:]/i,
  /database\s*[=:]/i,
  /config\s*[=:]/i,
  /environment\s*variable/i,
  /password\s*[=:]/i,
  /secret\s*[=:]/i,
  /token\s*[=:]/i,
  /auth\s*[=:]/i,
  /#\s*\w+/,
  /TODO\s*:/i,
  /FIXME\s*:/i,
  /BUG\s*:/i,
];

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Extract key facts from messages that should never be lost
 */
function extractKeyFacts(messages: Message[]): string[] {
  const facts: Set<string> = new Set();

  for (const msg of messages) {
    const content = msg.content;

    // Extract lines matching key patterns
    for (const pattern of KEY_FACT_PATTERNS) {
      const matches = content.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        matches.forEach((match) => {
          // Normalize and truncate
          const normalized = match.trim().slice(0, 100);
          if (normalized.length > 10) {
            facts.add(normalized);
          }
        });
      }
    }

    // Extract quoted strings (often important definitions)
    const quotes = content.match(/"[^"]{10,100}"/g);
    if (quotes) {
      quotes.forEach((q) => facts.add(q.slice(1, -1)));
    }

    // Extract code blocks (they often contain critical implementation details)
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      codeBlocks.forEach((block) => {
        const firstLine = block.split("\n")[0] || "";
        if (firstLine.length > 5) {
          facts.add(`Code: ${firstLine.trim()}`);
        }
      });
    }
  }

  return Array.from(facts).slice(0, 20); // Limit to 20 key facts
}

/**
 * Build context with anti-hallucination measures
 */
export async function buildChatContext(
  messages: Message[],
  options: {
    maxTokens?: number;
    includeSystem?: boolean;
    systemPrompt?: string;
  } = {}
): Promise<{
  messages: Message[];
  systemPrompt?: string;
  truncated: boolean;
  keyFacts: string[];
  summary: string;
}> {
  const { maxTokens = aiConfig.maxContextTokensFallback, includeSystem = true, systemPrompt } = options;

  if (messages.length === 0) {
    return {
      messages: [],
      systemPrompt,
      truncated: false,
      keyFacts: [],
      summary: "",
    };
  }

  // Extract key facts first (these will be preserved)
  const keyFacts = KEY_FACT_EXTRACTION_ENABLED ? extractKeyFacts(messages) : [];

  // Build key facts string for system prompt
  const keyFactsContext = keyFacts.length > 0
    ? `\n\nCRITICAL CONTEXT TO PRESERVE:\n${keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  const totalTokens = messages.reduce((sum, m) => {
    return sum + estimateTokens(m.content) + 10;
  }, 0);

  // If under limit, return all with key facts context
  const systemPromptWithFacts = systemPrompt
    ? systemPrompt + keyFactsContext
    : keyFactsContext;

  if (totalTokens <= maxTokens) {
    return {
      messages,
      systemPrompt: systemPromptWithFacts || undefined,
      truncated: false,
      keyFacts,
      summary: "",
    };
  }

  // Need to truncate - prioritize recent messages + key facts preservation
  // Thread-aware: keep parent-child groups together
  const recentTokens = MIN_RECENT_TOKENS;
  const recentMessages: Message[] = [];
  let recentTokenCount = 0;

  // Build recent window (from end, going backwards)
  // Always include entire threads to maintain coherence
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content) + 10;

    // Check if this message is part of a thread (has replies)
    const hasThread = msg.replies && msg.replies.length > 0;
    const threadTokens = hasThread
      ? (msg.replies || []).reduce((sum, r) => sum + estimateTokens(r.content) + 10, 0)
      : 0;

    const totalWithThread = msgTokens + threadTokens;

    // If adding this message (and its thread) would exceed budget, stop
    if (recentTokenCount + totalWithThread > recentTokens) {
      // If this message has a thread, include a note about it
      if (hasThread && recentTokenCount < recentTokens * 0.9) {
        recentMessages.unshift(msg);
        recentTokenCount += msgTokens;
      }
      break;
    }

    recentMessages.unshift(msg);
    recentTokenCount += totalWithThread;

    // If message has replies, add them before moving to older messages
    if (hasThread) {
      for (const reply of msg.replies || []) {
        recentMessages.unshift(reply);
        recentTokenCount += estimateTokens(reply.content) + 10;
      }
    }
  }

  // For now, we skip older message summarization since we keep recent
  // This could be enhanced with LLM-based summarization
  const olderMessages = messages.slice(0, messages.length - recentMessages.length);

  // Generate summary of older messages if any
  let olderSummary = "";
  if (olderMessages.length > 0) {
    olderSummary = generateContextualSummary(olderMessages, keyFacts);
  }

  // Build final context
  const summaryContext = olderSummary
    ? `\n\nEARLIER CONVERSATION SUMMARY:\n${olderSummary}${keyFactsContext}`
    : keyFactsContext;

  const finalSystemPrompt = systemPrompt
    ? systemPrompt + summaryContext
    : summaryContext;

  return {
    messages: recentMessages,
    systemPrompt: finalSystemPrompt || undefined,
    truncated: olderMessages.length > 0,
    keyFacts,
    summary: olderSummary,
  };
}

/**
 * Generate a meaningful summary that preserves critical information
 */
function generateContextualSummary(messages: Message[], keyFacts: string[]): string {
  const parts: string[] = [];

  // Summarize by grouping
  const userMessages = messages.filter((m) => m.role === "user");
  const aiMessages = messages.filter((m) => m.role === "assistant");

  // Extract topics from user messages
  const topics = userMessages
    .slice(0, 5) // Last 5 user messages
    .map((m) => {
      const firstLine = m.content.split("\n")[0];
      return firstLine.slice(0, 80);
    })
    .filter((t) => t.length > 10);

  if (topics.length > 0) {
    parts.push(`Topics discussed: ${topics.join(" | ")}`);
  }

  // Include key facts if not already captured
  if (keyFacts.length > 0) {
    parts.push(`Key technical details: ${keyFacts.slice(0, 5).join("; ")}`);
  }

  // Count messages
  parts.push(`(${messages.length} messages exchanged in this portion)`);

  return parts.join("\n");
}

/**
 * Build context specifically for title generation
 */
export function buildTitleContext(firstMessages: Message[]): string {
  const topics = firstMessages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => {
      const clean = m.content
        .replace(/[#*`_\[\](){}]/g, "") // Remove markdown
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      return clean.slice(0, 80);
    })
    .filter((t) => t.length > 5);

  return topics.join(" | ");
}

/**
 * Truncate to token budget while preserving meaning
 */
export function truncateToToken(content: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (content.length <= maxChars) return content;

  // Try to truncate at sentence boundary
  const truncated = content.slice(0, maxChars - 20);

  // Find last sentence boundary
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  const lastBoundary = Math.max(lastPeriod, lastNewline);

  if (lastBoundary > maxChars * 0.7) {
    return truncated.slice(0, lastBoundary + 1);
  }

  return truncated + "... [truncated for length]";
}

/**
 * Validate that a response doesn't contradict context
 * Returns warnings for potential hallucinations
 */
export function validateResponseContext(
  response: string,
  contextMessages: Message[]
): string[] {
  const warnings: string[] = [];

  // Extract claims from response
  const codeBlocks = response.match(/```[\s\S]*?```/g) || [];

  // Check if response mentions things not in context
  const contextText = contextMessages.map((m) => m.content).join(" ");

  for (const block of codeBlocks) {
    // Check for imports/exports that weren't in context
    const imports = block.match(/import\s+.*from\s+["']([^"']+)["']/g);
    if (imports) {
      for (const imp of imports) {
        if (!contextText.includes(imp)) {
          // This might be hallucinated
          warnings.push(`Potentially new import: ${imp}`);
        }
      }
    }
  }

  return warnings;
}
