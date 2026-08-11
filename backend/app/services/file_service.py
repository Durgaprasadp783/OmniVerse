import os
import random
import time
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import HTTPException, UploadFile, status

from app.config.database import chat_messages_collection, chunks_collection, files_collection
from app.models.chat_message import ChatMessageModel
from app.models.chunk import ChunkModel

from app.models.file import FileModel
from app.services.chunk_service import split_text_into_chunks
from app.services.document_processor import extract_pdf_text
from app.services.embedding_service import generate_embedding
from app.services.rag_service import generate_rag_answer
from app.services.vector_search_service import search_similar_chunks





ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
    "image/jpg",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def format_file_doc(doc: dict) -> dict:
    """Format MongoDB document into a clean API response dict."""
    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "userId": str(doc.get("userId")),
        "filename": doc.get("filename"),
        "originalName": doc.get("originalName"),
        "fileType": doc.get("fileType"),
        "size": doc.get("size"),
        "path": doc.get("path"),
        "extractedText": doc.get("extractedText", ""),
        "pageCount": doc.get("pageCount", 0),
        "processed": doc.get("processed", False),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }



class FileService:

    @staticmethod
    async def upload_file(user_id: str, upload_file: UploadFile) -> dict:
        """
        Validate, save file to disk in uploads/, and record metadata in MongoDB.
        """
        # Validate MIME type
        if upload_file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported File Type",
            )

        # Read file contents to verify size
        content = await upload_file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum limit of 20MB",
            )

        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        original_filename = upload_file.filename or "unnamed_file"
        timestamp = int(time.time() * 1000)
        ext = os.path.splitext(original_filename)[1]
        random_suffix = random.randint(100000000, 999999999)
        unique_filename = f"{timestamp}-{random_suffix}{ext}"
        file_path = os.path.join("uploads", unique_filename)
        abs_file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save file to disk
        with open(abs_file_path, "wb") as out_file:
            out_file.write(content)

        # Create record in DB
        file_model = FileModel(
            user_id=user_id,
            filename=unique_filename,
            original_name=original_filename,
            file_type=upload_file.content_type or "application/octet-stream",
            size=len(content),
            path=file_path.replace("\\", "/"),
        )

        doc = file_model.to_dict()
        result = await files_collection.insert_one(doc)
        inserted_doc = await files_collection.find_one({"_id": result.inserted_id})

        return format_file_doc(inserted_doc)

    @staticmethod
    async def get_user_files(user_id: str) -> List[dict]:
        """Fetch all files uploaded by the user."""
        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        cursor = files_collection.find({"userId": {"$in": [user_id, user_obj_id]}}).sort("createdAt", -1)
        docs = await cursor.to_list(length=500)
        return [format_file_doc(d) for d in docs]

    @staticmethod
    async def get_user_file_by_id(user_id: str, file_id: str) -> dict:
        """Fetch a specific file by ID ensuring user ownership."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        file_doc = await files_collection.find_one({
            "_id": obj_id,
            "userId": {"$in": [user_id, user_obj_id]},
        })

        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        return format_file_doc(file_doc)



    @staticmethod
    async def delete_user_file(user_id: str, file_id: str) -> bool:
        """Delete file record and physical file from disk."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or unauthorized",
            )

        # Remove physical file if present
        rel_path = file_doc.get("path", "")
        if rel_path:
            abs_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), rel_path
            )
            if os.path.exists(abs_path):
                try:
                    os.remove(abs_path)
                except OSError:
                    pass

        await files_collection.delete_one({"_id": obj_id})
        return True

    @staticmethod
    async def process_file(user_id: str, file_id: str) -> dict:
        """Extract text content and page count from a user's uploaded PDF file."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        if file_doc.get("fileType") != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported currently",
            )

        try:
            result = extract_pdf_text(file_doc.get("path", ""))
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(error),
            )

        extracted_text = result.get("text", "")
        pages_count = result.get("pages", 0)

        now = datetime.now(timezone.utc)
        await files_collection.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "extractedText": extracted_text,
                    "pageCount": pages_count,
                    "processed": True,
                    "updatedAt": now,
                }
            },
        )

        return {
            "success": True,
            "message": "PDF processed and text saved successfully",
            "file": {
                "id": str(file_doc["_id"]),
                "originalName": file_doc.get("originalName"),
                "pages": pages_count,
                "processed": True,
            },
        }

    @staticmethod
    async def chunk_file(user_id: str, file_id: str) -> dict:
        """Chunk an extracted PDF file into text segments."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        if not file_doc.get("processed") or not file_doc.get("extractedText"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be processed before chunking",
            )

        # Remove existing chunks so re-processing doesn't create duplicates
        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        await chunks_collection.delete_many({
            "fileId": {"$in": [file_id, obj_id]},
            "userId": {"$in": [user_id, user_obj_id]},
        })

        chunks = split_text_into_chunks(file_doc["extractedText"])

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text available for chunking",
            )

        chunk_documents = [
            ChunkModel(
                file_id=str(file_doc["_id"]),
                user_id=user_id,
                chunk_index=index,
                text=chunk_text,
                metadata={"page": None},
            ).to_dict()
            for index, chunk_text in enumerate(chunks)
        ]

        await chunks_collection.insert_many(chunk_documents)

        return {
            "success": True,
            "message": "Document chunked successfully",
            "fileId": str(file_doc["_id"]),
            "chunkCount": len(chunk_documents),
        }

    @staticmethod
    async def embed_file(user_id: str, file_id: str) -> dict:
        """Generate vector embeddings for all chunks of a file."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        cursor = chunks_collection.find({
            "fileId": {"$in": [file_id, obj_id]},
            "userId": {"$in": [user_id, user_obj_id]},
        }).sort("chunkIndex", 1)

        chunks = await cursor.to_list(length=10000)

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No chunks found. Chunk the file first.",
            )

        processed = 0
        for chunk_doc in chunks:
            try:
                embedding_vector = generate_embedding(chunk_doc.get("text", ""))
            except ValueError as val_err:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(val_err),
                )
            except Exception as err:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Embedding generation error: {str(err)}",
                )

            await chunks_collection.update_one(
                {"_id": chunk_doc["_id"]},
                {
                    "$set": {
                        "embedding": embedding_vector,
                        "updatedAt": datetime.now(timezone.utc),
                    }
                },
            )
            processed += 1

        return {
            "success": True,
            "message": "Embeddings generated successfully",
            "fileId": str(file_doc["_id"]),
            "chunksProcessed": processed,
        }

    @staticmethod
    async def search_file(
        user_id: str, file_id: str, query: str, top_k: int = 5
    ) -> dict:
        """Perform semantic vector similarity search over a file's chunks."""
        if not query or not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query is required",
            )

        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        embedded_chunks_count = await chunks_collection.count_documents({
            "fileId": {"$in": [file_id, obj_id]},
            "userId": {"$in": [user_id, user_obj_id]},
            "embedding": {"$exists": True, "$ne": []},
        })

        if embedded_chunks_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No embedded chunks found for this file. Please run /process, /chunk, and /embed on this file first.",
            )


        try:
            query_embedding = generate_embedding(query)
        except ValueError as val_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(val_err),
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Embedding error: {str(err)}",
            )

        raw_results = await search_similar_chunks(
            user_id=user_id,
            file_id=file_id,
            query_embedding=query_embedding,
            top_k=top_k,
            filename=file_doc.get("originalName"),
        )

        formatted_results = [
            {
                "chunkId": str(result.get("_id", "")),
                "chunkIndex": result["chunkIndex"],
                "text": result["text"],
                "score": result["similarity"],
                "source": result["source"],
            }
            for result in raw_results
        ]

        return {
            "success": True,
            "query": query,
            "results": formatted_results,
        }

    @staticmethod
    async def chat_with_file(
        user_id: str, file_id: str, query: str, top_k: int = 5
    ) -> dict:
        """Process user question with RAG over relevant document chunks."""
        if not query or not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query is required",
            )

        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        embedded_chunks_count = await chunks_collection.count_documents({
            "fileId": {"$in": [file_id, obj_id]},
            "userId": {"$in": [user_id, user_obj_id]},
            "embedding": {"$exists": True, "$ne": []},
        })

        if embedded_chunks_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No embedded chunks found for this file. Please run /process, /chunk, and /embed on this file first.",
            )


        try:
            query_embedding = generate_embedding(query)
        except ValueError as val_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(val_err),
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Embedding error: {str(err)}",
            )

        relevant_chunks = await search_similar_chunks(
            user_id=user_id,
            file_id=file_id,
            query_embedding=query_embedding,
            top_k=top_k,
            filename=file_doc.get("originalName"),
        )

        try:
            rag_response = generate_rag_answer(question=query, chunks=relevant_chunks)
        except ValueError as val_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(val_err),
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"RAG generation error: {str(err)}",
            )

        # Save user message to database
        user_msg = ChatMessageModel(
            user_id=user_id,
            file_id=file_id,
            role="user",
            content=query,
        )
        await chat_messages_collection.insert_one(user_msg.to_dict())

        # Save assistant answer & sources to database
        assistant_msg = ChatMessageModel(
            user_id=user_id,
            file_id=file_id,
            role="assistant",
            content=rag_response["answer"],
            sources=rag_response["sources"],
        )
        await chat_messages_collection.insert_one(assistant_msg.to_dict())

        return {
            "success": True,
            "query": query,
            "answer": rag_response["answer"],
            "sources": rag_response["sources"],
        }

    @staticmethod
    async def get_chat_history(user_id: str, file_id: str) -> List[dict]:
        """Fetch chat history thread for a specific document and user."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        cursor = chat_messages_collection.find({
            "userId": {"$in": [user_id, user_obj_id]},
            "fileId": {"$in": [file_id, obj_id]},
        }).sort("createdAt", 1)

        docs = await cursor.to_list(length=1000)
        return [
            {
                "id": str(d["_id"]),
                "_id": str(d["_id"]),
                "userId": str(d["userId"]),
                "fileId": str(d["fileId"]),
                "role": d["role"],
                "content": d["content"],
                "sources": d.get("sources", []),
                "createdAt": d.get("createdAt"),
            }
            for d in docs
        ]

    @staticmethod
    async def clear_chat_history(user_id: str, file_id: str) -> bool:
        """Clear all chat messages for a specific document and user."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        await chat_messages_collection.delete_many({
            "userId": {"$in": [user_id, user_obj_id]},
            "fileId": {"$in": [file_id, obj_id]},
        })
        return True






