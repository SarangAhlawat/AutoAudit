from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.session import get_db
from backend.app.models.models import Organization
from backend.app.schemas.schemas import OrganizationResponse, OrganizationUpdate

router = APIRouter(prefix="/organization", tags=["Organization"])


@router.get("", response_model=OrganizationResponse)
async def get_organization_profile(db: AsyncSession = Depends(get_db)):
    stmt = select(Organization).limit(1)
    res = await db.execute(stmt)
    org = res.scalars().first()

    if not org:
        # Create default organization
        org = Organization(
            name="Acme Technologies",
            legal_entity_name="Acme Technologies Private Limited",
            primary_jurisdiction="New Delhi, India",
            risk_threshold_high=75,
            risk_threshold_medium=45,
            default_playbook_id="default-acme-playbook",
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

    return org


@router.put("", response_model=OrganizationResponse)
async def update_organization_profile(
    update_data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Organization).limit(1)
    res = await db.execute(stmt)
    org = res.scalars().first()

    if not org:
        org = Organization()
        db.add(org)

    if update_data.name is not None:
        org.name = update_data.name
    if update_data.legal_entity_name is not None:
        org.legal_entity_name = update_data.legal_entity_name
    if update_data.primary_jurisdiction is not None:
        org.primary_jurisdiction = update_data.primary_jurisdiction
    if update_data.risk_threshold_high is not None:
        org.risk_threshold_high = update_data.risk_threshold_high
    if update_data.risk_threshold_medium is not None:
        org.risk_threshold_medium = update_data.risk_threshold_medium

    await db.commit()
    await db.refresh(org)
    return org
