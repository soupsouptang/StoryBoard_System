"""FastAPI Application entrypoint for FrameForge Modular Backend.

Conforms to ARCHITECTURE_MIGRATION.md Section 35.3:
- Clear API boundary
- Request validation with Pydantic V2
- Dependency-injected database/repository sessions
- Decoupled domain services
"""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi_app.routers import (
    ai_router,
    exports_router,
    fields_router,
    presence_router,
    projects_router,
    shots_router,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="FrameForge Modular API",
        version="1.0.0",
        description="FrameForge Professional Storyboard & Shot Production Management API",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handlers
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "internal_server_error", "message": str(exc)},
        )

    # Health Check
    @app.get("/api/health")
    def health_check():
        return {"status": "ok", "engine": "fastapi", "version": "1.0.0"}

    # Include Routers
    app.include_router(projects_router)
    app.include_router(shots_router)
    app.include_router(presence_router)
    app.include_router(ai_router)
    app.include_router(fields_router)
    app.include_router(exports_router)

    return app


app = create_app()
