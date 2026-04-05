import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';

/**
 * Identity Projection Middleware
 * Extracts JWT from secure HttpOnly cookies and prepares internal headers.
 */
export const identityMiddleware: MiddlewareHandler = async (c, next) => {
  const accessToken = getCookie(c, 'access_token');
  
  if (accessToken) {
    // Inject into internal headers for downstream microservices
    c.req.raw.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  await next();
};
