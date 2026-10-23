from pathlib import Path
import pytest
from backend.app.workflows.orchestrator import ContractPipelineOrchestrator


@pytest.mark.asyncio
async def test_full_contract_api_workflow(client, db_session):
    # 1. Check playbooks endpoint
    pb_resp = await client.get("/api/v1/playbooks")
    assert pb_resp.status_code == 200
    playbooks = pb_resp.json()
    assert "Enterprise" in playbooks[0]["name"]

    # 2. Upload contract
    sample_msa = Path("storage/samples/sample_vendor_msa.docx")
    assert sample_msa.exists()

    with open(sample_msa, "rb") as f:
        upload_resp = await client.post(
            "/api/v1/contracts/upload",
            files={"file": ("sample_vendor_msa.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"title": "CloudCore Vendor MSA", "counterparty": "CloudCore Systems Inc."},
        )

    assert upload_resp.status_code == 201
    upload_data = upload_resp.json()
    contract_id = upload_data["contract_id"]
    job_id = upload_data["job_id"]
    assert contract_id is not None
    assert job_id is not None

    # 3. Execute pipeline
    from backend.tests.conftest import TestingSessionLocal
    await ContractPipelineOrchestrator.process_contract(contract_id, job_id, session_factory=TestingSessionLocal)

    # 4. Check job status
    job_resp = await client.get(f"/api/v1/jobs/{job_id}")
    assert job_resp.status_code == 200
    assert job_resp.json()["status"] == "COMPLETED"
    assert job_resp.json()["progress_percent"] == 100

    # 5. Fetch contract details
    contract_resp = await client.get(f"/api/v1/contracts/{contract_id}")
    assert contract_resp.status_code == 200
    c_data = contract_resp.json()
    assert c_data["title"] == "CloudCore Vendor MSA"
    assert c_data["risk_score"] > 50
    assert c_data["risk_band"] in ["HIGH", "CRITICAL"]
    assert c_data["status"] == "NEEDS_REVIEW"
    assert len(c_data["clauses"]) >= 7
    assert len(c_data["findings"]) >= 1

    # 6. Test findings endpoint
    findings_resp = await client.get(f"/api/v1/contracts/{contract_id}/findings")
    assert findings_resp.status_code == 200
    findings = findings_resp.json()
    assert len(findings) >= 1

    first_finding = findings[0]
    finding_id = first_finding["id"]
    assert first_finding["policy_reference"] != ""
    assert first_finding["proposal"] is not None

    # 7. Submit human reviewer decision
    decision_resp = await client.post(
        f"/api/v1/findings/{finding_id}/decision",
        json={
            "decision": "ACCEPTED",
            "reviewer": "Sarah Jenkins (Lead Counsel)",
            "notes": "Approved proposed revision based on Acme Playbook rule.",
        }
    )
    assert decision_resp.status_code == 200
    d_data = decision_resp.json()
    assert d_data["decision"] == "ACCEPTED"
    assert d_data["reviewer"] == "Sarah Jenkins (Lead Counsel)"

    # 8. Check executive report
    report_resp = await client.get(f"/api/v1/contracts/{contract_id}/report")
    assert report_resp.status_code == 200
    rep = report_resp.json()
    assert rep["total_findings"] >= 1
    assert "disclaimer" in rep

    # Check HTML report
    html_resp = await client.get(f"/api/v1/contracts/{contract_id}/report?format=html")
    assert html_resp.status_code == 200
    assert "AutoAudit Executive Report" in html_resp.text

    # 9. Test redline download endpoint
    redline_resp = await client.get(f"/api/v1/contracts/{contract_id}/redline")
    assert redline_resp.status_code == 200
    assert redline_resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert len(redline_resp.content) > 1000

    # 10. Test Organization profile GET and PUT
    org_resp = await client.get("/api/v1/organization")
    assert org_resp.status_code == 200
    assert org_resp.json()["name"] in ["Acme Corporation", "Acme Technologies"]

    org_update_resp = await client.put(
        "/api/v1/organization",
        json={"name": "Nexus Global Technologies", "primary_jurisdiction": "New York"}
    )
    assert org_update_resp.status_code == 200
    assert org_update_resp.json()["name"] == "Nexus Global Technologies"
    assert org_update_resp.json()["primary_jurisdiction"] == "New York"

    # 11. Test Customizing a Playbook Rule
    rule_id = playbooks[0]["rules"][0]["id"]
    rule_update_resp = await client.put(
        f"/api/v1/playbooks/{playbooks[0]['id']}/rules/{rule_id}",
        json={"preferred_position": "Updated 24-month fee cap standard."}
    )
    assert rule_update_resp.status_code == 200
    assert rule_update_resp.json()["preferred_position"] == "Updated 24-month fee cap standard."

    # 12. Test deleting contract
    del_resp = await client.delete(f"/api/v1/contracts/{contract_id}")
    assert del_resp.status_code == 200
    get_del = await client.get(f"/api/v1/contracts/{contract_id}")
    assert get_del.status_code == 404
