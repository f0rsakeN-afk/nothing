import { verifyAccessToken } from '@/lib/auth/tokens'

export function authMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const token = authHeader.slice(7)

    try {
      const payload = verifyAccessToken(token)
      c.set('userId', payload.userId)
      await next()
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
}

export function getUserId(c: any): string | null {
  return c.get('userId') || null
}
