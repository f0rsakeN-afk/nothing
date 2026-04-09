/**
 * Efficient search using Trie (prefix tree) data structure.
 * Provides O(k) lookup where k = length of search term.
 *
 * For chat search, we index chat titles for fast filtering.
 */

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  chatIds: Set<string> = new Set();
  isEndOfWord = false;
}

export class ChatSearchIndex {
  private root: TrieNode = new TrieNode();

  /**
   * Insert a chat title into the trie.
   */
  insert(title: string, chatId: string): void {
    let node = this.root;

    // Normalize: lowercase, strip special chars
    const normalized = this.normalize(title);

    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.chatIds.add(chatId);
    }

    node.isEndOfWord = true;
  }

  /**
   * Remove a chat from the index.
   */
  remove(title: string, chatId: string): void {
    let node = this.root;
    const normalized = this.normalize(title);

    for (const char of normalized) {
      if (!node.children.has(char)) return;
      node = node.children.get(char)!;
      node.chatIds.delete(chatId);
    }
  }

  /**
   * Search for chats matching the query.
   * Returns set of matching chat IDs.
   */
  search(query: string): Set<string> {
    if (!query.trim()) {
      return new Set();
    }

    let node = this.root;
    const normalized = this.normalize(query);

    // Navigate to the prefix node
    for (const char of normalized) {
      if (!node.children.has(char)) {
        return new Set(); // No matches
      }
      node = node.children.get(char)!;
    }

    // Collect all chat IDs from this node and its descendants
    return this.collectChatIds(node);
  }

  /**
   * Prefix search - finds all chats that start with query.
   */
  searchWithPrefix(query: string, limit = 50): string[] {
    const matches = this.search(query);
    return Array.from(matches).slice(0, limit);
  }

  private collectChatIds(node: TrieNode): Set<string> {
    const result = new Set<string>(node.chatIds);

    for (const child of node.children.values()) {
      const childIds = this.collectChatIds(child);
      childIds.forEach((id) => result.add(id));
    }

    return result;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  }

  /**
   * Build index from array of chats.
   */
  buildIndex(
    chats: Array<{ id: string; title: string }>
  ): void {
    for (const chat of chats) {
      this.insert(chat.title, chat.id);
    }
  }

  /**
   * Clear the index.
   */
  clear(): void {
    this.root = new TrieNode();
  }
}

// Singleton instance for client-side chat search
let chatSearchInstance: ChatSearchIndex | null = null;

export function getChatSearchIndex(): ChatSearchIndex {
  if (!chatSearchInstance) {
    chatSearchInstance = new ChatSearchIndex();
  }
  return chatSearchInstance;
}

/**
 * Binary search for finding insertion point in sorted array.
 * Used for maintaining sorted chat lists.
 */
export function binarySearch<T>(
  arr: T[],
  target: T,
  compareFn: (a: T, b: T) => number
): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cmp = compareFn(arr[mid], target);

    if (cmp === 0) return mid;
    if (cmp < 0) left = mid + 1;
    else right = mid - 1;
  }

  return -(left + 1); // Insertion point as negative
}

/**
 * Insert into sorted array maintaining order.
 */
export function sortedInsert<T>(
  arr: T[],
  item: T,
  compareFn: (a: T, b: T) => number
): T[] {
  const index = binarySearch(arr, item, compareFn);

  if (index >= 0) {
    // Already exists, update
    arr[index] = item;
    return arr;
  }

  // Insert at correct position
  const insertAt = -index - 1;
  arr.splice(insertAt, 0, item);
  return arr;
}

/**
 * Deduplicate array by key.
 */
export function deduplicateByKey<T, K>(
  arr: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
