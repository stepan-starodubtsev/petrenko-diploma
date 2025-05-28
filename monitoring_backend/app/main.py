from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.api_v1.endpoints.api import api_router_v1
from app.core.config import settings
from app.background_tasks.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    start_scheduler()
    yield
    print("Application shutdown...")
    shutdown_scheduler()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router_v1, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}
