# app/db/crud/crud_user.py
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate  # UserUpdate тут не потрібен для змін
from app.core.security import get_password_hash, verify_password  # <--- Імпорт функцій безпеки


def get_user(db: Session, user_id: uuid.UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_password = get_password_hash(user_in.password)  # <--- Хешуємо пароль
    db_user = User(
        username=user_in.username,
        hashed_password=hashed_password,  # <--- Зберігаємо хеш
        full_name=user_in.full_name,
        role=user_in.role,  # Згідно зі схемою, UserCreate має role
        is_active=user_in.is_active if user_in.is_active is not None else True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username=username)
    if not user:
        return None
    if not user.is_active:  # Додаткова перевірка, чи активний користувач
        return None  # Або можна кидати виключення "User inactive"
    if not verify_password(plain_password=password, hashed_password=user.hashed_password):
        return None
    return user


# Функція update_user та delete_user залишаються без змін, якщо ти не плануєш
# змінювати пароль через update_user без спеціальної логіки (наприклад, перевірки старого пароля)
# Якщо update_user все ж має оновлювати пароль, то там теж потрібно додати хешування.
# Поки що для MVP припустимо, що зміна пароля - окрема функціональність.
def update_user(db: Session, db_user: User,
                user_in: UserUpdate) -> User:  # user_schema імпортуємо з app.schemas
    update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        # Якщо реалізуємо зміну пароля тут, то:
        hashed_password = get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
        del update_data["password"]  # Видаляємо, щоб не намагатися встановити атрибут двічі

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: uuid.UUID) -> Optional[User]:  # ... як було ...
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user