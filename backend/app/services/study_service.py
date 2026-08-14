import json
import re
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.config.database import chunks_collection, files_collection
from app.services.rag_service import _call_gemini


STUDY_PROMPTS = {
    "explain": """Explain the core concepts of the provided document in simple, clear, and comprehensive terms. Break down complex ideas with relatable real-world examples and step-by-step reasoning.

DOCUMENT CONTEXT:
{context}

Detailed Explanation:""",

    "summarize": """Provide a clear, high-level executive summary of the provided document. Include:
1. Key Takeaways (5 bullet points)
2. Core Thesis / Main Purpose
3. Critical Findings or Topics Covered

DOCUMENT CONTEXT:
{context}

Executive Summary:""",

    "topics": """Extract the most important topics and subtopics from the document context. For each topic, provide:
- Topic Name
- Priority Level (High / Medium / Key Exam Focus)
- Summary of why it is important

DOCUMENT CONTEXT:
{context}

Important Topics:""",

    "questions": """Generate 10 practice questions based strictly on the document context.
For each question, provide a detailed model answer based on the text.

DOCUMENT CONTEXT:
{context}

Practice Questions & Answers:""",

    "mcqs": """Generate 10 Multiple Choice Questions (MCQs) grounded in the document context.
Format your response as a valid JSON array of objects with the exact structure:
[
  {{
    "id": 1,
    "question": "Question text here...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Why this option is correct based on document..."
  }}
]

Return ONLY the JSON array without additional markdown code block wrappers if possible.

DOCUMENT CONTEXT:
{context}""",

    "flashcards": """Generate 10 high-yield study flashcards based on the document context.
Format your response as a valid JSON array of objects with the exact structure:
[
  {{
    "id": 1,
    "front": "Front of card (Question or Term)...",
    "back": "Back of card (Definition or Explanation)...",
    "category": "Topic Category"
  }}
]

Return ONLY the JSON array.

DOCUMENT CONTEXT:
{context}""",

    "examprep": """Create a comprehensive Exam Preparation Study Guide based on the document context.
Include:
1. High-Yield Summary Checklist
2. Must-Know Formulas / Definitions / Architectural Diagrams
3. Common Exam Pitfalls & Misconceptions
4. Quick Quiz (5 Rapid Fire Recall Questions with Answers)

DOCUMENT CONTEXT:
{context}

Exam Preparation Guide:"""
}


async def generate_study_content(
    user_id: str,
    mode: str,
    file_ids: Optional[List[str]] = None,
    topic: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate grounded AI Study Mode content from user's uploaded document chunks."""
    mode_clean = (mode or "explain").lower().strip()
    if mode_clean not in STUDY_PROMPTS:
        mode_clean = "explain"

    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    filter_doc: Dict[str, Any] = {"userId": {"$in": [user_id, user_obj_id]}}

    if file_ids:
        expanded_file_ids = []
        for fid in file_ids:
            expanded_file_ids.append(fid)
            if ObjectId.is_valid(fid):
                expanded_file_ids.append(ObjectId(fid))
        filter_doc["fileId"] = {"$in": expanded_file_ids}

    # Fetch chunks from collection up to 30 chunks
    cursor = chunks_collection.find(filter_doc).limit(30)
    chunks = await cursor.to_list(length=30)

    if not chunks:
        # Fallback: check extractedText in files
        file_cursor = files_collection.find(filter_doc).limit(5)
        files = await file_cursor.to_list(length=5)
        text_blocks = [f.get("extractedText", "") for f in files if f.get("extractedText")]
        context = "\n\n".join(text_blocks) if text_blocks else ""
    else:
        context = "\n\n".join([f"--- Chunk {i+1} ---\n{c.get('text', '')}" for i, c in enumerate(chunks)])

    if not context.strip():
        return {
            "mode": mode_clean,
            "content": "No document content found. Please upload and process documents first.",
            "structuredData": None,
        }

    # Trim context if too large (approx 15,000 words max)
    words = context.split()
    if len(words) > 12000:
        context = " ".join(words[:12000])

    prompt_template = STUDY_PROMPTS[mode_clean]
    prompt = prompt_template.format(context=context)

    if topic:
        prompt += f"\n\nSpecial Focus Topic: {topic}"

    raw_response = _call_gemini(prompt)

    structured_data = None
    if mode_clean in ["mcqs", "flashcards"]:
        try:
            # Clean up JSON backticks if present
            clean_str = raw_response.strip()
            clean_str = re.sub(r"^```json\s*", "", clean_str)
            clean_str = re.sub(r"^```\s*", "", clean_str)
            clean_str = re.sub(r"\s*```$", "", clean_str)
            structured_data = json.loads(clean_str)
        except Exception:
            structured_data = None

    return {
        "mode": mode_clean,
        "content": raw_response,
        "structuredData": structured_data,
    }
