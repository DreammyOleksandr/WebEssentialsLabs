from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.with_info_plain_validator_function(
            cls._validate,
            serialization=core_schema.to_string_ser_schema(),
        )
    
    @classmethod
    def _validate(cls, value, info=None):
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str):
            if ObjectId.is_valid(value):
                return ObjectId(value)
        raise ValueError("Invalid ObjectId")


class DocumentBase(BaseModel):
    """Base document model with common fields"""
    executor: str = Field(..., min_length=5, max_length=100, description="Виконавець документа")
    document: str = Field(..., min_length=5, max_length=200, description="Назва документа")
    dateGiven: datetime = Field(..., description="Дата передачі документа")
    dateReturned: Optional[datetime] = Field(None, description="Дата повернення документа")

    @field_validator('dateGiven')
    @classmethod
    def validate_date_given(cls, v):
        now = datetime.now(timezone.utc) if v.tzinfo else datetime.now()
        if v > now:
            raise ValueError('Дата передачі не може бути в майбутньому')
        return v

    @field_validator('dateReturned')
    @classmethod
    def validate_date_returned(cls, v, info):
        if v and 'dateGiven' in info.data:
            date_given = info.data['dateGiven']
            # Handle timezone consistency
            if v.tzinfo and date_given.tzinfo:
                if v < date_given:
                    raise ValueError('Дата повернення не може бути раніше дати передачі')
            elif not v.tzinfo and not date_given.tzinfo:
                if v < date_given:
                    raise ValueError('Дата повернення не може бути раніше дати передачі')
            else:
                # Convert to UTC for comparison
                v_utc = v.replace(tzinfo=timezone.utc) if not v.tzinfo else v.astimezone(timezone.utc)
                given_utc = date_given.replace(tzinfo=timezone.utc) if not date_given.tzinfo else date_given.astimezone(timezone.utc)
                if v_utc < given_utc:
                    raise ValueError('Дата повернення не може бути раніше дати передачі')
        return v


class DocumentCreate(DocumentBase):
    """Document creation model"""
    pass


class DocumentUpdate(BaseModel):
    """Document update model"""
    executor: Optional[str] = Field(None, min_length=5, max_length=100)
    document: Optional[str] = Field(None, min_length=5, max_length=200)
    dateGiven: Optional[datetime] = None
    dateReturned: Optional[datetime] = None

    @field_validator('dateGiven')
    @classmethod
    def validate_date_given(cls, v):
        if v:
            now = datetime.now(timezone.utc) if v.tzinfo else datetime.now()
            if v > now:
                raise ValueError('Дата передачі не може бути в майбутньому')
        return v


class Document(DocumentBase):
    """Full document model with database fields"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    @property
    def status(self) -> str:
        """Document status based on dateReturned"""
        return "returned" if self.dateReturned else "active"


class DocumentListResponse(BaseModel):
    """Response model for document lists"""
    documents: List[Document]
    total: int