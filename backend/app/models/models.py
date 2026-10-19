import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="Acme Technologies")
    legal_entity_name: Mapped[str] = mapped_column(String(255), nullable=False, default="Acme Technologies Private Limited")
    primary_jurisdiction: Mapped[str] = mapped_column(String(128), default="New Delhi, India")
    risk_threshold_high: Mapped[int] = mapped_column(Integer, default=75)
    risk_threshold_medium: Mapped[int] = mapped_column(Integer, default=45)
    default_playbook_id: Mapped[str] = mapped_column(String(36), default="default-acme-playbook")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    policy_documents: Mapped[List["PolicyDocument"]] = relationship("PolicyDocument", back_populates="organization", cascade="all, delete-orphan")
    contracts: Mapped[List["Contract"]] = relationship("Contract", back_populates="organization", cascade="all, delete-orphan")



class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    counterparty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contract_type: Mapped[str] = mapped_column(String(64), default="GENERAL_AGREEMENT")
    status: Mapped[str] = mapped_column(String(32), default="PROCESSING")  # PROCESSING, NEEDS_REVIEW, REVIEWED, FAILED
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_band: Mapped[str] = mapped_column(String(16), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)  # pdf, docx
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    playbook_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("policy_playbooks.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="contracts")
    document_versions: Mapped[List["DocumentVersion"]] = relationship("DocumentVersion", back_populates="contract", cascade="all, delete-orphan")
    jobs: Mapped[List["ProcessingJob"]] = relationship("ProcessingJob", back_populates="contract", cascade="all, delete-orphan")
    clauses: Mapped[List["Clause"]] = relationship("Clause", back_populates="contract", cascade="all, delete-orphan")
    findings: Mapped[List["Finding"]] = relationship("Finding", back_populates="contract", cascade="all, delete-orphan")
    audit_events: Mapped[List["AuditEvent"]] = relationship("AuditEvent", back_populates="contract", cascade="all, delete-orphan")
    playbook: Mapped[Optional["PolicyPlaybook"]] = relationship("PolicyPlaybook", back_populates="contracts")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False)
    version_type: Mapped[str] = mapped_column(String(32), nullable=False)  # original, extracted_text, redline_docx
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="document_versions")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="QUEUED")  # QUEUED, EXTRACTING, SEGMENTING, EVALUATING, REDLINING, COMPLETED, FAILED
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    current_stage: Mapped[str] = mapped_column(String(64), default="Initial Ingestion")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="jobs")


class Clause(Base):
    __tablename__ = "clauses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False)
    clause_number: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0")
    heading: Mapped[str] = mapped_column(String(255), nullable=False, default="General Clause")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="GENERAL")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    page_start: Mapped[int] = mapped_column(Integer, default=1)
    page_end: Mapped[int] = mapped_column(Integer, default=1)
    char_start: Mapped[int] = mapped_column(Integer, default=0)
    char_end: Mapped[int] = mapped_column(Integer, default=0)
    source_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="clauses")
    attributes: Mapped[List["ClauseAttribute"]] = relationship("ClauseAttribute", back_populates="clause", cascade="all, delete-orphan")
    findings: Mapped[List["Finding"]] = relationship("Finding", back_populates="clause", cascade="all, delete-orphan")


class ClauseAttribute(Base):
    __tablename__ = "clause_attributes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    clause_id: Mapped[str] = mapped_column(String(36), ForeignKey("clauses.id"), nullable=False)
    attribute_name: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. cap_amount, cure_period_days, governing_jurisdiction
    value_text: Mapped[str] = mapped_column(String(255), nullable=False)
    value_numeric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    evidence_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    clause: Mapped["Clause"] = relationship("Clause", back_populates="attributes")


class PolicyPlaybook(Base):
    __tablename__ = "policy_playbooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[str] = mapped_column(String(16), default="1.0")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    rules: Mapped[List["PolicyRule"]] = relationship("PolicyRule", back_populates="playbook", cascade="all, delete-orphan")
    contracts: Mapped[List["Contract"]] = relationship("Contract", back_populates="playbook")


class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    playbook_id: Mapped[str] = mapped_column(String(36), ForeignKey("policy_playbooks.id"), nullable=False)
    clause_category: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_name: Mapped[str] = mapped_column(String(128), nullable=False)
    preferred_position: Mapped[str] = mapped_column(Text, nullable=False)
    fallback_position: Mapped[str] = mapped_column(Text, nullable=False)
    unacceptable_position: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    policy_reference: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "Acme Legal Playbook Section 4.2"
    rationale: Mapped[str] = mapped_column(Text, nullable=False)

    playbook: Mapped["PolicyPlaybook"] = relationship("PolicyPlaybook", back_populates="rules")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False)
    clause_id: Mapped[str] = mapped_column(String(36), ForeignKey("clauses.id"), nullable=False)
    finding_type: Mapped[str] = mapped_column(String(64), nullable=False)  # NON_COMPLIANT, UNCAPPED_LIABILITY, UNILATERAL_INDEMNITY, MISSING_CURE_PERIOD, JURISDICTION_MISMATCH
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score: Mapped[int] = mapped_column(Integer, default=50)  # 0 to 100
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    policy_reference: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.90)
    status: Mapped[str] = mapped_column(String(32), default="PENDING_REVIEW")  # PENDING_REVIEW, ACCEPTED, REJECTED, MODIFIED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="findings")
    clause: Mapped["Clause"] = relationship("Clause", back_populates="findings")
    proposal: Mapped[Optional["RevisionProposal"]] = relationship("RevisionProposal", back_populates="finding", uselist=False, cascade="all, delete-orphan")
    decision: Mapped[Optional["ReviewDecision"]] = relationship("ReviewDecision", back_populates="finding", uselist=False, cascade="all, delete-orphan")


class RevisionProposal(Base):
    __tablename__ = "revision_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id"), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED")  # PROPOSED, ACCEPTED, REJECTED, MODIFIED
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    finding: Mapped["Finding"] = relationship("Finding", back_populates="proposal")


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id"), nullable=False)
    reviewer: Mapped[str] = mapped_column(String(128), default="Legal Reviewer")
    decision: Mapped[str] = mapped_column(String(32), nullable=False)  # ACCEPTED, REJECTED, MODIFIED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    modified_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    finding: Mapped["Finding"] = relationship("Finding", back_populates="decision")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contract_id: Mapped[str] = mapped_column(String(36), ForeignKey("contracts.id"), nullable=False)
    actor: Mapped[str] = mapped_column(String(128), default="System")
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="audit_events")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(64), default="LEGAL_COUNSEL")  # LEGAL_COUNSEL, COMPLIANCE_OFFICER, PROCUREMENT_LEAD, ADMIN
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")


class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)  # pdf, docx
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="policy_documents")
    chunks: Mapped[List["PolicyDocumentChunk"]] = relationship("PolicyDocumentChunk", back_populates="document", cascade="all, delete-orphan")


class PolicyDocumentChunk(Base):
    __tablename__ = "policy_document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    policy_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("policy_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    section_heading: Mapped[str] = mapped_column(String(255), default="General Policy Section")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category_tag: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document: Mapped["PolicyDocument"] = relationship("PolicyDocument", back_populates="chunks")

