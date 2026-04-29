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
  userChatsArchived: (userId: string) => `chats:user:${userId}:archived`,
  userRateLimit: (userId: string) => `user:${userId}:rate_limit`,
  userChatCreation: (userId: string) => `user:${userId}:chat_creation`,
  imageCache: (url: string) => `img:${Buffer.from(url).toString("base64").slice(0, 64)}`,
  statusCheck: (service: string) => `status:${service}:checks`,
  statusSLA: () => `status:sla`,
  userCache: (stackId: string) => `user:cache:${stackId}`,
  bruteForce: (identifier: string) => `bruteforce:${identifier}`,
  projectContext: (projectId: string) => `project:${projectId}:context`,
  extractionJob: (jobId: string) => `extraction:job:${jobId}`,
  userPreferences: (userId: string) => `user:${userId}:preferences`,
  userLimits: (userId: string) => `user:limits:${userId}`,
  userSettings: (userId: string) => `user:${userId}:settings`,
  userCredits: (userId: string) => `user:${userId}:credits`,
  userAccount: (userId: string) => `user:${userId}:account`,
  userMemories: (userId: string) => `user:${userId}:memories`,
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  userSubscription: (userId: string) => `user:${userId}:subscription`,
  searchResults: (query: string) => `search:${Buffer.from(query).toString("base64").slice(0, 32)}`,
  chatSummary: (chatId: string) => `chat:${chatId}:summary`,
  summarizing: (chatId: string) => `chat:${chatId}:summarizing`,
  mcpCatalog: "mcp:catalog",
  mcpTools: (userId: string) => `mcp:${userId}:tools`,
  chatPartial: (chatId: string) => `chat:${chatId}:partial`,
  chatFileContents: (chatId: string) => `chat:${chatId}:file_contents`,
  chatPresence: (chatId: string) => `presence:${chatId}`,
  chatTyping: (chatId: string) => `typing:${chatId}`,
  activeStreams: () => "active:streams",
  resumeReady: (chatId: string) => `resume:${chatId}:ready`,
  streamVersion: (chatId: string) => `chat:${chatId}:stream:version`,
  // Admin route caches
  adminChats: (...args: (string | number)[]) => `admin:chats:${args.join(":")}`,
  adminUsers: (...args: (string | number)[]) => `admin:users:${args.join(":")}`,
  adminPlans: () => "admin:plans",
  adminSettings: () => "admin:settings",
  adminStats: () => "admin:stats",
  adminReports: (...args: (string | number)[]) => `admin:reports:${args.join(":")}`,
  adminNotifications: (...args: (string | number)[]) => `admin:notifications:${args.join(":")}`,
  creditCosts: () => "credit:costs",
  polarPlans: () => "polar:plans",
  changelogEntries: () => "changelog:entries",
  changelogList: (...args: (string | number)[]) => `changelog:list:${args.join(":")}`,
  chatInvitations: (chatId: string) => `chat:${chatId}:invitations`,
} as const;

// TTL constants (in seconds)
export const TTL = {
  chatMessages: 60 * 60, // 1 hour
  chatMeta: 7 * 24 * 60 * 60, // 7 days
  userChats: 5 * 60, // 5 minutes for user chat list cache
  rateLimit: 60, // 1 minute
  chatCreationLimit: 60 * 60, // 1 hour
  imageCache: 7 * 24 * 60 * 60, // 7 days for image cache
  userCache: 5 * 60, // 5 minutes for user cache
  statusHistory: 31 * 24 * 60 * 60, // 31 days for status history
  bruteForce: 5 * 60, // 5 minutes for brute force tracking
  userPreferences: 30 * 60, // 30 minutes for user preferences/customize
  userLimits: 5 * 60, // 5 minutes for user limits
  userSettings: 30 * 60, // 30 minutes for user settings
  userCredits: 5 * 60, // 5 minutes for credits
  userAccount: 5 * 60, // 5 minutes for account data
  userMemories: 5 * 60, // 5 minutes for memories list
  userNotifications: 30, // 30 seconds for notifications (real-time sensitive)
  userProjects: 5 * 60, // 5 minutes for project list
  userSubscription: 2 * 60, // 2 minutes for user subscription/plan cache
  searchResults: 60 * 60, // 1 hour for web search results
  chatSummary: 7 * 24 * 60 * 60, // 7 days for chat summaries
  mcpCatalog: 10 * 60, // 10 minutes for MCP catalog (rarely changes)
  mcpTools: 5 * 60, // 5 minutes for user MCP tools cache
  chatPartial: 24 * 60 * 60, // 24 hours for partial stream data
  chatFileContents: 60 * 60, // 1 hour for chat file contents (invalidated on new message)
  activeStreams: 60, // 1 minute for active stream tracking (short, refreshed frequently)
  resumeReady: 5 * 60, // 5 minutes for resume ready signal
  streamVersion: 24 * 60 * 60, // 24 hours for stream version tracking
  // Admin route caches
  adminChats: 30, // 30 seconds for admin chat list
  adminUsers: 30, // 30 seconds for admin user list
  adminPlans: 60, // 1 minute for admin plans list
  adminSettings: 5 * 60, // 5 minutes for settings
  adminStats: 30, // 30 seconds for dashboard stats
  adminReports: 30, // 30 seconds for reports list
  adminNotifications: 30, // 30 seconds for notifications list
  creditCosts: 5 * 60, // 5 minutes for credit costs (updated by admin)
  polarPlans: 60, // 1 minute for public polar plans
  changelogEntries: 60, // 1 minute for changelog entries
  changelogList: 30, // 30 seconds for changelog list
  chatInvitations: 60, // 1 minute for chat invitations
} as const;

// Pub/Sub channel helpers
export const CHANNELS = {
  sidebar: (userId: string) => `sidebar:${userId}`,
  chat: (chatId: string) => `chat:${chatId}`,
  status: () => "status:updates",
  notifications: (userId: string) => `notifications:${userId}`,
  credits: (userId: string) => `credits:${userId}`,
  chatResumeReady: (chatId: string) => `chat:resume:${chatId}`,
} as const;
