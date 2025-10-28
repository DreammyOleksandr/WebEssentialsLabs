import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection manager with proper async patterns"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.database_name = "documents_lab4"  # Same as lab4/5
        
    async def connect(self):
        """Create database connection"""
        try:
            self.client = AsyncIOMotorClient("mongodb://localhost:27017")
            self.database = self.client[self.database_name]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info(f"Connected to MongoDB database: {self.database_name}")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
            
    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("Closed MongoDB connection")
            
    async def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance with connection check"""
        if self.database is None:
            await self.connect()
        return self.database

# Global database manager instance
db_manager = DatabaseManager()

async def get_database() -> AsyncIOMotorDatabase:
    """Dependency injection function for FastAPI"""
    return await db_manager.get_database()

async def connect_to_mongo():
    """Connect to MongoDB - called at startup"""
    await db_manager.connect()

async def close_mongo_connection():
    """Close MongoDB connection - called at shutdown"""
    await db_manager.close()