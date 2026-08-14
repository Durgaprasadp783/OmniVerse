from datetime import datetime
from typing import List, Optional


from pydantic import BaseModel, ConfigDict, Field


class FileResponseSchema(BaseModel):
    id: str = Field(..., description="Document ID in MongoDB")
    _id: Optional[str] = None
    userId: str
    filename: str
    originalName: str
    fileType: str
    size: int
    path: str
    extractedText: Optional[str] = ""
    pageCount: Optional[int] = 0
    wordCount: Optional[int] = 0
    processed: Optional[bool] = False
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RenameFileRequestSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="New document title")


class AdvancedSearchRequestSchema(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    fileIds: Optional[List[str]] = None
    page: Optional[int] = None
    topK: Optional[int] = 5


class FileUploadSuccessSchema(BaseModel):
    success: bool = True
    message: str = "File uploaded successfully"
    file: FileResponseSchema


class ProcessedFileSummarySchema(BaseModel):
    id: str
    originalName: str
    pages: int
    processed: bool = True


class ProcessFileResponseSchema(BaseModel):
    success: bool = True
    message: str = "PDF processed and text saved successfully"
    file: ProcessedFileSummarySchema


class ChunkFileResponseSchema(BaseModel):
    success: bool = True
    message: str = "Document chunked successfully"
    fileId: str
    chunkCount: int


class EmbedFileResponseSchema(BaseModel):
    success: bool = True
    message: str = "Embeddings generated successfully"
    fileId: str
    chunksProcessed: int


class SearchFileRequestSchema(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000, description="Query string for semantic vector search (max 5000 chars)")
    topK: Optional[int] = Field(5, description="Top K most similar chunks to return")


class ChunkSourceSchema(BaseModel):
    """Provenance metadata for a retrieved chunk."""
    fileId: str
    filename: str
    page: Optional[int] = None
    chunkIndex: Optional[int] = None


class SearchResultChunkSchema(BaseModel):
    chunkId: str
    chunkIndex: int
    text: str
    score: float
    source: Optional[ChunkSourceSchema] = None


class SearchFileResponseSchema(BaseModel):
    success: bool = True
    query: str
    results: List[SearchResultChunkSchema]


class ChatFileRequestSchema(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000, description="User question to ask against document (max 5000 chars)")
    topK: Optional[int] = Field(5, description="Top K chunks to retrieve for context")


class RagSourceSchema(BaseModel):
    source: int
    chunkId: str
    chunkIndex: int
    score: float
    similarity: Optional[float] = None
    # Source provenance — populated by Phase 5 Step 1 retrieval
    fileId: Optional[str] = None
    filename: Optional[str] = None
    page: Optional[int] = None


class ChatFileResponseSchema(BaseModel):
    success: bool = True
    query: str
    answer: str
    sources: List[RagSourceSchema]


class ChatMessageSchema(BaseModel):
    id: str
    _id: Optional[str] = None
    userId: str
    fileId: str
    role: str
    content: str
    sources: Optional[List[RagSourceSchema]] = []
    createdAt: Optional[datetime] = None








