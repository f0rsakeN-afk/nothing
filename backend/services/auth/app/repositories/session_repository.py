from typing import List, Optional
import uuid
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.session import UserSession

class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, session: UserSession) -> UserSession:
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_by_jti(self, jti: str) -> Optional[UserSession]:
        result = await self.db.execute(select(UserSession).where(UserSession.jti == jti))
        return result.scalar_one_or_none()

    async def get_active_by_user(self, user_id: uuid.UUID) -> List[UserSession]:
        result = await self.db.execute(
            select(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_revoked == False)
            .order_by(UserSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def revoke_by_id(self, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            update(UserSession)
            .where(UserSession.id == session_id, UserSession.user_id == user_id)
            .values(is_revoked=True)
        )
        return result.rowcount > 0

    async def revoke_all_for_user(self, user_id: uuid.UUID, except_jti: str | None = None) -> None:
        query = update(UserSession).where(UserSession.user_id == user_id)
        if except_jti:
            query = query.where(UserSession.jti != except_jti)
        await self.db.execute(query.values(is_revoked=True))
