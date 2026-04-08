import { getCsrfTokenFromCookie, getCsrfTokenFromHeader, validateCsrfToken } from '@/lib/auth/csrf'

// Public routes that don't require CSRF validation
const PUBLIC_ROUTES = [
  '/auth/register',
  '/auth/login',
  '/auth/reset-password/request',
  '/auth/reset-password/confirm',
  '/auth/verify-email/',
  '/health',
]

export function csrfMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const method = c.req.method
    const path = c.req.path

    // Only validate CSRF for state-changing requests
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      await next()
      return
    }

    // Skip CSRF for public routes
    const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route))
    if (isPublicRoute) {
      await next()
      return
    }

    const cookieToken = getCsrfTokenFromCookie(c)
    const headerToken = getCsrfTokenFromHeader(c)

    if (!validateCsrfToken(cookieToken || '', headerToken || '')) {
      return c.json({ error: 'Invalid CSRF token' }, 403)
    }

    await next()
  }
}
