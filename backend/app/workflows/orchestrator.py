import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.db.session import AsyncSessionLocal
from backend.app.models.models import (
    Contract,
    ProcessingJob,
    Clause,
    ClauseAttribute,
    Finding,
    RevisionProposal,
    DocumentVersion,
    AuditEvent,
    Organization,
)
from backend.app.services.ingestion.extractor import DocumentExtractor
from backend.app.services.extraction.segmenter import ClauseSegmenter
from backend.app.services.policy.playbook_service import PlaybookService
from backend.app.services.policy.rag_service import PolicyRAGService
from backend.app.services.risk.engine import RiskEngine
from backend.app.services.redlining.docx_engine import DocxRedlineEngine


class ContractPipelineOrchestrator:
    @classmethod
    async def process_contract(cls, contract_id: str, job_id: str, session_factory=None) -> None:
        """
        Background task executing the complete AutoAudit pipeline.
        """
        factory = session_factory or AsyncSessionLocal
        async with factory() as session:
            try:
                # 1. Fetch Contract & Job
                contract = await session.get(Contract, contract_id)
                job = await session.get(ProcessingJob, job_id)
                if not contract or not job:
                    return

                # Update stage: Ingestion
                job.status = "EXTRACTING"
                job.current_stage = "Document text and layout extraction"
                job.progress_percent = 15
                await session.commit()

                # Find original document version
                stmt = select(DocumentVersion).where(
                    DocumentVersion.contract_id == contract_id,
                    DocumentVersion.version_type == "original"
                )
                res = await session.execute(stmt)
                doc_version = res.scalar_one_or_none()
                if not doc_version:
                    raise FileNotFoundError(f"Original file for contract {contract_id} not found.")

                file_path = Path(doc_version.storage_path)

                # Execute Text Extraction
                full_text, pages_data, page_count = DocumentExtractor.extract(file_path, contract.file_type)
                contract.page_count = page_count

                # Update stage: Segmentation & Classification
                job.status = "SEGMENTING"
                job.current_stage = "Clause segmentation and category classification"
                job.progress_percent = 40
                await session.commit()

                raw_clauses = ClauseSegmenter.segment_document(full_text, pages_data)

                # Update stage: Policy Comparison & Risk Evaluation
                job.status = "EVALUATING"
                job.current_stage = "Policy playbook comparison and risk scoring"
                job.progress_percent = 70
                await session.commit()

                # Fetch organization ID for knowledgebase retrieval
                org_res = await session.execute(select(Organization).limit(1))
                active_org = org_res.scalars().first()
                active_org_id = active_org.id if active_org else None

                findings_list = []
                redline_clauses_data = []

                for c_data in raw_clauses:
                    clause = Clause(
                        contract_id=contract_id,
                        clause_number=c_data["clause_number"],
                        heading=c_data["heading"],
                        text=c_data["text"],
                        category=c_data["category"],
                        confidence=c_data["confidence"],
                        page_start=c_data["page_start"],
                        page_end=c_data["page_end"],
                    )
                    session.add(clause)
                    await session.flush()  # to obtain clause.id

                    # Save attributes
                    for a_data in c_data.get("attributes", []):
                        attr = ClauseAttribute(
                            clause_id=clause.id,
                            attribute_name=a_data["attribute_name"],
                            value_text=a_data["value_text"],
                            value_numeric=a_data.get("value_numeric"),
                            confidence=a_data["confidence"],
                            evidence_text=a_data.get("evidence_text"),
                        )
                        session.add(attr)

                    # Evaluate Risk against Playbook
                    finding_dict, revision_dict = RiskEngine.evaluate_clause(c_data)

                    clause_redline_entry = {
                        "clause_number": c_data["clause_number"],
                        "heading": c_data["heading"],
                        "text": c_data["text"],
                        "revision": revision_dict,
                    }
                    redline_clauses_data.append(clause_redline_entry)

                    if finding_dict:
                        # RAG Knowledgebase Retrieval against uploaded policy documents
                        if active_org_id:
                            rag_matches = await PolicyRAGService.retrieve_policy_matches(
                                clause_text=c_data["text"],
                                clause_category=c_data["category"],
                                organization_id=active_org_id,
                                db=session,
                                top_k=1,
                            )
                            if rag_matches:
                                top_rag = rag_matches[0]
                                finding_dict["policy_reference"] = f"{top_rag['citation']} ({finding_dict['policy_reference']})"
                                finding_dict["explanation"] = f"{finding_dict['explanation']} (Aligned with knowledgebase: {top_rag['section_heading']})"

                        finding = Finding(
                            contract_id=contract_id,
                            clause_id=clause.id,
                            finding_type=finding_dict["finding_type"],
                            severity=finding_dict["severity"],
                            risk_score=finding_dict["risk_score"],
                            explanation=finding_dict["explanation"],
                            evidence=finding_dict["evidence"],
                            policy_reference=finding_dict["policy_reference"],
                            confidence=finding_dict["confidence"],
                            status=finding_dict["status"],
                        )
                        session.add(finding)
                        await session.flush()

                        if revision_dict:
                            proposal = RevisionProposal(
                                finding_id=finding.id,
                                original_text=revision_dict["original_text"],
                                proposed_text=revision_dict["proposed_text"],
                                rationale=revision_dict["rationale"],
                                status="PROPOSED",
                            )
                            session.add(proposal)

                        findings_list.append(finding_dict)

                # Update stage: DOCX Redlining
                job.status = "REDLINING"
                job.current_stage = "Generating tracked-changes DOCX review copy"
                job.progress_percent = 85
                await session.commit()

                # Generate Redlined DOCX
                export_filename = f"redline_{contract_id}.docx"
                export_path = Path(settings.EXPORT_DIR) / export_filename
                DocxRedlineEngine.generate_redlined_copy(
                    contract_title=contract.title,
                    counterparty=contract.counterparty,
                    clauses=redline_clauses_data,
                    output_path=export_path,
                )

                # Save Redline DocumentVersion
                redline_checksum = DocumentExtractor.calculate_checksum(export_path)
                redline_version = DocumentVersion(
                    contract_id=contract_id,
                    version_type="redline_docx",
                    storage_path=str(export_path),
                    checksum_sha256=redline_checksum,
                )
                session.add(redline_version)

                # Calculate Aggregate Risk
                overall_score, risk_band, contract_status = RiskEngine.calculate_overall_risk(findings_list)
                contract.risk_score = overall_score
                contract.risk_band = risk_band
                contract.status = contract_status

                # Log Audit Event
                audit_event = AuditEvent(
                    contract_id=contract_id,
                    actor="System Pipeline",
                    action="PIPELINE_COMPLETED",
                    details=f"Analyzed {len(raw_clauses)} clauses. Found {len(findings_list)} policy deviations. Overall risk: {overall_score} ({risk_band}). Status: {contract_status}.",
                )
                session.add(audit_event)

                # Finalize Job
                job.status = "COMPLETED"
                job.current_stage = "Audit analysis complete"
                job.progress_percent = 100
                job.completed_at = datetime.now(timezone.utc)
                await session.commit()

            except Exception as e:
                await session.rollback()
                # Record error in job
                async with factory() as err_session:
                    job = await err_session.get(ProcessingJob, job_id)
                    if job:
                        job.status = "FAILED"
                        job.error_message = str(e)
                        job.completed_at = datetime.now(timezone.utc)
                    contract = await err_session.get(Contract, contract_id)
                    if contract:
                        contract.status = "FAILED"
                    await err_session.commit()
                raise e
