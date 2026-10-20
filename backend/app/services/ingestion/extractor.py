import hashlib
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
import docx


class DocumentExtractor:
    @staticmethod
    def calculate_checksum(file_path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def extract_from_pdf(file_path: Path) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from PDF preserving page provenance.
        Returns:
            full_text (str)
            pages_data (list of dicts with page_number, text, char_offset)
            page_count (int)
        """
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages_data = []
        full_text_parts = []
        current_offset = 0

        for page_idx in range(page_count):
            page = doc[page_idx]
            page_text = page.get_text("text")
            cleaned_page_text = page_text.strip()
            page_len = len(cleaned_page_text)

            pages_data.append({
                "page_number": page_idx + 1,
                "text": cleaned_page_text,
                "char_start": current_offset,
                "char_end": current_offset + page_len,
            })

            full_text_parts.append(cleaned_page_text)
            current_offset += page_len + 2  # account for double newline separator

        doc.close()
        full_text = "\n\n".join(full_text_parts)
        return full_text, pages_data, page_count

    @staticmethod
    def extract_from_docx(file_path: Path) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from DOCX preserving paragraphs and table structures.
        """
        doc = docx.Document(file_path)
        paragraphs_data = []
        full_text_parts = []
        current_offset = 0

        for p_idx, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if not text:
                continue
            p_len = len(text)
            paragraphs_data.append({
                "paragraph_index": p_idx,
                "text": text,
                "style": para.style.name if para.style else "Normal",
                "char_start": current_offset,
                "char_end": current_offset + p_len,
                "page_number": 1,  # DOCX doesn't have native page breaks until layout rendering
            })
            full_text_parts.append(text)
            current_offset += p_len + 2

        # Extract text from tables if any
        for t_idx, table in enumerate(doc.tables):
            table_rows = []
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    table_rows.append(row_text)
            if table_rows:
                t_text = "\n".join(table_rows)
                t_len = len(t_text)
                paragraphs_data.append({
                    "paragraph_index": 1000 + t_idx,
                    "text": t_text,
                    "style": "Table",
                    "char_start": current_offset,
                    "char_end": current_offset + t_len,
                    "page_number": 1,
                })
                full_text_parts.append(t_text)
                current_offset += t_len + 2

        full_text = "\n\n".join(full_text_parts)
        return full_text, paragraphs_data, 1

    @classmethod
    def extract(cls, file_path: Path, file_type: str) -> Tuple[str, List[Dict[str, Any]], int]:
        file_type_lower = file_type.lower().replace(".", "")
        if file_type_lower == "pdf":
            return cls.extract_from_pdf(file_path)
        elif file_type_lower in ["docx", "doc"]:
            return cls.extract_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}. Supported types: PDF, DOCX")
