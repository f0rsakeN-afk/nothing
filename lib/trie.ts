/**
 * Trie data structure for instant prefix matching
 * Used for client-side autocomplete with 0ms latency
 */

export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  frequency: number = 0;
  query: string = "";
}

export class Trie {
  private root: TrieNode;
  private maxSuggestions: number;

  constructor(maxSuggestions = 10) {
    this.root = new TrieNode();
    this.maxSuggestions = maxSuggestions;
  }

  insert(query: string, frequency = 1): void {
    let node = this.root;
    const words = query.toLowerCase().split(/\s+/);

    for (const word of words) {
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (!node.children.has(char)) {
          node.children.set(char, new TrieNode());
        }
        node = node.children.get(char)!;
      }
      node.isEndOfWord = true;
      node.frequency += frequency;
      node.query = query;
    }
  }

  search(query: string): string[] {
    let node = this.root;
    const suggestions: { query: string; score: number }[] = [];
    const words = query.toLowerCase().split(/\s+/);

    // Navigate to the last word's node
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      let found = true;

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (!node.children.has(char)) {
          found = false;
          break;
        }
        node = node.children.get(char)!;
      }

      if (!found) break;

      // If this is the last word, collect all suggestions from here
      if (w === words.length - 1) {
        this.collectSuggestions(node, query, suggestions);
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxSuggestions)
      .map(s => s.query);
  }

  private collectSuggestions(
    node: TrieNode,
    prefix: string,
    suggestions: { query: string; score: number }[],
    depth = 0
  ): void {
    if (suggestions.length >= this.maxSuggestions * 2) return;
    if (depth > 10) return; // Prevent infinite recursion

    if (node.isEndOfWord) {
      const score = node.frequency * (1 + (10 - depth) * 0.1);
      suggestions.push({ query: node.query, score });
    }

    for (const [char, childNode] of node.children) {
      this.collectSuggestions(childNode, prefix + " " + char, suggestions, depth + 1);
    }
  }

  bulkInsert(queries: { query: string; frequency?: number }[]): void {
    for (const { query, frequency = 1 } of queries) {
      this.insert(query, frequency);
    }
  }

  clear(): void {
    this.root = new TrieNode();
  }
}

// Common prompts to pre-load for instant suggestions
export const COMMON_PROMPTS = [
  { query: "Design a REST API for", frequency: 10 },
  { query: "Design a database schema for", frequency: 9 },
  { query: "Design a microservices architecture", frequency: 8 },
  { query: "Explain how", frequency: 7 },
  { query: "How does the JavaScript event loop work", frequency: 10 },
  { query: "How to implement", frequency: 8 },
  { query: "What is the difference between", frequency: 7 },
  { query: "What are the best practices for", frequency: 8 },
  { query: "Write a rate limiter in TypeScript", frequency: 9 },
  { query: "Write a React hook for", frequency: 8 },
  { query: "Create a JWT authentication system", frequency: 7 },
  { query: "Build a CRUD API with Node.js", frequency: 6 },
  { query: "Optimize a slow SQL query", frequency: 7 },
  { query: "Debug this code", frequency: 6 },
  { query: "Refactor this function", frequency: 5 },
  { query: "Write unit tests for", frequency: 6 },
  { query: "Compare React vs Vue", frequency: 7 },
  { query: "Compare GraphQL vs REST", frequency: 6 },
  { query: "Best practices for API security", frequency: 8 },
  { query: "How to deploy to AWS", frequency: 5 },
  { query: "Set up CI/CD pipeline", frequency: 6 },
  { query: "Implement caching with Redis", frequency: 7 },
  { query: "Set up Docker container", frequency: 5 },
  { query: "Design a scalable system", frequency: 8 },
  { query: "Explain OAuth 2.0 flow", frequency: 7 },
  { query: "What is memoization", frequency: 6 },
  { query: "How does React reconciliation work", frequency: 7 },
  { query: "Explain CAP theorem", frequency: 6 },
  { query: "What is the best way to", frequency: 5 },
  { query: "Help me understand", frequency: 6 },
];
