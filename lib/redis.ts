import Redis from "ioredis";

// Separate clients for Pub/Sub vs regular operations
// Using the same connection for both causes "Connection in subscriber mode" errors

const globalForRedis = global as unknown as {
  redis: Redis;        // For regular operations (get, set, incr, publish)
  redisSub: Redis;      // For Pub/Sub subscribe/unsubscribe ONLY
};

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("REDIS_URL not set, using localhost");
    return new Redis({
      host: "localhost",
      port: 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

// Client for regular operations (get, set, incr, publish, etc.)
const redis = globalForRedis.redis || createRedisClient();

// Separate client for Pub/Sub subscriber ONLY (subscribe, unsubscribe)
const redisSub = globalForRedis.redisSub || createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
  globalForRedis.redisSub = redisSub;
}

// Export regular client as default (used for publish too)
export default redis;

// Export subscriber client for subscribe/unsubscribe only
export { redisSub as redisPubSub };

// Redis key helpers
export const KEYS = {
  chatMessages: (chatId: string) => `chat:${chatId}:messages`,
  chatMeta: (chatId: string) => `chat:${chatId}:meta`,
  userChats: (userId: string) => `chats:user:${userId}`,
  userRateLimit: (userId: string) => `user:${userId}:rate_limit`,
  userChatCreation: (userId: string) => `user:${userId}:chat_creation`,
  searchResult: (query: string) => `search:${Buffer.from(query).toString("base64").slice(0, 64)}`,
  imageCache: (url: string) => `img:${Buffer.from(url).toString("base64").slice(0, 64)}`,
  statusCheck: (service: string) => `status:${service}:checks`,
  userCache: (stackId: string) => `user:cache:${stackId}`,
  bruteForce: (identifier: string) => `bruteforce:${identifier}`,
  projectContext: (projectId: string) => `project:${projectId}:context`,
  extractionJob: (jobId: string) => `extraction:job:${jobId}`,
} as const;

// TTL constants (in seconds)
export const TTL = {
  chatMessages: 60 * 60, // 1 hour
  chatMeta: 7 * 24 * 60 * 60, // 7 days
  userChats: 5 * 60, // 5 minutes for user chat list cache
  rateLimit: 60, // 1 minute
  chatCreationLimit: 60 * 60, // 1 hour
  searchResult: 30 * 60, // 30 minutes for search caching
  imageCache: 7 * 24 * 60 * 60, // 7 days for image cache
  userCache: 5 * 60, // 5 minutes for user cache
  statusHistory: 31 * 24 * 60 * 60, // 31 days for status history
  bruteForce: 5 * 60, // 5 minutes for brute force tracking
} as const;

// Pub/Sub channel helpers
export const CHANNELS = {
  sidebar: (userId: string) => `sidebar:${userId}`,
  chat: (chatId: string) => `chat:${chatId}`,
  status: () => "status:updates",
} as const;
