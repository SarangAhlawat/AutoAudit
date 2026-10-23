from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.models import Finding, ReviewDecision, RevisionProposal, AuditEvent, Contract
from backend.app.schemas.schemas import ReviewDecisionCreate, ReviewDecisionResponse

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.post("/{finding_id}/decision", response_model=ReviewDecisionResponse)
async def submit_review_decision(
    finding_id: str,
    decision_in: ReviewDecisionCreate,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Finding)
        .where(Finding.id == finding_id)
        .options(selectinload(Finding.decision), selectinload(Finding.proposal))
    )
    res = await db.execute(stmt)
    finding = res.scalar_one_or_none()

    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding with ID '{finding_id}' not found."
        )

    decision_val = decision_in.decision.upper()
    if decision_val not in ["ACCEPTED", "REJECTED", "MODIFIED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be one of: ACCEPTED, REJECTED, MODIFIED"
        )

    # Update or create ReviewDecision
    if finding.decision:
        finding.decision.decision = decision_val
        finding.decision.reviewer = decision_in.reviewer
        finding.decision.notes = decision_in.notes
        finding.decision.modified_text = decision_in.modified_text
        decision_obj = finding.decision
    else:
        decision_obj = ReviewDecision(
            finding_id=finding.id,
            reviewer=decision_in.reviewer,
            decision=decision_val,
            notes=decision_in.notes,
            modified_text=decision_in.modified_text,
        )
        db.add(decision_obj)

    # Update Finding and Proposal statuses
    finding.status = decision_val
    if finding.proposal:
        finding.proposal.status = decision_val

    # Log Audit Event
    audit = AuditEvent(
        contract_id=finding.contract_id,
        actor=decision_in.reviewer,
        action=f"DECISION_{decision_val}",
        details=f"Reviewer {decision_in.reviewer} set decision {decision_val} on finding {finding.finding_type}. Notes: {decision_in.notes or 'None'}",
    )
    db.add(audit)

    # Check if all findings for this contract are now reviewed
    contract_stmt = (
        select(Finding)
        .where(Finding.contract_id == finding.contract_id)
    )
    c_res = await db.execute(contract_stmt)
    all_findings = c_res.scalars().all()
    if all(f.status != "PENDING_REVIEW" for f in all_findings):
        contract = await db.get(Contract, finding.contract_id)
        if contract:
            contract.status = "REVIEWED"

    await db.commit()
    await db.refresh(decision_obj)

    return ReviewDecisionResponse(
        id=decision_obj.id,
        decision=decision_obj.decision,
        reviewer=decision_obj.reviewer,
        notes=decision_obj.notes,
        modified_text=decision_obj.modified_text,
        created_at=decision_obj.created_at,
    )
