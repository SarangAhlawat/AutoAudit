import asyncio
import hashlib
import shutil
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status,
    Response,
    Request,
)
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.models import (
    Contract,
    DocumentVersion,
    ProcessingJob,
    Clause,
    Finding,
    AuditEvent,
    PolicyPlaybook,
    PolicyRule,
    User,
    Organization,
)
from backend.app.api.auth import get_optional_user
from backend.app.services.policy.playbook_service import PlaybookService
from backend.app.schemas.schemas import (
    ContractResponse,
    ContractDetailResponse,
    ClauseResponse,
    FindingResponse,
    AuditReportResponse,
)
from backend.app.services.reporting.report_generator import ReportGenerator
from backend.app.workflows.orchestrator import ContractPipelineOrchestrator

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_contract(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    counterparty: Optional[str] = Form(None),
    contract_type: Optional[str] = Form("GENERAL_AGREEMENT"),
    playbook_id: Optional[str] = Form("default-acme-playbook"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # 1. Validate file extension and MIME
    filename = file.filename or "contract.pdf"
    suffix = Path(filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{suffix}'. Supported formats are: .pdf, .docx",
        )

    file_type = "pdf" if suffix == ".pdf" else "docx"

    # 2. Save file and calculate checksum
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}_{Path(filename).name}"
    storage_path = Path(settings.UPLOAD_DIR) / stored_filename

    sha256 = hashlib.sha256()
    size = 0

    with open(storage_path, "wb") as f_out:
        while chunk := await file.read(65536):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE_BYTES:
                storage_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB",
                )
            sha256.update(chunk)
            f_out.write(chunk)

    checksum = sha256.hexdigest()
    contract_title = title.strip() if title and title.strip() else Path(filename).stem.replace("_", " ").title()

    # 3. Ensure valid playbook exists in DB
    pb_record = None
    if playbook_id:
        pb_record = await db.get(PolicyPlaybook, playbook_id)
    if not pb_record:
        res = await db.execute(select(PolicyPlaybook).limit(1))
        pb_record = res.scalars().first()
        if not pb_record:
            default_data = PlaybookService.get_default_playbook()
            pb_record = PolicyPlaybook(
                id=default_data["id"],
                name=default_data["name"],
                description=default_data["description"],
                version=default_data["version"],
                is_default=True,
            )
            db.add(pb_record)
            await db.flush()
            for r in default_data["rules"]:
                db.add(PolicyRule(
                    playbook_id=pb_record.id,
                    clause_category=r["clause_category"],
                    rule_name=r["rule_name"],
                    preferred_position=r["preferred_position"],
                    fallback_position=r["fallback_position"],
                    unacceptable_position=r["unacceptable_position"],
                    severity=r["severity"],
                    policy_reference=r["policy_reference"],
                    rationale=r["rationale"],
                ))
            await db.flush()

    active_playbook_id = pb_record.id

    # 4. Resolve Organization for Multi-Tenant Isolation
    org_id = current_user.organization_id if current_user else None
    if not org_id:
        res = await db.execute(select(Organization).limit(1))
        first_org = res.scalars().first()
        if first_org:
            org_id = first_org.id

    # 5. Create Contract Record
    contract = Contract(
        id=file_id,
        title=contract_title,
        counterparty=counterparty.strip() if counterparty else None,
        contract_type=contract_type or "GENERAL_AGREEMENT",
        status="PROCESSING",
        original_filename=filename,
        file_type=file_type,
        file_size_bytes=size,
        checksum_sha256=checksum,
        playbook_id=active_playbook_id,
        organization_id=org_id,
    )
    db.add(contract)

    # 4. Create DocumentVersion record
    doc_ver = DocumentVersion(
        contract_id=contract.id,
        version_type="original",
        storage_path=str(storage_path),
        checksum_sha256=checksum,
    )
    db.add(doc_ver)

    # 5. Create ProcessingJob
    job = ProcessingJob(
        contract_id=contract.id,
        status="QUEUED",
        progress_percent=5,
        current_stage="Document uploaded and queued for processing",
    )
    db.add(job)

    # 6. Audit Event
    audit = AuditEvent(
        contract_id=contract.id,
        actor="User",
        action="CONTRACT_UPLOADED",
        details=f"Uploaded {filename} ({size} bytes, SHA-256: {checksum[:12]}...)",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(contract)
    await db.refresh(job)

    # 7. Launch asynchronous background processing pipeline
    asyncio.create_task(ContractPipelineOrchestrator.process_contract(contract.id, job.id))

    return {
        "contract_id": contract.id,
        "job_id": job.id,
        "title": contract.title,
        "status": contract.status,
        "message": "Contract uploaded successfully. Processing job initiated.",
    }


@router.get("", response_model=List[ContractResponse])
async def list_contracts(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Multi-tenant isolation: if no authenticated user, return empty list
    if not current_user:
        return []

    stmt = (
        select(Contract)
        .options(selectinload(Contract.findings), selectinload(Contract.clauses))
        .where(Contract.organization_id == current_user.organization_id)
        .order_by(desc(Contract.created_at))
    )

    if status_filter:
        stmt = stmt.where(Contract.status == status_filter.upper())
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where((Contract.title.ilike(search_pattern)) | (Contract.counterparty.ilike(search_pattern)))

    res = await db.execute(stmt)
    contracts = res.scalars().all()

    result = []
    for c in contracts:
        result.append(
            ContractResponse(
                id=c.id,
                title=c.title,
                counterparty=c.counterparty,
                contract_type=c.contract_type,
                status=c.status,
                risk_score=c.risk_score,
                risk_band=c.risk_band,
                original_filename=c.original_filename,
                file_type=c.file_type,
                file_size_bytes=c.file_size_bytes,
                checksum_sha256=c.checksum_sha256,
                page_count=c.page_count,
                playbook_id=c.playbook_id,
                organization_id=c.organization_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
                findings_count=len(c.findings),
                clauses_count=len(c.clauses),
            )
        )
    return result


@router.get("/{contract_id}", response_model=ContractDetailResponse)
async def get_contract_detail(contract_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.clauses).selectinload(Clause.attributes),
            selectinload(Contract.findings).selectinload(Finding.proposal),
            selectinload(Contract.findings).selectinload(Finding.decision),
            selectinload(Contract.findings).selectinload(Finding.clause),
        )
    )
    res = await db.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID '{contract_id}' not found.",
        )

    findings_out = []
    for f in contract.findings:
        findings_out.append(
            FindingResponse(
                id=f.id,
                contract_id=f.contract_id,
                clause_id=f.clause_id,
                clause_heading=f.clause.heading if f.clause else None,
                clause_category=f.clause.category if f.clause else None,
                clause_number=f.clause.clause_number if f.clause else None,
                finding_type=f.finding_type,
                severity=f.severity,
                risk_score=f.risk_score,
                explanation=f.explanation,
                evidence=f.evidence,
                policy_reference=f.policy_reference,
                confidence=f.confidence,
                status=f.status,
                created_at=f.created_at,
                proposal=f.proposal,
                decision=f.decision,
            )
        )

    return ContractDetailResponse(
        id=contract.id,
        title=contract.title,
        counterparty=contract.counterparty,
        contract_type=contract.contract_type,
        status=contract.status,
        risk_score=contract.risk_score,
        risk_band=contract.risk_band,
        original_filename=contract.original_filename,
        file_type=contract.file_type,
        file_size_bytes=contract.file_size_bytes,
        checksum_sha256=contract.checksum_sha256,
        page_count=contract.page_count,
        playbook_id=contract.playbook_id,
        organization_id=contract.organization_id,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
        findings_count=len(contract.findings),
        clauses_count=len(contract.clauses),
        clauses=contract.clauses,
        findings=findings_out,
    )


@router.get("/{contract_id}/clauses", response_model=List[ClauseResponse])
async def get_contract_clauses(contract_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Clause)
        .where(Clause.contract_id == contract_id)
        .options(selectinload(Clause.attributes))
        .order_by(Clause.clause_number)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{contract_id}/findings", response_model=List[FindingResponse])
async def get_contract_findings(contract_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Finding)
        .where(Finding.contract_id == contract_id)
        .options(
            selectinload(Finding.proposal),
            selectinload(Finding.decision),
            selectinload(Finding.clause),
        )
    )
    res = await db.execute(stmt)
    findings = res.scalars().all()

    out = []
    for f in findings:
        out.append(
            FindingResponse(
                id=f.id,
                contract_id=f.contract_id,
                clause_id=f.clause_id,
                clause_heading=f.clause.heading if f.clause else None,
                clause_category=f.clause.category if f.clause else None,
                clause_number=f.clause.clause_number if f.clause else None,
                finding_type=f.finding_type,
                severity=f.severity,
                risk_score=f.risk_score,
                explanation=f.explanation,
                evidence=f.evidence,
                policy_reference=f.policy_reference,
                confidence=f.confidence,
                status=f.status,
                created_at=f.created_at,
                proposal=f.proposal,
                decision=f.decision,
            )
        )
    return out


@router.get("/{contract_id}/report")
async def get_contract_report(
    contract_id: str,
    format: Optional[str] = Query("json", description="json or html"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.clauses),
            selectinload(Contract.findings).selectinload(Finding.proposal),
            selectinload(Contract.findings).selectinload(Finding.decision),
            selectinload(Contract.findings).selectinload(Finding.clause),
        )
    )
    res = await db.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID '{contract_id}' not found.",
        )

    findings_by_sev = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    findings_out = []
    for f in contract.findings:
        sev = f.severity.upper()
        if sev in findings_by_sev:
            findings_by_sev[sev] += 1
        findings_out.append(
            FindingResponse(
                id=f.id,
                contract_id=f.contract_id,
                clause_id=f.clause_id,
                clause_heading=f.clause.heading if f.clause else None,
                clause_category=f.clause.category if f.clause else None,
                clause_number=f.clause.clause_number if f.clause else None,
                finding_type=f.finding_type,
                severity=f.severity,
                risk_score=f.risk_score,
                explanation=f.explanation,
                evidence=f.evidence,
                policy_reference=f.policy_reference,
                confidence=f.confidence,
                status=f.status,
                created_at=f.created_at,
                proposal=f.proposal,
                decision=f.decision,
            )
        )

    report_data = {
        "contract_id": contract.id,
        "title": contract.title,
        "counterparty": contract.counterparty,
        "contract_type": contract.contract_type,
        "status": contract.status,
        "overall_risk_score": contract.risk_score,
        "risk_band": contract.risk_band,
        "total_clauses": len(contract.clauses),
        "total_findings": len(contract.findings),
        "findings_by_severity": findings_by_sev,
        "findings": findings_out,
        "generated_at": contract.updated_at,
        "disclaimer": ReportGenerator.LEGAL_DISCLAIMER,
    }

    if format.lower() == "html":
        html_content = ReportGenerator.generate_html_report(report_data)
        return HTMLResponse(content=html_content)

    return AuditReportResponse(**report_data)


@router.get("/{contract_id}/redline")
async def download_contract_redline(contract_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(DocumentVersion)
        .where(
            DocumentVersion.contract_id == contract_id,
            DocumentVersion.version_type == "redline_docx",
        )
        .order_by(desc(DocumentVersion.created_at))
    )
    res = await db.execute(stmt)
    version = res.scalars().first()

    if not version or not Path(version.storage_path).exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Redlined DOCX review copy not yet generated or contract still processing.",
        )

    contract = await db.get(Contract, contract_id)
    download_name = f"AutoAudit_Redline_{contract.title.replace(' ', '_') if contract else contract_id}.docx"

    return FileResponse(
        path=version.storage_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=download_name,
    )


@router.post("/{contract_id}/reanalyze")
async def reanalyze_contract(contract_id: str, db: AsyncSession = Depends(get_db)):
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID '{contract_id}' not found.",
        )

    job = ProcessingJob(
        contract_id=contract.id,
        status="QUEUED",
        progress_percent=5,
        current_stage="Re-analysis queued",
    )
    db.add(job)
    contract.status = "PROCESSING"
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(ContractPipelineOrchestrator.process_contract(contract.id, job.id))

    return {
        "contract_id": contract.id,
        "job_id": job.id,
        "message": "Re-analysis started.",
    }


@router.delete("/{contract_id}", status_code=status.HTTP_200_OK)
async def delete_contract(contract_id: str, db: AsyncSession = Depends(get_db)):
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID '{contract_id}' not found.",
        )

    await db.delete(contract)
    await db.commit()
    return {"message": f"Contract '{contract_id}' deleted successfully."}


# -------------------------------------------------------------
# Test Dataset Manifest & Quick Loading for Manual Testing
# -------------------------------------------------------------
from pydantic import BaseModel

class LoadSampleRequest(BaseModel):
    sample_id: str
    playbook_id: Optional[str] = "default-acme-playbook"


SAMPLE_CONTRACTS_MANIFEST = [
    {
        "id": "acme-msa",
        "tenant_id": "01_Acme_Corp_Technology",
        "tenant_name": "Acme Corp Technology",
        "title": "Vendor Master Services Agreement",
        "file_name": "Vendor_Master_Services_Agreement_CloudCore.docx",
        "relative_path": "01_Acme_Corp_Technology/Vendor_Master_Services_Agreement_CloudCore.docx",
        "file_type": "docx",
        "contract_type": "MASTER_SERVICES_AGREEMENT",
        "counterparty": "CloudCore Systems Inc.",
        "expected_risk": "CRITICAL",
        "expected_score_range": "85-95",
        "pages": 4,
        "key_deviations": [
            "Uncapped customer liability with $5,000 supplier cap",
            "Unilateral indemnification solely protecting supplier",
            "15-day accelerated payment terms",
            "Florida choice of law & exclusive jurisdiction",
            "5-day unreasonable cure period",
        ],
        "description": "Standard 4-page Word MSA with severe intentional liability imbalances. Tests Word tracked change generation.",
    },
    {
        "id": "apex-nda",
        "tenant_id": "01_Acme_Corp_Technology",
        "tenant_name": "Acme Corp Technology",
        "title": "Mutual Non-Disclosure Agreement",
        "file_name": "Mutual_Non_Disclosure_Agreement_Apex.pdf",
        "relative_path": "01_Acme_Corp_Technology/Mutual_Non_Disclosure_Agreement_Apex.pdf",
        "file_type": "pdf",
        "contract_type": "NON_DISCLOSURE_AGREEMENT",
        "counterparty": "Apex Innovations LLC",
        "expected_risk": "LOW",
        "expected_score_range": "20-35",
        "pages": 2,
        "key_deviations": [
            "Mutual confidentiality standard with $250k liability limit",
            "Trade secret exclusion clause",
            "Standard 2-year survival",
        ],
        "description": "2-page digital PDF NDA testing PyMuPDF text coordinate extraction and low-risk classification.",
    },
    {
        "id": "nexus-freight",
        "tenant_id": "02_Nexus_Logistics_Enterprise",
        "tenant_name": "Nexus Logistics Enterprise",
        "title": "Freight & Warehousing Services Agreement",
        "file_name": "Freight_and_Warehousing_Services_Agreement.docx",
        "relative_path": "02_Nexus_Logistics_Enterprise/Freight_and_Warehousing_Services_Agreement.docx",
        "file_type": "docx",
        "contract_type": "SERVICES_AGREEMENT",
        "counterparty": "Midwest Freight Haulers LLC",
        "expected_risk": "HIGH",
        "expected_score_range": "75-85",
        "pages": 3,
        "key_deviations": [
            "Liquidated damages of $2,500/day for delivery delays",
            "Net 60 deferred payment requirement",
            "State of Ohio jurisdiction",
            "Strict non-negotiable performance SLA",
        ],
        "description": "3-page logistics agreement with heavy liquidated damages and cargo liability stipulations.",
    },
    {
        "id": "fintech-saas",
        "tenant_id": "03_FinTech_Global_Systems",
        "tenant_name": "FinTech Global Systems",
        "title": "Enterprise SaaS Subscription Agreement",
        "file_name": "Enterprise_SaaS_Subscription_Agreement.docx",
        "relative_path": "03_FinTech_Global_Systems/Enterprise_SaaS_Subscription_Agreement.docx",
        "file_type": "docx",
        "contract_type": "SAAS_SUBSCRIPTION",
        "counterparty": "Core Banking Cloud Platform AG",
        "expected_risk": "CRITICAL",
        "expected_score_range": "85-95",
        "pages": 4,
        "key_deviations": [
            "Supplier liability capped at low $100k aggregate",
            "Customer indemnifies supplier for banking regulatory fines",
            "5-year locked commitment with no termination for convenience",
            "Swiss arbitration requirement",
        ],
        "description": "Core banking cloud agreement with unilateral regulatory indemnity and multi-year vendor lock-in.",
    },
    {
        "id": "fintech-dpa",
        "tenant_id": "03_FinTech_Global_Systems",
        "tenant_name": "FinTech Global Systems",
        "title": "Data Processing Addendum (GDPR / SOC 2)",
        "file_name": "Data_Processing_Addendum_GDPR.pdf",
        "relative_path": "03_FinTech_Global_Systems/Data_Processing_Addendum_GDPR.pdf",
        "file_type": "pdf",
        "contract_type": "DATA_PROCESSING_ADDENDUM",
        "counterparty": "DataCore International",
        "expected_risk": "MEDIUM",
        "expected_score_range": "40-55",
        "pages": 3,
        "key_deviations": [
            "48-hour security breach notification window",
            "Standard Contractual Clauses (EU SCCs)",
            "Mandatory annual third-party SOC 2 audit requirement",
        ],
        "description": "3-page GDPR compliance addendum with cross-border data transfer protections.",
    },
    {
        "id": "biohealth-clinical",
        "tenant_id": "04_BioHealth_Research_Partners",
        "tenant_name": "BioHealth Research Partners",
        "title": "Clinical Trial & IP Assignment Contract",
        "file_name": "Clinical_Trial_and_IP_Assignment_Contract.docx",
        "relative_path": "04_BioHealth_Research_Partners/Clinical_Trial_and_IP_Assignment_Contract.docx",
        "file_type": "docx",
        "contract_type": "CLINICAL_RESEARCH",
        "counterparty": "Global Trials Organization Inc.",
        "expected_risk": "HIGH",
        "expected_score_range": "75-85",
        "pages": 3,
        "key_deviations": [
            "Complete sponsor IP assignment of study discoveries",
            "Patient injury indemnification requirement",
            "60-day publication review restriction",
        ],
        "description": "3-page clinical research protocol with stringent IP ownership and human trial indemnities.",
    },
    {
        "id": "biohealth-consulting",
        "tenant_id": "04_BioHealth_Research_Partners",
        "tenant_name": "BioHealth Research Partners",
        "title": "Consulting & Advisory Services Agreement",
        "file_name": "Consulting_and_Advisory_Services_Agreement.pdf",
        "relative_path": "04_BioHealth_Research_Partners/Consulting_and_Advisory_Services_Agreement.pdf",
        "file_type": "pdf",
        "contract_type": "CONSULTING_AGREEMENT",
        "counterparty": "Pharma Advisory Partners LLC",
        "expected_risk": "LOW",
        "expected_score_range": "25-35",
        "pages": 2,
        "key_deviations": [
            "$650/hour rate with Net 30 payment",
            "Massachusetts choice of law",
            "14-day convenience termination",
        ],
        "description": "2-page strategic scientific advisory contract with balanced consulting terms.",
    },
]


@router.get("/samples/manifest")
async def get_samples_manifest():
    """Returns curated manifest of manual test-data contracts across all enterprise tenants."""
    return {
        "manifest": SAMPLE_CONTRACTS_MANIFEST,
        "total": len(SAMPLE_CONTRACTS_MANIFEST),
        "source_directory": "test-data/",
    }


@router.post("/samples/load", status_code=status.HTTP_201_CREATED)
async def load_sample_contract(req: LoadSampleRequest, db: AsyncSession = Depends(get_db)):
    """
    Directly loads a curated contract from test-data/ into the audit pipeline.
    Enables instant 1-click manual product testing without needing to browse files.
    """
    sample = next((s for s in SAMPLE_CONTRACTS_MANIFEST if s["id"] == req.sample_id), None)
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample contract with ID '{req.sample_id}' not found.",
        )

    # Locate sample file
    repo_root = Path(__file__).resolve().parents[3]
    sample_file_path = repo_root / "test-data" / sample["relative_path"]

    if not sample_file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Test data file '{sample['relative_path']}' does not exist on disk.",
        )

    # Copy to storage/uploads with unique prefix
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}_{sample['file_name']}"
    target_path = Path(settings.UPLOAD_DIR) / stored_filename

    shutil.copy2(sample_file_path, target_path)

    # Calculate SHA256
    sha256 = hashlib.sha256()
    size = target_path.stat().st_size
    with open(target_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    checksum = sha256.hexdigest()

    # Ensure playbook
    pb_record = None
    if req.playbook_id:
        pb_record = await db.get(PolicyPlaybook, req.playbook_id)
    if not pb_record:
        res = await db.execute(select(PolicyPlaybook).limit(1))
        pb_record = res.scalars().first()
    active_playbook_id = pb_record.id if pb_record else "default-acme-playbook"

    # Create Contract record
    contract = Contract(
        id=file_id,
        title=sample["title"],
        counterparty=sample["counterparty"],
        contract_type=sample["contract_type"],
        status="PROCESSING",
        original_filename=sample["file_name"],
        file_type=sample["file_type"],
        file_size_bytes=size,
        checksum_sha256=checksum,
        playbook_id=active_playbook_id,
    )
    db.add(contract)

    # Create DocumentVersion
    doc_ver = DocumentVersion(
        contract_id=contract.id,
        version_type="original",
        storage_path=str(target_path),
        checksum_sha256=checksum,
    )
    db.add(doc_ver)

    # Create ProcessingJob
    job = ProcessingJob(
        contract_id=contract.id,
        status="QUEUED",
        progress_percent=5,
        current_stage="Sample contract loaded and queued for processing",
    )
    db.add(job)

    audit = AuditEvent(
        contract_id=contract.id,
        actor="Manual Tester",
        action="SAMPLE_CONTRACT_LOADED",
        details=f"Loaded test-data sample: {sample['file_name']} (Tenant: {sample['tenant_name']})",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(contract)
    await db.refresh(job)

    # Launch processing pipeline
    asyncio.create_task(ContractPipelineOrchestrator.process_contract(contract.id, job.id))

    return {
        "contract_id": contract.id,
        "job_id": job.id,
        "title": contract.title,
        "status": contract.status,
        "sample": sample,
        "message": f"Sample contract '{sample['title']}' loaded successfully. Audit pipeline started.",
    }
