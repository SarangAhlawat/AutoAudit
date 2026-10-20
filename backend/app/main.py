from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.db.session import init_db
from backend.app.api.health import router as health_router
from backend.app.api.contracts import router as contracts_router
from backend.app.api.findings import router as findings_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.playbooks import router as playbooks_router
from backend.app.api.organization import router as organization_router
from backend.app.api.auth import router as auth_router
from backend.app.api.policy_documents import router as policy_docs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="AutoAudit: Contract-review assistance system for legal, compliance, and procurement teams.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins() + ["*"],  # allow local dev access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(contracts_router, prefix="/api/v1")
app.include_router(findings_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(playbooks_router, prefix="/api/v1")
app.include_router(organization_router, prefix="/api/v1")
app.include_router(policy_docs_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/api/v1/health",
        "disclaimer": "AutoAudit provides decision-support analysis, not legal advice.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
