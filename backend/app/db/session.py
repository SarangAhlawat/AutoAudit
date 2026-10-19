from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from backend.app.core.config import settings
from backend.app.models.base import Base


def normalize_database_url(url: str) -> str:
    """
    Normalizes PostgreSQL URLs to use the asyncpg async driver dialect.
    Handles 'postgres://' and 'postgresql://' prefixes from Supabase, Neon, AWS RDS, Render, etc.
    """
    cleaned = url.strip()
    if cleaned.startswith("postgres://"):
        return cleaned.replace("postgres://", "postgresql+asyncpg://", 1)
    elif cleaned.startswith("postgresql://") and not cleaned.startswith("postgresql+asyncpg://"):
        return cleaned.replace("postgresql://", "postgresql+asyncpg://", 1)
    return cleaned


db_url = normalize_database_url(settings.DATABASE_URL)

engine_kwargs = {
    "echo": False,
    "future": True,
}

if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL asyncpg connection pool tuning
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine: AsyncEngine = create_async_engine(db_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default playbook and organization if not present
    from sqlalchemy import select
    from backend.app.models.models import PolicyPlaybook, PolicyRule, Organization
    from backend.app.services.policy.playbook_service import PlaybookService

    async with AsyncSessionLocal() as session:
        try:
            # Check default playbook
            pb_res = await session.execute(select(PolicyPlaybook).limit(1))
            if not pb_res.scalars().first():
                default_data = PlaybookService.get_default_playbook()
                new_pb = PolicyPlaybook(
                    id=default_data["id"],
                    name=default_data["name"],
                    description=default_data["description"],
                    version=default_data["version"],
                    is_default=True,
                )
                session.add(new_pb)
                await session.flush()

                for r in default_data["rules"]:
                    rule = PolicyRule(
                        playbook_id=new_pb.id,
                        clause_category=r["clause_category"],
                        rule_name=r["rule_name"],
                        preferred_position=r["preferred_position"],
                        fallback_position=r["fallback_position"],
                        unacceptable_position=r["unacceptable_position"],
                        severity=r["severity"],
                        policy_reference=r["policy_reference"],
                        rationale=r["rationale"],
                    )
                    session.add(rule)
                await session.commit()

            # Check organization
            org_res = await session.execute(select(Organization).limit(1))
            org = org_res.scalars().first()
            if not org:
                org = Organization(
                    name="Acme Technologies",
                    legal_entity_name="Acme Technologies Private Limited",
                    primary_jurisdiction="New Delhi, India",
                    risk_threshold_high=75,
                    risk_threshold_medium=45,
                    default_playbook_id="default-acme-playbook",
                )
                session.add(org)
                await session.flush()

            # Check default user
            from backend.app.models.models import User
            from backend.app.core.security import get_password_hash

            user_res = await session.execute(select(User).limit(1))
            if not user_res.scalars().first():
                demo_user = User(
                    email="counsel@acme.com",
                    hashed_password=get_password_hash("password123"),
                    full_name="Sarah Jenkins, Esq.",
                    role="LEGAL_COUNSEL",
                    organization_id=org.id,
                    is_active=True,
                )
                session.add(demo_user)
                await session.commit()
            else:
                await session.commit()
        except Exception:
            await session.rollback()

