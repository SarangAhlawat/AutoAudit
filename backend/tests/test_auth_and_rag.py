import pytest
from pathlib import Path


@pytest.mark.asyncio
async def test_auth_registration_and_cookies(client, db_session):
    # 1. Register new user
    reg_data = {
        "email": "sarah.legal@acmecorp.com",
        "password": "SecurePassword123!",
        "full_name": "Sarah Connor",
        "role": "LEGAL_COUNSEL",
        "organization_name": "Cyberdyne Systems",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_data)
    assert reg_resp.status_code == 201
    reg_json = reg_resp.json()
    assert reg_json["access_token"] is not None
    assert reg_json["refresh_token"] is not None
    assert reg_json["user"]["email"] == "sarah.legal@acmecorp.com"
    assert reg_json["user"]["organization_name"] == "Cyberdyne Systems"

    # Check cookies were set
    assert "access_token" in reg_resp.cookies
    assert "refresh_token" in reg_resp.cookies

    # 2. Login with credentials
    login_data = {
        "email": "sarah.legal@acmecorp.com",
        "password": "SecurePassword123!",
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_data)
    assert login_resp.status_code == 200
    login_json = login_resp.json()
    assert login_json["user"]["full_name"] == "Sarah Connor"
    assert "access_token" in login_resp.cookies

    # 3. Access authenticated /me endpoint using cookie
    me_resp = await client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    me_json = me_resp.json()
    assert me_json["email"] == "sarah.legal@acmecorp.com"
    assert me_json["organization_name"] == "Cyberdyne Systems"

    # 4. Refresh token
    refresh_resp = await client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["access_token"] is not None

    # 5. Logout clears cookies
    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_policy_document_upload_and_rag(client, db_session):
    # Use one of the real test policy files in test-data/
    sample_policy = Path("test-data/01_Acme_Corp_Technology/Acme_Corporate_Contract_Policy_Playbook.docx")
    assert sample_policy.exists()

    with open(sample_policy, "rb") as f:
        resp = await client.post(
            "/api/v1/policy-docs/upload",
            files={"file": ("Acme_Corporate_Contract_Policy_Playbook.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"title": "Acme Master Corporate Policy"},
        )

    assert resp.status_code == 201
    doc_data = resp.json()
    doc_id = doc_data["id"]
    assert doc_data["title"] == "Acme Master Corporate Policy"
    assert doc_data["chunk_count"] > 0

    # List policy documents
    list_resp = await client.get("/api/v1/policy-docs")
    assert list_resp.status_code == 200
    docs = list_resp.json()
    assert any(d["id"] == doc_id for d in docs)

    # Inspect chunks
    chunks_resp = await client.get(f"/api/v1/policy-docs/{doc_id}/chunks")
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()
    assert len(chunks) == doc_data["chunk_count"]


@pytest.mark.asyncio
async def test_new_org_empty_dashboard_isolation(client, db_session):
    # 1. Register brand new Organization A
    reg_a = await client.post("/api/v1/auth/register", json={
        "email": "counsel@indotech.in",
        "password": "Password123!",
        "full_name": "Adv. Rajesh Sharma",
        "organization_name": "IndoTech Private Limited",
    })
    assert reg_a.status_code == 201
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Check dashboard contracts for new Organization A -> MUST BE EMPTY
    list_a = await client.get("/api/v1/contracts", headers=headers_a)
    assert list_a.status_code == 200
    assert list_a.json() == [], "New organization dashboard must start completely empty with 0 contracts"

    # 3. Upload a contract for Organization A
    sample_msa = Path("storage/samples/sample_vendor_msa.docx")
    with open(sample_msa, "rb") as f:
        upload_resp = await client.post(
            "/api/v1/contracts/upload",
            headers=headers_a,
            files={"file": ("vendor_agreement.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"title": "Cloud Services Agreement", "counterparty": "Bangalore Cloud Services Pvt. Ltd."},
        )
    assert upload_resp.status_code == 201

    # 4. Org A now sees 1 contract
    list_a_after = await client.get("/api/v1/contracts", headers=headers_a)
    assert list_a_after.status_code == 200
    assert len(list_a_after.json()) == 1
    assert list_a_after.json()[0]["title"] == "Cloud Services Agreement"

    # 5. Register brand new Organization B
    reg_b = await client.post("/api/v1/auth/register", json={
        "email": "legal@bharatlogistics.in",
        "password": "Password123!",
        "full_name": "Priya Nair",
        "organization_name": "Bharat Logistics Solutions LLP",
    })
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 6. Organization B's dashboard MUST BE EMPTY (0 contracts, no leakage from Org A)
    list_b = await client.get("/api/v1/contracts", headers=headers_b)
    assert list_b.status_code == 200
    assert list_b.json() == [], "Organization B must not see Organization A's contracts"
