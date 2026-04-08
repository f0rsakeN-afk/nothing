import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { generateCsrfToken } from '@/lib/auth/csrf'
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  setAuthCookies,
} from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'

const app = new Hono()

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Issues a new access token using the refresh token cookie (token rotation)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 401)
  }

  const tokenHash = hashRefreshToken(refreshToken)

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!storedToken) {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }

  if (storedToken.revokedAt) {
    return c.json({ error: 'Refresh token has been revoked' }, 401)
  }

  if (new Date() > storedToken.expiresAt) {
    return c.json({ error: 'Refresh token expired' }, 401)
  }

  // Rotate refresh token - revoke old and create new
  const newAccessToken = generateAccessToken(storedToken.userId)
  const newRefreshToken = generateRefreshToken()
  const newCsrfToken = generateCsrfToken()
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken)
  const newRefreshTokenExpiry = getRefreshTokenExpiry()

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        userId: storedToken.userId,
        expiresAt: newRefreshTokenExpiry,
      },
    }),
  ])

  setAuthCookies(c, newAccessToken, newRefreshToken, newCsrfToken)

  return c.json({
    accessToken: newAccessToken,
  })
})

export default app
