import { Hono } from 'hono'

import { buildVerificationUrl, emailService } from '@/lib/auth/email'
import { hashPassword } from '@/lib/auth/password'
import { generateEmailVerificationToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db'
import { registerSchema } from '@/lib/schema/auth'

const app = new Hono()

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and sends a verification email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/register', async (c) => {
  const body = await c.req.json()
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    return c.json({ error: result.error.errors[0].message }, 400)
  }

  const { email, password } = result.data

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return c.json({ error: 'Email already in use' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const verificationToken = generateEmailVerificationToken()

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      verificationToken,
    },
  })

  const verificationUrl = buildVerificationUrl(verificationToken)
  await emailService.send({
    to: email,
    subject: 'Verify your email address',
    html: `
      <h1>Email Verification</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  })

  return c.json({ message: 'Registration successful. Please check your email to verify your account.' }, 201)
})

export default app
