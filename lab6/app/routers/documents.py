import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.document import Document, DocumentCreate, DocumentUpdate, DocumentListResponse
from app.services.document_service import DocumentService, get_document_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=DocumentListResponse)
async def get_all_documents(
    service: DocumentService = Depends(get_document_service)
):
    """Get all documents"""
    documents = await service.get_all_documents()
    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get document by ID"""
    return await service.get_document_by_id(document_id)


@router.get("/executor/{executor}", response_model=DocumentListResponse)
async def get_documents_by_executor(
    executor: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get documents by executor name"""
    documents = await service.get_documents_by_executor(executor)
    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/status/{status}", response_model=DocumentListResponse)
async def get_documents_by_status(
    status: str,
    service: DocumentService = Depends(get_document_service)
):
    """Get documents by status (active/returned)"""
    documents = await service.get_documents_by_status(status)
    return DocumentListResponse(documents=documents, total=len(documents))


@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    service: DocumentService = Depends(get_document_service)
):
    """Create a new document"""
    return await service.create_document(document_data)


@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    service: DocumentService = Depends(get_document_service)
):
    """Update document by ID"""
    return await service.update_document(document_id, update_data)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Delete document by ID"""
    await service.delete_document(document_id)
    return {"message": "Document successfully deleted"}