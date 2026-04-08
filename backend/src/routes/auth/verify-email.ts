import { Hono } from 'hono'

import { buildVerificationUrl, emailService } from '@/lib/auth/email'
import { generateEmailVerificationToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'
import { verifyEmailSchema } from '@/lib/schema/auth'
import { authMiddleware, getUserId } from '@/middleware/auth'

const app = new Hono()

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address
 *     description: Verifies user's email using the token from the verification link
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token from email
 *     responses:
 *       200:
 *         description: Email verified successfully
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
app.get('/verify-email/:token', async (c) => {
  const token = c.req.param('token')

  const result = verifyEmailSchema.safeParse({ token })
  if (!result.success) {
    return c.json({ error: 'Invalid verification token' }, 400)
  }

  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  })

  if (!user) {
    return c.json({ error: 'Invalid or expired verification token' }, 400)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
    },
  })

  return c.json({ message: 'Email verified successfully' })
})

/**
 * @swagger
 * /auth/verify-email/resend:
 *   post:
 *     summary: Resend verification email
 *     description: Sends a new verification email to the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Email already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/verify-email/resend', authMiddleware(), async (c) => {
  const userId = getUserId(c)

  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  if (user.emailVerified) {
    return c.json({ error: 'Email already verified' }, 400)
  }

  const verificationToken = generateEmailVerificationToken()

  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken },
  })

  const verificationUrl = buildVerificationUrl(verificationToken)
  await emailService.send({
    to: user.email,
    subject: 'Verify your email address',
    html: `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  })

  return c.json({ message: 'Verification email sent' })
})

export default app
