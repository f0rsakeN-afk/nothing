import Redis from 'ioredis'

// Redis connection singleton
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        return null // Stop retrying
      }
      return Math.min(times * 100, 3000)
    },
    lazyConnect: true,
  })

  client.on('error', (err) => {
    console.error('Redis error:', err.message)
  })

  client.on('connect', () => {
    console.log('Redis connected')
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Initialize Redis connection on startup
export async function connectRedis() {
  try {
    await redis.connect()
    console.log('Redis connection established')
  } catch (err) {
    console.error('Failed to connect to Redis:', err)
  }
}
