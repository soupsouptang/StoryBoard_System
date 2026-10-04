"""Router package exports."""

from fastapi_app.routers.projects import router as projects_router
from fastapi_app.routers.shots import router as shots_router
from fastapi_app.routers.presence import router as presence_router
from fastapi_app.routers.ai import router as ai_router
from fastapi_app.routers.exports import router as exports_router
from fastapi_app.routers.fields import router as fields_router

__all__ = [
    "projects_router",
    "shots_router",
    "presence_router",
    "ai_router",
    "exports_router",
    "fields_router",
]
