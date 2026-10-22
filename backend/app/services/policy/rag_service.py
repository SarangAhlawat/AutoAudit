import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import docx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.models import PolicyDocument, PolicyDocumentChunk


class PolicyRAGService:
    """
    RAG (Retrieval-Augmented Generation) Service for enterprise policy documents.
    Handles layout-aware extraction, chunking, indexing, and semantic retrieval.
    """

    @classmethod
    def extract_chunks_from_pdf(cls, file_path: Path) -> List[Dict[str, Any]]:
        """Extracts text and page provenance from a PDF document and segments into chunks."""
        doc = fitz.open(file_path)
        chunks: List[Dict[str, Any]] = []
        chunk_idx = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if not text:
                continue

            # Split text by double newlines or section headings
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) > 20]
            
            for para in paragraphs:
                heading = "General Policy Guidelines"
                lines = para.split("\n")
                if len(lines) > 1 and len(lines[0]) < 80:
                    heading = lines[0].strip()

                cat_tag = cls._detect_category_tag(para)
                chunks.append({
                    "chunk_index": chunk_idx,
                    "section_heading": heading,
                    "content": para,
                    "category_tag": cat_tag,
                    "page_number": page_num + 1,
                })
                chunk_idx += 1

        return chunks

    @classmethod
    def extract_chunks_from_docx(cls, file_path: Path) -> List[Dict[str, Any]]:
        """Extracts paragraphs and headings from a DOCX document into semantic chunks."""
        doc = docx.Document(file_path)
        chunks: List[Dict[str, Any]] = []
        chunk_idx = 0
        current_heading = "General Policy Standards"
        current_buffer = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            # Detect headings
            if p.style and "Heading" in p.style.name:
                if current_buffer:
                    combined = " ".join(current_buffer)
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "section_heading": current_heading,
                        "content": combined,
                        "category_tag": cls._detect_category_tag(combined),
                        "page_number": 1,
                    })
                    chunk_idx += 1
                    current_buffer = []
                current_heading = text
            else:
                current_buffer.append(text)
                if len(" ".join(current_buffer)) > 400:
                    combined = " ".join(current_buffer)
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "section_heading": current_heading,
                        "content": combined,
                        "category_tag": cls._detect_category_tag(combined),
                        "page_number": 1,
                    })
                    chunk_idx += 1
                    current_buffer = []

        if current_buffer:
            combined = " ".join(current_buffer)
            chunks.append({
                "chunk_index": chunk_idx,
                "section_heading": current_heading,
                "content": combined,
                "category_tag": cls._detect_category_tag(combined),
                "page_number": 1,
            })

        return chunks

    @classmethod
    def _detect_category_tag(cls, text: str) -> str:
        """Assigns category tag to policy chunk for fast filtered retrieval."""
        t = text.lower()
        if any(w in t for w in ["liability", "aggregate cap", "consequential damages", "limitation of liability"]):
            return "LIMITATION_OF_LIABILITY"
        if any(w in t for w in ["indemnif", "hold harmless", "defend and indemnify"]):
            return "INDEMNIFICATION"
        if any(w in t for w in ["confidential", "non-disclosure", "proprietary information", "trade secret"]):
            return "CONFIDENTIALITY"
        if any(w in t for w in ["governing law", "jurisdiction", "venue", "courts of"]):
            return "GOVERNING_LAW"
        if any(w in t for w in ["terminate", "termination", "cure period", "breach"]):
            return "TERMINATION"
        if any(w in t for w in ["payment", "invoice", "net 30", "net 60", "interest"]):
            return "PAYMENT_TERMS"
        if any(w in t for w in ["intellectual property", "ownership", "work made for hire", "patent"]):
            return "INTELLECTUAL_PROPERTY"
        if any(w in t for w in ["data protection", "gdpr", "personal data", "security breach"]):
            return "DATA_PROTECTION"
        if any(w in t for w in ["liquidated damages", "delay damages", "penalty"]):
            return "LIQUIDATED_DAMAGES"
        return "GENERAL"

    @classmethod
    async def retrieve_policy_matches(
        cls,
        clause_text: str,
        clause_category: str,
        organization_id: str,
        db: AsyncSession,
        top_k: int = 2,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the most relevant policy passages from the organization's uploaded knowledgebase.
        Returns citations, document title, section heading, page number, and evidence text.
        """
        # Fetch all policy chunks belonging to this organization
        stmt = (
            select(PolicyDocumentChunk)
            .join(PolicyDocument)
            .where(PolicyDocument.organization_id == organization_id)
            .options(selectinload(PolicyDocumentChunk.document))
        )
        res = await db.execute(stmt)
        chunks = res.scalars().all()

        if not chunks:
            return []

        query_tokens = set(re.findall(r"\w{3,}", clause_text.lower()))
        scored_chunks = []

        for ch in chunks:
            chunk_tokens = set(re.findall(r"\w{3,}", ch.content.lower()))
            overlap = len(query_tokens.intersection(chunk_tokens))
            term_score = overlap / max(1, len(query_tokens) + len(chunk_tokens) - overlap)

            # Category boost
            cat_boost = 0.3 if ch.category_tag == clause_category else 0.0
            final_score = term_score + cat_boost

            if final_score > 0.05:
                doc_title = ch.document.title if ch.document else "Organization Policy"
                scored_chunks.append({
                    "score": round(final_score, 3),
                    "document_id": ch.policy_document_id,
                    "document_title": doc_title,
                    "section_heading": ch.section_heading,
                    "page_number": ch.page_number,
                    "citation": f"[{doc_title}, Page {ch.page_number}, '{ch.section_heading}']",
                    "content_excerpt": ch.content[:280] + ("..." if len(ch.content) > 280 else ""),
                })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]
