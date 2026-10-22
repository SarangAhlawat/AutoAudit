from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


# ---------------------- Clause & Attributes ----------------------
class ClauseAttributeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    attribute_name: str
    value_text: str
    value_numeric: Optional[float] = None
    confidence: float
    evidence_text: Optional[str] = None


class ClauseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    clause_number: str
    heading: str
    text: str
    category: str
    confidence: float
    page_start: int
    page_end: int
    char_start: int
    char_end: int
    attributes: List[ClauseAttributeResponse] = []


# ---------------------- Revisions & Decisions ----------------------
class RevisionProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_text: str
    proposed_text: str
    rationale: str
    status: str
    generated_at: datetime


class ReviewDecisionCreate(BaseModel):
    decision: str = Field(..., description="ACCEPTED, REJECTED, or MODIFIED")
    reviewer: str = Field(default="Legal Reviewer")
    notes: Optional[str] = None
    modified_text: Optional[str] = None


class ReviewDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    decision: str
    reviewer: str
    notes: Optional[str] = None
    modified_text: Optional[str] = None
    created_at: datetime


# ---------------------- Findings ----------------------
class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_id: str
    clause_id: str
    clause_heading: Optional[str] = None
    clause_category: Optional[str] = None
    clause_number: Optional[str] = None
    finding_type: str
    severity: str
    risk_score: int
    explanation: str
    evidence: str
    policy_reference: str
    confidence: float
    status: str
    created_at: datetime
    proposal: Optional[RevisionProposalResponse] = None
    decision: Optional[ReviewDecisionResponse] = None


# ---------------------- Organization & Tenant ----------------------
class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    legal_entity_name: str
    primary_jurisdiction: str
    risk_threshold_high: int
    risk_threshold_medium: int
    default_playbook_id: str
    updated_at: datetime


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    legal_entity_name: Optional[str] = None
    primary_jurisdiction: Optional[str] = None
    risk_threshold_high: Optional[int] = None
    risk_threshold_medium: Optional[int] = None


# ---------------------- Playbooks ----------------------
class PolicyRuleUpdate(BaseModel):
    preferred_position: Optional[str] = None
    fallback_position: Optional[str] = None
    unacceptable_position: Optional[str] = None
    severity: Optional[str] = None
    rationale: Optional[str] = None


class PolicyRuleCreate(BaseModel):
    clause_category: str
    rule_name: str
    preferred_position: str
    fallback_position: str
    unacceptable_position: str
    severity: str = "HIGH"
    policy_reference: str
    rationale: str


class PolicyRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    clause_category: str
    rule_name: str
    preferred_position: str
    fallback_position: str
    unacceptable_position: str
    severity: str
    policy_reference: str
    rationale: str


class PolicyPlaybookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    version: str
    is_default: bool
    created_at: datetime
    rules: List[PolicyRuleResponse] = []


# ---------------------- Processing Job ----------------------
class JobStatusResponse(BaseModel):
    job_id: str
    contract_id: str
    status: str
    progress_percent: int
    current_stage: str
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


# ---------------------- Contracts ----------------------
class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    counterparty: Optional[str] = None
    contract_type: str
    status: str
    risk_score: int
    risk_band: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    checksum_sha256: str
    page_count: int
    playbook_id: Optional[str] = None
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    findings_count: int = 0
    clauses_count: int = 0


class ContractDetailResponse(ContractResponse):
    clauses: List[ClauseResponse] = []
    findings: List[FindingResponse] = []


# ---------------------- Audit Report ----------------------
class AuditReportResponse(BaseModel):
    contract_id: str
    title: str
    counterparty: Optional[str] = None
    contract_type: str
    status: str
    overall_risk_score: int
    risk_band: str
    total_clauses: int
    total_findings: int
    findings_by_severity: Dict[str, int]
    findings: List[FindingResponse]
    generated_at: datetime
    disclaimer: str


# ---------------------- Authentication & Users ----------------------
class UserCreate(BaseModel):
    email: str = Field(..., description="Corporate email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    full_name: str = Field(..., description="Full legal/professional name")
    role: str = Field(default="LEGAL_COUNSEL", description="LEGAL_COUNSEL, COMPLIANCE_OFFICER, PROCUREMENT_LEAD, or ADMIN")
    organization_name: Optional[str] = Field(default=None, description="Company/Tenant Name")


class UserLogin(BaseModel):
    email: str = Field(..., description="Corporate email address")
    password: str = Field(..., description="Password")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    organization_id: str
    is_active: bool
    created_at: datetime
    organization_name: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


# ---------------------- Policy Documents & Knowledgebase ----------------------
class PolicyDocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    policy_document_id: str
    chunk_index: int
    section_heading: str
    content: str
    category_tag: Optional[str] = None
    page_number: int


class PolicyDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    title: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    checksum_sha256: str
    chunk_count: int
    created_at: datetime

