import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { clearAuthCookies, hashRefreshToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'

const app = new Hono()

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Revokes the current refresh token and clears cookies
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken)
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }).catch(() => {
      // Token may not exist in DB if it was already used or expired
    })
  }

  clearAuthCookies(c)

  return c.json({ message: 'Logged out successfully' })
})

export default app
