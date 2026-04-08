import { randomBytes, timingSafeEqual } from 'crypto'
import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

const CSRF_TOKEN_BYTES = 32

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString('hex')
}

export function createCsrfCookie(c: Context, token: string) {
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(c, 'csrf_token', token, {
    httpOnly: false, // Must be readable by JS for double-submit
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

export function validateCsrfToken(cookieValue: string, headerValue: string): boolean {
  if (!cookieValue || !headerValue) {
    return false
  }

  const cookieBuffer = Buffer.from(cookieValue)
  const headerBuffer = Buffer.from(headerValue)

  if (cookieBuffer.length !== headerBuffer.length) {
    return false
  }

  return timingSafeEqual(cookieBuffer, headerBuffer)
}

export function getCsrfTokenFromCookie(c: Context): string | undefined {
  return getCookie(c, 'csrf_token')
}

export function getCsrfTokenFromHeader(c: Context): string | undefined {
  return c.req.header('x-csrf-token') || c.req.header('csrf-token')
}
