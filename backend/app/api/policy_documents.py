import hashlib
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.models import PolicyDocument, PolicyDocumentChunk, Organization, User
from backend.app.schemas.schemas import PolicyDocumentResponse, PolicyDocumentChunkResponse
from backend.app.services.policy.rag_service import PolicyRAGService
from backend.app.api.auth import get_optional_user

router = APIRouter(prefix="/policy-docs", tags=["Policy Documents & Knowledgebase"])


@router.post("/upload", response_model=PolicyDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_policy_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    organization_id: Optional[str] = Form(None),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads a corporate legal policy document (PDF or DOCX), performs layout-aware
    chunking, and indexes sections for Retrieval-Augmented Generation (RAG).
    """
    filename = file.filename or "policy.pdf"
    suffix = Path(filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{suffix}'. Supported policy formats: .pdf, .docx",
        )

    file_type = "pdf" if suffix == ".pdf" else "docx"

    # Resolve active organization
    active_org_id = organization_id
    if not active_org_id and user:
        active_org_id = user.organization_id
    if not active_org_id:
        org_res = await db.execute(select(Organization).limit(1))
        org = org_res.scalars().first()
        if not org:
            org = Organization(name="Acme Corporation")
            db.add(org)
            await db.flush()
        active_org_id = org.id

    # Save policy document
    doc_id = str(uuid.uuid4())
    stored_name = f"policy_{doc_id}_{Path(filename).name}"
    storage_path = Path(settings.POLICY_DOCS_DIR) / stored_name

    sha256 = hashlib.sha256()
    size = 0
    with open(storage_path, "wb") as f_out:
        while chunk := await file.read(65536):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE_BYTES:
                storage_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File exceeds maximum size limit of 25 MB")
            sha256.update(chunk)
            f_out.write(chunk)

    checksum = sha256.hexdigest()
    doc_title = title.strip() if title and title.strip() else Path(filename).stem.replace("_", " ").title()

    # Extract semantic chunks
    if file_type == "pdf":
        raw_chunks = PolicyRAGService.extract_chunks_from_pdf(storage_path)
    else:
        raw_chunks = PolicyRAGService.extract_chunks_from_docx(storage_path)

    # Persist document record
    doc_record = PolicyDocument(
        id=doc_id,
        organization_id=active_org_id,
        title=doc_title,
        original_filename=filename,
        file_type=file_type,
        storage_path=str(storage_path),
        file_size_bytes=size,
        checksum_sha256=checksum,
        chunk_count=len(raw_chunks),
    )
    db.add(doc_record)
    await db.flush()

    # Persist chunks
    for ch in raw_chunks:
        chunk_record = PolicyDocumentChunk(
            policy_document_id=doc_record.id,
            chunk_index=ch["chunk_index"],
            section_heading=ch["section_heading"],
            content=ch["content"],
            category_tag=ch["category_tag"],
            page_number=ch["page_number"],
        )
        db.add(chunk_record)

    await db.commit()
    await db.refresh(doc_record)

    return doc_record


@router.get("", response_model=List[PolicyDocumentResponse])
async def list_policy_documents(
    organization_id: Optional[str] = None,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists indexed policy documents for the current organization."""
    active_org_id = organization_id
    if not active_org_id and user:
        active_org_id = user.organization_id

    stmt = select(PolicyDocument).order_by(PolicyDocument.created_at.desc())
    if active_org_id:
        stmt = stmt.where(PolicyDocument.organization_id == active_org_id)

    res = await db.execute(stmt)
    return res.scalars().all()


@router.delete("/{doc_id}")
async def delete_policy_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Deletes an indexed policy document and associated chunks from the knowledgebase."""
    doc = await db.get(PolicyDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Policy document not found.")

    # Remove file on disk if exists
    try:
        Path(doc.storage_path).unlink(missing_ok=True)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Policy document deleted successfully."}


@router.get("/{doc_id}/chunks", response_model=List[PolicyDocumentChunkResponse])
async def get_policy_document_chunks(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Inspects indexed chunks and layout provenance for a policy document."""
    stmt = (
        select(PolicyDocumentChunk)
        .where(PolicyDocumentChunk.policy_document_id == doc_id)
        .order_by(PolicyDocumentChunk.chunk_index.asc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()
