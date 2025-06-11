# app/api/api_v1/deps.py
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pydantic import ValidationError  # Для обробки помилок валідації токена

from app.db.database import SessionLocal
from app.core.config import settings
from app.db import crud  # Припускаємо, що crud_user імпортується через crud
from app.db.models.user import User as UserModel  # Даємо аліас моделі
from app.schemas.user import TokenData  # Якщо використовуєш TokenData

from app.db.models import UserRoleEnum

# OAuth2PasswordBearer вказує на URL ендпоінта для отримання токена
# Важливо, щоб цей URL був повним шляхом відносно кореня API, 
# якщо app.include_router(..., prefix="/api/v1")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
        db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> Optional[UserModel]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
        # Якщо ти використовуєш TokenData для валідації payload:
        # token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    except ValidationError:  # Якщо використовуєш Pydantic для payload
        raise credentials_exception

    user = crud.crud_user.get_user_by_username(db, username=username)  # Використовуємо crud.crud_user
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
        current_user: UserModel = Depends(get_current_user),
) -> UserModel:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_active_admin(
    current_user: UserModel = Depends(get_current_active_user),
) -> UserModel:
    if current_user.role != UserRoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user