from email.message import EmailMessage
import aiosmtplib
from app.core.config import settings

class EmailService:
    @staticmethod
    async def _send_email(email_to: str, subject: str, content: str):
        message = EmailMessage()
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = email_to
        message["Subject"] = subject
        message.set_content(content)

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=settings.SMTP_STARTTLS,
        )

    @classmethod
    async def send_verification_email(cls, email_to: str, token: str):
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = f"{settings.APP_NAME} - Verify your email"
        content = f"Please verify your email by clicking on the following link: {verification_url}"
        await cls._send_email(email_to, subject, content)

    @classmethod
    async def send_reset_password_email(cls, email_to: str, token: str):
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = f"{settings.APP_NAME} - Password Reset Request"
        content = f"You requested a password reset. Click here: {reset_url}"
        await cls._send_email(email_to, subject, content)
