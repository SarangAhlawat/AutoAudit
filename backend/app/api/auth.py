import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.app.db.session import get_db
from backend.app.models.models import User, Organization
from backend.app.schemas.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    PasswordChangeRequest,
    TokenResponse,
    RefreshTokenRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extracts and authenticates user from HTTP-only cookie or Authorization header.
    """
    token: Optional[str] = None

    # 1. Check HTTP-only cookie first
    if "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    # 2. Check Authorization Bearer header
    if not token and "Authorization" in request.headers:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    stmt = select(User).options(selectinload(User.organization)).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or disabled.",
        )

    return user


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Graceful auth check that returns None if unauthenticated."""
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None


def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    user_email: Optional[str] = None,
    org_name: Optional[str] = None,
    session_id: Optional[str] = None,
) -> str:
    """Sets HTTP-only secure authentication cookies and client tracking cookies."""
    sid = session_id or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    max_refresh_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    max_access_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # 1. Access Token (HTTP-Only)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=max_access_age,
        path="/",
    )
    # 2. Refresh Token (HTTP-Only)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=max_refresh_age,
        path="/",
    )
    # 3. Session tracking cookie
    response.set_cookie(
        key="aa_session_id",
        value=sid,
        httponly=False,
        samesite="lax",
        max_age=max_refresh_age,
        path="/",
    )
    # 4. Activity timestamp tracking
    response.set_cookie(
        key="aa_last_active",
        value=now_iso,
        httponly=False,
        samesite="lax",
        max_age=max_refresh_age,
        path="/",
    )
    # 5. Organization Tenant tracking
    if org_name:
        response.set_cookie(
            key="aa_tenant",
            value=org_name,
            httponly=False,
            samesite="lax",
            max_age=max_refresh_age,
            path="/",
        )
    # 6. Combined client tracking payload
    client_payload = {
        "session_id": sid,
        "email": user_email or "",
        "tenant": org_name or "",
        "last_active": now_iso,
    }
    response.set_cookie(
        key="aa_client_track",
        value=json.dumps(client_payload),
        httponly=False,
        samesite="lax",
        max_age=max_refresh_age,
        path="/",
    )
    return sid


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check if email is already registered
    existing = await db.execute(select(User).where(User.email == req.email.strip().lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Resolve or create organization
    org: Optional[Organization] = None
    if req.organization_name and req.organization_name.strip():
        org_name = req.organization_name.strip()
        org_res = await db.execute(select(Organization).where(Organization.name == org_name))
        org = org_res.scalar_one_or_none()
        if not org:
            org = Organization(
                name=org_name,
                legal_entity_name=f"{org_name} Private Limited",
                primary_jurisdiction="New Delhi, India",
            )
            db.add(org)
            await db.flush()
    else:
        # Link to default organization
        org_res = await db.execute(select(Organization).limit(1))
        org = org_res.scalar_one_or_none()
        if not org:
            org = Organization(
                name="Acme Technologies",
                legal_entity_name="Acme Technologies Private Limited",
                primary_jurisdiction="New Delhi, India",
            )
            db.add(org)
            await db.flush()

    # Create new user
    new_user = User(
        email=req.email.strip().lower(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name.strip(),
        role=req.role or "LEGAL_COUNSEL",
        organization_id=org.id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate JWT tokens
    access_token = create_access_token({"sub": new_user.id, "email": new_user.email, "org_id": org.id})
    refresh_token = create_refresh_token({"sub": new_user.id, "email": new_user.email, "org_id": org.id})

    # Set cookies
    _set_auth_cookies(response, access_token, refresh_token, user_email=new_user.email, org_name=org.name)

    user_resp = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        organization_id=new_user.organization_id,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        organization_name=org.name,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    req: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).options(selectinload(User.organization)).where(User.email == req.email.strip().lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended.",
        )

    org_name = user.organization.name if user.organization else "Enterprise"

    access_token = create_access_token({"sub": user.id, "email": user.email, "org_id": user.organization_id})
    refresh_token = create_refresh_token({"sub": user.id, "email": user.email, "org_id": user.organization_id})

    _set_auth_cookies(response, access_token, refresh_token, user_email=user.email, org_name=org_name)

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization_name=org_name,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    # Check cookie or body
    token = request.cookies.get("refresh_token")
    if not token and body and body.refresh_token:
        token = body.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided.",
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_id = payload.get("sub")
    stmt = select(User).options(selectinload(User.organization)).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session invalid.",
        )

    org_id = user.organization_id
    org_name = user.organization.name if user.organization else "Enterprise"

    new_access_token = create_access_token({"sub": user.id, "email": user.email, "org_id": org_id})
    new_refresh_token = create_refresh_token({"sub": user.id, "email": user.email, "org_id": org_id})

    _set_auth_cookies(response, new_access_token, new_refresh_token, user_email=user.email, org_name=org_name)

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active,
        created_at=user.created_at,
        organization_name=org_name,
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_resp,
    )


@router.post("/logout")
async def logout(response: Response):
    """Clears HTTP-only authentication cookies and tracking cookies."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="aa_session_id", path="/")
    response.delete_cookie(key="aa_last_active", path="/")
    response.delete_cookie(key="aa_tenant", path="/")
    response.delete_cookie(key="aa_client_track", path="/")
    return {"message": "Logged out successfully and tracking cookies cleared"}


@router.get("/session")
async def get_session_info(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns session and cookie tracking diagnostics.
    Refreshes the aa_last_active cookie to track activity.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    response.set_cookie(
        key="aa_last_active",
        value=now_iso,
        httponly=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )

    user = await get_optional_user(request, db)
    detected_cookies = list(request.cookies.keys())
    session_id = request.cookies.get("aa_session_id", "none")
    tenant = request.cookies.get("aa_tenant", user.organization.name if user and user.organization else "Acme Corporation")

    return {
        "authenticated": user is not None,
        "session_id": session_id,
        "last_active": now_iso,
        "tenant": tenant,
        "detected_cookies": detected_cookies,
        "has_access_token_cookie": "access_token" in request.cookies,
        "has_refresh_token_cookie": "refresh_token" in request.cookies,
        "access_token_expires_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_token_expires_days": settings.REFRESH_TOKEN_EXPIRE_DAYS,
        "client_ip": request.client.host if request.client else "unknown",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            organization_id=user.organization_id,
            is_active=user.is_active,
            created_at=user.created_at,
            organization_name=user.organization.name if user.organization else tenant,
        ) if user else None,
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns profile and tenant of the authenticated user, refreshing last active cookie."""
    now_iso = datetime.now(timezone.utc).isoformat()
    response.set_cookie(
        key="aa_last_active",
        value=now_iso,
        httponly=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )
    stmt = select(Organization).where(Organization.id == current_user.organization_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        organization_name=org.name if org else "Enterprise",
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates user name and/or email."""
    if req.full_name and req.full_name.strip():
        current_user.full_name = req.full_name.strip()
    if req.email and req.email.strip():
        new_email = req.email.strip().lower()
        if new_email != current_user.email:
            existing = await db.execute(select(User).where(User.email == new_email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email is already in use by another account.")
            current_user.email = new_email

    await db.commit()
    await db.refresh(current_user)

    stmt = select(Organization).where(Organization.id == current_user.organization_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=current_user.organization_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        organization_name=org.name if org else "Enterprise",
    )


@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verifies existing password and updates with new bcrypt hash."""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect.")

    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Password changed successfully."}
