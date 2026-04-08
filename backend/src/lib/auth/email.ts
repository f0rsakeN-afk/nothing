export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export interface EmailService {
  send(options: EmailOptions): Promise<void>
}

class ConsoleEmailService implements EmailService {
  async send(options: EmailOptions): Promise<void> {
    console.log('=== Email Service (Console) ===')
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Body:\n${options.html}`)
    console.log('===============================')
  }
}

// TODO: Replace with real email service (Resend, SendGrid, SES, etc.)
export const emailService: EmailService = new ConsoleEmailService()

export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3001'
}

export function buildVerificationUrl(token: string): string {
  return `${getFrontendUrl()}/auth/verify-email?token=${token}`
}

export function buildResetPasswordUrl(token: string): string {
  return `${getFrontendUrl()}/auth/reset-password?token=${token}`
}
