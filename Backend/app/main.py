import logging

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.db import engine
from app.routers import accounts, auth, dashboard, transactions
from app.services.ledger import LedgerError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fintech")

if settings.environment == "production" and settings.secret_key == "change-me-in-production":
    raise RuntimeError("SECRET_KEY debe configurarse en producción")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(LedgerError)
async def ledger_error_handler(_: Request, exc: LedgerError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


api = APIRouter(prefix="/api")


@api.get("/health", tags=["health"])
def health() -> dict[str, str]:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


api.include_router(auth.router)
api.include_router(accounts.router)
api.include_router(transactions.router)
api.include_router(dashboard.router)
app.include_router(api)
