FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY backend/app /app/app
COPY backend/alembic /app/alembic
COPY backend/alembic.ini /app/alembic.ini
COPY backend/scripts /app/scripts

EXPOSE 8000

CMD ["sh", "-c", "python -m alembic upgrade head && python scripts/seed_db.py || true && python scripts/seed_pnpi.py || true && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
