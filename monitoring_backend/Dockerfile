# Використовуємо офіційний Python образ
FROM python:3.11-slim

# Встановлюємо робочий каталог всередині контейнера
WORKDIR /app

# Встановлюємо змінні оточення для Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Встановлюємо системні залежності (якщо потрібні, наприклад, для psycopg2 або інших бібліотек)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Копіюємо файл залежностей та встановлюємо їх
# Використовуємо цей крок окремо для кешування залежностей Docker'ом
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо решту коду додатку
COPY . .

# Команда для запуску міграцій Alembic (виконуватиметься при першому запуску або окремою командою)
# CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

# За замовчуванням просто запускаємо Uvicorn. Міграції краще запускати окремою командою
# або через entrypoint скрипт, який перевіряє стан БД.
# Для простоти MVP, припустимо, міграції будуть застосовані перед запуском docker-compose up,
# або ми додамо entrypoint скрипт пізніше.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]