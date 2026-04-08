import { redis } from './redis'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export function rateLimit(config: RateLimitConfig) {
  return async (c: any, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown'
    const key = `ratelimit:${ip}:${c.req.path}`
    const now = Date.now()
    const windowSeconds = Math.ceil(config.windowMs / 1000)

    try {
      // Skip rate limiting if Redis is not connected
      if (redis.status !== 'ready') {
        await next()
        return
      }

      // Use Redis sliding window rate limit
      const multi = redis.multi()
      multi.zremrangebyscore(key, 0, now - config.windowMs)
      multi.zadd(key, now.toString(), `${now}-${Math.random()}`)
      multi.zcard(key)
      multi.expire(key, windowSeconds)
      const results = await multi.exec()

      const requestCount = results?.[2]?.[1] as number || 0

      // Set rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - requestCount).toString())
      c.header('X-RateLimit-Reset', (Math.floor(now / config.windowMs) * windowSeconds + windowSeconds).toString())

      if (requestCount > config.maxRequests) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429)
      }

      await next()
    } catch (err) {
      // If Redis fails, allow the request but log the error
      console.error('Rate limit error:', err)
      await next()
    }
  }
}

// Rate limit configurations for different routes
export const authRateLimits = {
  // Strict limit for sensitive operations
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 registrations per hour
  resetPassword: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 reset requests per hour
  // More lenient for other operations
  default: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
}
