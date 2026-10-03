"""FrameForge Core FastAPI Main Entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.assets import router as assets_router
from app.api.v1.boards import router as boards_router
from app.api.v1.custom_fields import router as custom_fields_router
from app.api.v1.exports import router as exports_router
from app.api.v1.health import router as health_router
from app.api.v1.history import router as history_router
from app.api.v1.imports import router as imports_router
from app.api.v1.ai import router as ai_router
from app.api.v1.presence import router as presence_router
from app.api.v1.panel_media import router as panel_media_router
from app.api.v1.productions import router as productions_router
from app.api.v1.review import router as review_router
from app.api.v1.saved_views import router as saved_views_router
from app.api.v1.shares import router as shares_router
from app.api.v1.shots import router as shots_router
from app.api.v1.versions import router as versions_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, async_engine
from app.services.seed import seed_database

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("frameforge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic is the only schema owner in every environment.
    if settings.ENVIRONMENT != "production":
        logger.info("Development/Test mode: schema must be applied by Alembic before startup.")
        async with AsyncSessionLocal() as session:
            await seed_database(session)
            await session.commit()
        logger.info("Development seed data confirmed.")
    else:
        logger.info("Production mode: schema ownership belongs to Alembic migrations.")

    yield
    # Shutdown
    await async_engine.dispose()
    logger.info("FrameForge server shutdown complete.")


app = FastAPI(
    title="FrameForge Professional Storyboard OS API",
    version="1.0.0",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT == "production" else "/openapi.json",
    lifespan=lifespan
)

# CORS Configuration - explicitly constrained origins per environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Page-Count"],
)


# Standard Error Contract Interceptor (Spec Section 136-137)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail), "details": {}}}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "请求参数校验失败",
                "details": {"errors": [
                    {key: error[key] for key in ("loc", "msg", "type")}
                    for error in exc.errors()
                ]}
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Exception: %r", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "服务器内部错误，请稍后再试",
                "details": {"error_type": type(exc).__name__}
            }
        }
    )


# Mount API Routes
app.include_router(health_router, prefix="")
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(history_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(custom_fields_router, prefix=settings.API_V1_PREFIX)
app.include_router(productions_router, prefix=settings.API_V1_PREFIX)
app.include_router(assets_router, prefix=settings.API_V1_PREFIX)
app.include_router(boards_router, prefix=settings.API_V1_PREFIX)
app.include_router(shots_router, prefix=settings.API_V1_PREFIX)
app.include_router(panel_media_router, prefix=settings.API_V1_PREFIX)
app.include_router(review_router, prefix=settings.API_V1_PREFIX)
app.include_router(saved_views_router, prefix=settings.API_V1_PREFIX)
app.include_router(versions_router, prefix=settings.API_V1_PREFIX)
app.include_router(imports_router, prefix=settings.API_V1_PREFIX)
app.include_router(exports_router, prefix=settings.API_V1_PREFIX)
app.include_router(shares_router, prefix=settings.API_V1_PREFIX)
app.include_router(shares_router, prefix="")  # Public /share/{token} endpoint
app.include_router(ai_router, prefix=settings.API_V1_PREFIX)
app.include_router(presence_router, prefix=settings.API_V1_PREFIX)
app.include_router(presence_router, prefix="")  # Support /ws/presence/{production_id} directly


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=(settings.ENVIRONMENT == "development")
    )
