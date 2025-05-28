# app/schemas/user.py
from pydantic import BaseModel, ConfigDict # EmailStr, якщо буде email
from typing import Optional
import uuid
from datetime import datetime
from app.db.models.enums import UserRoleEnum # Переконайся, що цей enum існує

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.user # Значення за замовчуванням
    is_active: Optional[bool] = True      # Значення за замовчуванням

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel): # Для оновлення можна зробити всі поля опціональними
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None # Для зміни пароля
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None

class UserInDBBase(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    # hashed_password не повертаємо клієнту
    created_at: datetime
    last_login_at: Optional[datetime] = None

class UserRead(UserInDBBase):
    pass

# Схеми для токенів (залишаються без змін або перевір, чи вони вже є)
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    # Можна додати user_id сюди, якщо використовуєш його в токені
    # user_id: Optional[str] = None