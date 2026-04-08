import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { hashRefreshToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'
import { authMiddleware, getUserId } from '@/middleware/auth'

const app = new Hono()

// Apply auth middleware to all routes
app.use('/', authMiddleware())

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: List all active sessions
 *     description: Returns all active refresh tokens/sessions for the authenticated user
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       isCurrent:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const currentRefreshToken = getCookie(c, 'refresh_token')
  const currentTokenHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null

  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      tokenHash: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: currentTokenHash === s.tokenHash,
    })),
  })
})

/**
 * @swagger
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: Revokes a specific refresh token by ID
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/:id', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const sessionId = c.req.param('id')

  const session = await prisma.refreshToken.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
  })

  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }

  await prisma.refreshToken.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  })

  return c.json({ message: 'Session revoked successfully' })
})

/**
 * @swagger
 * /auth/sessions:
 *   delete:
 *     summary: Revoke all sessions
 *     description: Revokes all refresh tokens except the current one
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const currentRefreshToken = getCookie(c, 'refresh_token')
  const currentTokenHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : null

  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      tokenHash: currentTokenHash ? { not: currentTokenHash } : undefined,
    },
    data: { revokedAt: new Date() },
  })

  return c.json({ message: 'All other sessions revoked successfully' })
})

export default app
