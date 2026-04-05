/**
 * Gateway Configuration
 * Consolidates all environment variables with sensible defaults.
 */
export const config = {
  port: parseInt(Bun.env.PORT || '3000', 10),
  authServiceUrl: Bun.env.AUTH_SERVICE_URL || 'http://localhost:8000',
  allowedOrigins: (Bun.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  environment: Bun.env.NODE_ENV || 'development',
  isProduction: Bun.env.NODE_ENV === 'production',
  cookieDomain: Bun.env.COOKIE_DOMAIN || 'localhost',
  trustProxy: Bun.env.TRUST_PROXY === 'true',
};
