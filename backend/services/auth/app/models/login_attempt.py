from datetime import datetime, timezone
import uuid
from sqlalchemy import String, DateTime, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    count: Mapped[int] = mapped_column(Integer, default=1)
    last_attempt: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    blocked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_login_attempts_ip_blocked", "ip_address", "blocked_until"),
    )
