import { Hono } from 'hono'
import { z } from 'zod'

import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db'
import { authRateLimits, rateLimit } from '@/lib/ratelimit'
import { authMiddleware, getUserId } from '@/middleware/auth'

const app = new Hono()

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain uppercase, lowercase, number, and special character'),
})

// Apply auth middleware to all routes
app.use('/', authMiddleware())

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Update password
 *     description: Updates the user's password after verifying the current password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (must meet complexity requirements)
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid current password or unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/', rateLimit(authRateLimits.login), async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json()
  const result = updatePasswordSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.errors[0].message }, 400)
  }

  const { currentPassword, newPassword } = result.data

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
  if (!isValidPassword) {
    return c.json({ error: 'Current password is incorrect' }, 401)
  }

  const newPasswordHash = await hashPassword(newPassword)

  // Update password and revoke all refresh tokens (force re-login)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  return c.json({ message: 'Password updated successfully. Please login again.' })
})

export default app
