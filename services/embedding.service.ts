/**
 * Embedding Service
 * Uses Cohere API directly for text embeddings (embed-v7-multilingual, 1536 dimensions)
 * Free tier: 1M tokens/month
 *
 * Using cohere-ai SDK directly instead of LangChain to reduce bundle size (~16M vs ~30M+)
 */

const COHERE_API_URL = "https://api.cohere.ai/v2/embed";
const EMBED_MODEL = "embed-v7-multilingual";
const CHARS_PER_TOKEN = 4;

/**
 * Get embeddings for multiple texts (batch processing)
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    console.warn("[Embedding] COHERE_API_KEY not configured, skipping batch embeddings");
    return [];
  }

  try {
    const response = await fetch(COHERE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        texts,
        input_type: "search_document",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`[Embedding] Cohere API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { embeddings: number[][] };
    return data.embeddings;
  } catch (err) {
    console.warn("[Embedding] Failed to get batch embeddings:", err);
    return [];
  }
}

/**
 * Get embedding for a single text (query)
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    console.warn("[Embedding] COHERE_API_KEY not configured, skipping RAG");
    return [];
  }

  try {
    const response = await fetch(COHERE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        texts: [text],
        input_type: "search_query",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`[Embedding] Cohere API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { embeddings: number[][] };
    return data.embeddings[0] || [];
  } catch (err) {
    console.warn("[Embedding] Failed to get embeddings:", err);
    return [];
  }
}

/**
 * Estimate tokens from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if Cohere API key is configured
 */
export function isEmbeddingConfigured(): boolean {
  return !!process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 0;
}
