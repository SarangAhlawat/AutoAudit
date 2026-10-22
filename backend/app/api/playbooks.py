from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.models import PolicyPlaybook, PolicyRule
from backend.app.schemas.schemas import (
    PolicyPlaybookResponse,
    PolicyRuleResponse,
    PolicyRuleUpdate,
    PolicyRuleCreate,
)
from backend.app.services.policy.playbook_service import PlaybookService

router = APIRouter(prefix="/playbooks", tags=["Playbooks"])


@router.get("", response_model=list[PolicyPlaybookResponse])
async def list_playbooks(db: AsyncSession = Depends(get_db)):
    stmt = select(PolicyPlaybook).options(selectinload(PolicyPlaybook.rules))
    res = await db.execute(stmt)
    playbooks = res.scalars().all()

    # If no playbooks exist in DB yet, initialize the default one
    if not playbooks:
        default_data = PlaybookService.get_default_playbook()
        pb = PolicyPlaybook(
            id=default_data["id"],
            name=default_data["name"],
            description=default_data["description"],
            version=default_data["version"],
            is_default=True,
        )
        db.add(pb)
        await db.flush()

        for r in default_data["rules"]:
            rule = PolicyRule(
                playbook_id=pb.id,
                clause_category=r["clause_category"],
                rule_name=r["rule_name"],
                preferred_position=r["preferred_position"],
                fallback_position=r["fallback_position"],
                unacceptable_position=r["unacceptable_position"],
                severity=r["severity"],
                policy_reference=r["policy_reference"],
                rationale=r["rationale"],
            )
            db.add(rule)

        await db.commit()
        res = await db.execute(stmt)
        playbooks = res.scalars().all()

    return playbooks


@router.get("/{playbook_id}", response_model=PolicyPlaybookResponse)
async def get_playbook(playbook_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(PolicyPlaybook)
        .where(PolicyPlaybook.id == playbook_id)
        .options(selectinload(PolicyPlaybook.rules))
    )
    res = await db.execute(stmt)
    pb = res.scalar_one_or_none()
    if not pb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Playbook '{playbook_id}' not found."
        )
    return pb


@router.put("/{playbook_id}/rules/{rule_id}", response_model=PolicyRuleResponse)
async def update_playbook_rule(
    playbook_id: str,
    rule_id: str,
    update_data: PolicyRuleUpdate,
    db: AsyncSession = Depends(get_db)
):
    rule = await db.get(PolicyRule, rule_id)
    if not rule or rule.playbook_id != playbook_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rule '{rule_id}' not found in playbook '{playbook_id}'."
        )

    if update_data.preferred_position is not None:
        rule.preferred_position = update_data.preferred_position
    if update_data.fallback_position is not None:
        rule.fallback_position = update_data.fallback_position
    if update_data.unacceptable_position is not None:
        rule.unacceptable_position = update_data.unacceptable_position
    if update_data.severity is not None:
        rule.severity = update_data.severity.upper()
    if update_data.rationale is not None:
        rule.rationale = update_data.rationale

    await db.commit()
    await db.refresh(rule)
    return rule


@router.post("/{playbook_id}/rules", response_model=PolicyRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_playbook_rule(
    playbook_id: str,
    create_data: PolicyRuleCreate,
    db: AsyncSession = Depends(get_db)
):
    pb = await db.get(PolicyPlaybook, playbook_id)
    if not pb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Playbook '{playbook_id}' not found."
        )

    rule = PolicyRule(
        playbook_id=playbook_id,
        clause_category=create_data.clause_category.upper(),
        rule_name=create_data.rule_name,
        preferred_position=create_data.preferred_position,
        fallback_position=create_data.fallback_position,
        unacceptable_position=create_data.unacceptable_position,
        severity=create_data.severity.upper(),
        policy_reference=create_data.policy_reference,
        rationale=create_data.rationale,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule
