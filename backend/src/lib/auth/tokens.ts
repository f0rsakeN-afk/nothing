import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7
const EMAIL_TOKEN_BYTES = 32
const REFRESH_TOKEN_BYTES = 64

interface AccessTokenPayload {
  userId: string
  type: 'access'
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload
  if (payload.type !== 'access') {
    throw new Error('Invalid token type')
  }
  return payload
}

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifyRefreshTokenHash(token: string, hash: string): boolean {
  const computedHash = hashRefreshToken(token)
  return timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))
}

export function generateEmailVerificationToken(): string {
  return randomBytes(EMAIL_TOKEN_BYTES).toString('hex')
}

export function generatePasswordResetToken(): string {
  return randomBytes(EMAIL_TOKEN_BYTES).toString('hex')
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

export function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string,
  csrfToken: string
) {
  const isProduction = process.env.NODE_ENV === 'production'

  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes in seconds
    path: '/',
  })

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  })

  setCookie(c, 'csrf_token', csrfToken, {
    httpOnly: false, // Must be readable by JS for double-submit
    secure: isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export function clearAuthCookies(c: Context) {
  setCookie(c, 'access_token', '', { maxAge: 0, path: '/' })
  setCookie(c, 'refresh_token', '', { maxAge: 0, path: '/' })
  setCookie(c, 'csrf_token', '', { maxAge: 0, path: '/' })
}
