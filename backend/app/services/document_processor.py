import os
from pypdf import PdfReader


def extract_pdf_text(file_path: str) -> dict:
    """
    Extract text content and page count from a PDF, TXT, or DOCX file.
    Returns dict with 'text', 'pages', and 'pagesData'.
    """
    try:
        abs_path = file_path
        if not os.path.isabs(abs_path) or not os.path.exists(abs_path):
            backend_root = os.path.dirname(
                os.path.dirname(os.path.dirname(__file__))
            )
            abs_path = os.path.join(backend_root, file_path)

        if not os.path.exists(abs_path):
            filename = os.path.basename(file_path)
            uploads_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"
            )
            abs_path = os.path.join(uploads_dir, filename)

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"File not found at path: {file_path}")

        # Handle TXT files
        if abs_path.lower().endswith(".txt"):
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                full_text = f.read()
            return {
                "text": full_text,
                "pages": 1,
                "pagesData": [{"page": 1, "text": full_text.strip()}],
            }

        # Handle DOCX files
        if abs_path.lower().endswith(".docx"):
            try:
                import docx
                doc = docx.Document(abs_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
                full_text = "\n\n".join(paragraphs)
                return {
                    "text": full_text,
                    "pages": 1,
                    "pagesData": [{"page": 1, "text": full_text.strip()}],
                }
            except Exception as docx_err:
                print("DOCX extraction warning:", docx_err)

        # Handle PDF files
        reader = PdfReader(abs_path)
        pages_count = len(reader.pages)
        extracted_text = []
        pages_data = []

        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                extracted_text.append(page_text)
                pages_data.append({
                    "page": i + 1,
                    "text": page_text.strip(),
                })

        full_text = "\n\n".join(extracted_text)

        return {
            "text": full_text,
            "pages": pages_count,
            "pagesData": pages_data,
        }
    except Exception as error:
        print("Document extraction error:", error)
        raise RuntimeError("Failed to extract PDF text")

