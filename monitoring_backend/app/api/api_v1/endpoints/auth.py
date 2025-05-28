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

router = APIRouter()


# Ендпоінт для створення користувачів (може бути відкритим для реєстрації або захищеним для адмінів)
@router.post("/users/", response_model=user_schema.UserRead, status_code=status.HTTP_201_CREATED,
             summary="Create new user")
def create_new_user(user: user_schema.UserCreate, db: Session = Depends(deps.get_db)):
    db_user = crud.crud_user.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.crud_user.create_user(db=db, user_in=user)


@router.post("/token", response_model=Token, summary="Login For Access Token")
async def login_for_access_token(
        db: Session = Depends(deps.get_db),
        form_data: OAuth2PasswordRequestForm = Depends()
):
    user = crud.crud_user.authenticate_user(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.username, expires_delta=access_token_expires  # Передаємо username як subject
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me/", response_model=user_schema.UserRead, summary="Get current user")
async def read_users_me(
        current_user: user_schema.UserRead = Depends(deps.get_current_active_user)  # Захищено!
):
    return current_user


# Залишаємо ці ендпоінти, якщо вони потрібні для адміністрування без захисту (або захистимо їх пізніше)
@router.get("/users/", response_model=List[user_schema.UserRead], summary="List users (requires auth)",
            dependencies=[Depends(deps.get_current_active_user)])  # <--- Додано захист
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(deps.get_db)):
    users = crud.crud_user.get_users(db, skip=skip, limit=limit)
    return users


@router.get("/users/{user_id}", response_model=user_schema.UserRead, summary="Get user by ID (requires auth)",
            dependencies=[Depends(deps.get_current_active_user)])  # <--- Додано захист
def read_user(user_id: uuid.UUID, db: Session = Depends(deps.get_db)):
    db_user = crud.crud_user.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
