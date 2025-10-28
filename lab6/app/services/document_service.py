import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.database.connection import get_database
from app.models.document import Document, DocumentCreate, DocumentUpdate

logger = logging.getLogger(__name__)

class DocumentService:
    """Document service with proper error handling and logging"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.documents

    async def create_document(self, document_data: DocumentCreate) -> Document:
        """Create a new document"""
        try:
            # Create document with timestamps
            doc_dict = document_data.model_dump()
            doc_dict.update({
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            })
            
            # Insert into database
            result = await self.collection.insert_one(doc_dict)
            
            # Retrieve and return the created document
            created_doc = await self.collection.find_one({"_id": result.inserted_id})
            if not created_doc:
                raise HTTPException(status_code=500, detail="Failed to retrieve created document")
            
            logger.info(f"Created document with ID: {result.inserted_id}")
            return Document(**created_doc)
            
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")

    async def get_all_documents(self) -> List[Document]:
        """Get all documents sorted by dateGiven descending"""
        try:
            cursor = self.collection.find().sort("dateGiven", -1)
            documents = []
            
            async for doc in cursor:
                try:
                    documents.append(Document(**doc))
                except Exception as e:
                    logger.warning(f"Skipping invalid document {doc.get('_id')}: {e}")
                    continue
            
            logger.info(f"Retrieved {len(documents)} documents")
            return documents
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")

    async def get_document_by_id(self, document_id: str) -> Document:
        """Get document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                raise HTTPException(status_code=400, detail="Invalid document ID format")
            
            doc = await self.collection.find_one({"_id": ObjectId(document_id)})
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            return Document(**doc)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving document {document_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve document: {str(e)}")

    async def get_documents_by_executor(self, executor: str) -> List[Document]:
        """Get documents by executor name (case-insensitive search)"""
        try:
            cursor = self.collection.find({
                "executor": {"$regex": executor, "$options": "i"}
            }).sort("dateGiven", -1)
            
            documents = []
            async for doc in cursor:
                try:
                    documents.append(Document(**doc))
                except Exception as e:
                    logger.warning(f"Skipping invalid document {doc.get('_id')}: {e}")
                    continue
            
            logger.info(f"Found {len(documents)} documents for executor: {executor}")
            return documents
            
        except Exception as e:
            logger.error(f"Error searching documents by executor {executor}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to search documents: {str(e)}")

    async def get_documents_by_status(self, status: str) -> List[Document]:
        """Get documents by status (active/returned)"""
        try:
            if status not in ["active", "returned"]:
                raise HTTPException(
                    status_code=400, 
                    detail='Invalid status. Use "active" or "returned"'
                )
            
            # Build query based on status
            if status == "active":
                query = {"dateReturned": None}
            else:  # returned
                query = {"dateReturned": {"$ne": None}}
            
            cursor = self.collection.find(query).sort("dateGiven", -1)
            documents = []
            
            async for doc in cursor:
                try:
                    documents.append(Document(**doc))
                except Exception as e:
                    logger.warning(f"Skipping invalid document {doc.get('_id')}: {e}")
                    continue
            
            logger.info(f"Found {len(documents)} documents with status: {status}")
            return documents
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error filtering documents by status {status}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to filter documents: {str(e)}")

    async def update_document(self, document_id: str, update_data: DocumentUpdate) -> Document:
        """Update document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                raise HTTPException(status_code=400, detail="Invalid document ID format")
            
            # Build update dictionary (only include non-None fields)
            update_dict = {}
            for field, value in update_data.model_dump(exclude_unset=True).items():
                if value is not None:
                    update_dict[field] = value
            
            if not update_dict:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            # Add updated timestamp
            update_dict["updatedAt"] = datetime.now(timezone.utc)
            
            # Update document
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(document_id)},
                {"$set": update_dict},
                return_document=True
            )
            
            if not result:
                raise HTTPException(status_code=404, detail="Document not found")
            
            logger.info(f"Updated document {document_id}")
            return Document(**result)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")

    async def delete_document(self, document_id: str) -> bool:
        """Delete document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                raise HTTPException(status_code=400, detail="Invalid document ID format")
            
            result = await self.collection.delete_one({"_id": ObjectId(document_id)})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Document not found")
            
            logger.info(f"Deleted document {document_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


def get_document_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> DocumentService:
    """Dependency injection for DocumentService"""
    return DocumentService(db)