# app/api/api_v1/endpoints/auth.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm  # Для форми логіну
from sqlalchemy.orm import Session
from typing import List, Any  # Додав Any
from datetime import timedelta  # Для часу життя токена

from app.db import crud
from app.schemas import user as user_schema
from app.schemas.user import Token  # Імпортуємо схему Token
from app.api.api_v1 import deps
from app.core import security  # Імпортуємо наш модуль security
from app.core.config import settings  # Для часу життя токена

from app.schemas import UserUpdate

router = APIRouter()


# Ендпоінт для створення користувачів (може бути відкритим для реєстрації або захищеним для адмінів)
@router.post("/users/", response_model=user_schema.UserRead, status_code=status.HTTP_201_CREATED, summary="Create new user (Admins only)")
def create_new_user(
    user: user_schema.UserCreate,
    db: Session = Depends(deps.get_db),
    # current_admin: user_schema.UserRead = Depends(deps.get_current_active_admin) # <--- ЗАХИСТ
):
    db_user = crud.user.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.user.create_user(db=db, user_in=user)


@router.post("/token", response_model=user_schema.Token, summary="Login For Access Token")
async def login_for_access_token(
        db: Session = Depends(deps.get_db),
        form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud.user.authenticate_user(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # ВИПРАВЛЕННЯ: Передаємо роль користувача при створенні токена
    access_token = security.create_access_token(
        subject=user.username,
        user_role=user.role,  # <--- ПЕРЕДАЄМО РОЛЬ
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me/", response_model=user_schema.UserRead, summary="Get current user")
async def read_users_me(
    current_user: user_schema.UserRead = Depends(deps.get_current_active_user)
):
    return current_user


# Залишаємо ці ендпоінти, якщо вони потрібні для адміністрування без захисту (або захистимо їх пізніше)
@router.get("/users/", response_model=List[user_schema.UserRead], summary="List users (Admins only)")
def read_users(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_admin: user_schema.UserRead = Depends(deps.get_current_active_admin) # <--- ЗАХИСТ
):
    users = crud.user.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/users/{user_id}", response_model=user_schema.UserRead, summary="Get user by ID (Admins only)")
def read_user(
    user_id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_admin: user_schema.UserRead = Depends(deps.get_current_active_admin) # <--- ЗАХИСТ
):
    db_user = crud.user.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.put("/users/{user_id}", response_model=user_schema.UserRead, summary="Update a user (Admins only)")
def update_user_data(
        user_id: uuid.UUID,
        user_in: UserUpdate,
        db: Session = Depends(deps.get_db),
        current_admin: user_schema.UserRead = Depends(deps.get_current_active_admin)  # Захист
):
    """
    Оновити дані користувача. Доступно тільки для адміністраторів.
    """
    db_user = crud.user.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Перевірка на унікальність username, якщо він змінюється
    if user_in.username and user_in.username != db_user.username:
        existing_user = crud.user.get_user_by_username(db, username=user_in.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already registered")

    updated_user = crud.user.update_user(db=db, db_user=db_user, user_in=user_in)
    return updated_user


@router.delete("/users/{user_id}", response_model=user_schema.UserRead, summary="Delete a user (Admins only)")
def delete_user_data(
        user_id: uuid.UUID,
        db: Session = Depends(deps.get_db),
        current_admin: user_schema.UserRead = Depends(deps.get_current_active_admin)  # Захист
):
    """
    Видалити користувача. Доступно тільки для адміністраторів.
    Адміністратор не може видалити сам себе.
    """
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot delete themselves")

    db_user = crud.user.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    deleted_user = crud.user.delete_user(db=db, user_id=user_id)
    return deleted_user