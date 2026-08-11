import os
from pypdf import PdfReader


def extract_pdf_text(file_path: str) -> dict:
    """
    Extract text content and page count from a PDF file using pypdf.
    """
    try:
        abs_path = file_path
        if not os.path.isabs(abs_path):
            backend_root = os.path.dirname(
                os.path.dirname(os.path.dirname(__file__))
            )
            abs_path = os.path.join(backend_root, file_path)

        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"File not found at path: {abs_path}")

        reader = PdfReader(abs_path)
        pages_count = len(reader.pages)
        extracted_text = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_text.append(page_text)

        full_text = "\n".join(extracted_text)

        return {
            "text": full_text,
            "pages": pages_count,
        }
    except Exception as error:
        print("PDF extraction error:", error)
        raise RuntimeError("Failed to extract PDF text")
