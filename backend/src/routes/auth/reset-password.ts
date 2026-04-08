import { Hono } from 'hono'

import { buildResetPasswordUrl, emailService } from '@/lib/auth/email'
import { hashPassword } from '@/lib/auth/password'
import { generatePasswordResetToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'
import { authRateLimits, rateLimit } from '@/lib/ratelimit'
import { resetConfirmSchema, resetRequestSchema } from '@/lib/schema/auth'

const app = new Hono()

/**
 * @swagger
 * /auth/reset-password/request:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset email to the user if they exist
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent (always returns success to prevent enumeration)
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
 */
app.post('/reset-password/request', rateLimit(authRateLimits.resetPassword), async (c) => {
  const body = await c.req.json()
  const result = resetRequestSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.errors[0].message }, 400)
  }

  const { email } = result.data

  const user = await prisma.user.findUnique({
    where: { email },
  })

  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ message: 'If an account exists with this email, a reset link has been sent' })
  }

  const resetToken = generatePasswordResetToken()
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  })

  const resetUrl = buildResetPasswordUrl(resetToken)
  await emailService.send({
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  })

  return c.json({ message: 'If an account exists with this email, a reset link has been sent' })
})

/**
 * @swagger
 * /auth/reset-password/confirm:
 *   post:
 *     summary: Confirm password reset
 *     description: Resets the user's password using the token from email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordConfirm'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/reset-password/confirm', rateLimit(authRateLimits.login), async (c) => {
  const body = await c.req.json()
  const result = resetConfirmSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.errors[0].message }, 400)
  }

  const { token, password } = result.data

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  })

  if (!user) {
    return c.json({ error: 'Invalid or expired reset token' }, 400)
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    }),
    // Invalidate all existing refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  return c.json({ message: 'Password reset successful' })
})

export default app
