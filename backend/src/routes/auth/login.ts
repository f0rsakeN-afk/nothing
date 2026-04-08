import { Hono } from 'hono'

import { generateCsrfToken } from '@/lib/auth/csrf'
import { verifyPassword } from '@/lib/auth/password'
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  setAuthCookies,
} from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'
import { authRateLimits, rateLimit } from '@/lib/ratelimit'
import { loginSchema } from '@/lib/schema/auth'

const app = new Hono()

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates user and returns access token with refresh token in cookies
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Email not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/login', rateLimit(authRateLimits.login), async (c) => {
  const body = await c.req.json()
  const result = loginSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.errors[0].message }, 400)
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: { email },
  })

  // Always run password verification to prevent timing attacks
  const isValidPassword = user ? await verifyPassword(password, user.passwordHash) : false

  if (!user || !isValidPassword) {
    return c.json({ error: 'Invalid email or password' }, 401)
  }

  if (!user.emailVerified) {
    return c.json({ error: 'Please verify your email before logging in' }, 403)
  }

  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken()
  const csrfToken = generateCsrfToken()

  const refreshTokenHash = hashRefreshToken(refreshToken)
  const refreshTokenExpiry = getRefreshTokenExpiry()

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId: user.id,
      expiresAt: refreshTokenExpiry,
    },
  })

  setAuthCookies(c, accessToken, refreshToken, csrfToken)

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    accessToken,
  })
})

export default app
