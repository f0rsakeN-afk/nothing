from uuid import UUID
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.verification import VerificationToken

class VerificationTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_token(self, token: str) -> VerificationToken | None:
        query = select(VerificationToken).where(VerificationToken.token == token)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, verification_token: VerificationToken) -> VerificationToken:
        self.db.add(verification_token)
        return verification_token

    async def delete_by_user_id(self, user_id: UUID):
        query = select(VerificationToken).where(VerificationToken.user_id == user_id)
        result = await self.db.execute(query)
        tokens = result.scalars().all()
        for token in tokens:
            await self.db.delete(token)
