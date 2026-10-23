from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.session import get_db
from backend.app.models.models import ProcessingJob
from backend.app.schemas.schemas import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )

    return JobStatusResponse(
        job_id=job.id,
        contract_id=job.contract_id,
        status=job.status,
        progress_percent=job.progress_percent,
        current_stage=job.current_stage,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )
