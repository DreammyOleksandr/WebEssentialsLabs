from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routers.documents import router as documents_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Lab6 Document Management API",
    description="FastAPI-based document management system with Swagger documentation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Lab6 Document Management API",
        "documentation": "/docs",
        "alternative_docs": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "lab6-document-api"}