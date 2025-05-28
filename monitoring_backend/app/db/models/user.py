import uuid

from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base
from app.db.models.enums import UserRoleEnum


class User(Base):

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRoleEnum, name="user_role_enum_type", create_type=True), nullable=False, default=UserRoleEnum.user) # SAEnum для бази даних
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)