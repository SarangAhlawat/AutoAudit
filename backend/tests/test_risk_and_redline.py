from pathlib import Path
import docx
import pytest
from backend.app.services.risk.engine import RiskEngine
from backend.app.services.redlining.docx_engine import DocxRedlineEngine


def test_risk_evaluation_for_uncapped_liability():
    clause = {
        "clause_number": "5.0",
        "heading": "Limitation of Liability",
        "category": "LIMITATION_OF_LIABILITY",
        "text": "IN NO EVENT SHALL SUPPLIER'S AGGREGATE LIABILITY EXCEED $5,000. CUSTOMER'S LIABILITY SHALL BE WITHOUT LIMITATION.",
        "attributes": [
            {
                "attribute_name": "liability_cap",
                "value_text": "UNCAPPED",
                "confidence": 0.95,
                "evidence_text": "without limitation",
            }
        ]
    }

    finding, revision = RiskEngine.evaluate_clause(clause)
    assert finding is not None
    assert finding["severity"] == "CRITICAL"
    assert finding["finding_type"] == "UNCAPPED_LIABILITY"
    assert "Contract Act" in finding["policy_reference"] or "Playbook" in finding["policy_reference"]

    assert revision is not None
    assert "proposed_text" in revision
    assert "aggregate liability" in revision["proposed_text"]


def test_docx_tracked_change_generation(tmp_path):
    output_docx = tmp_path / "test_redline.docx"

    clauses_data = [
        {
            "clause_number": "1.0",
            "heading": "Preamble",
            "text": "This is a standard compliant introductory preamble clause.",
            "revision": None,
        },
        {
            "clause_number": "2.0",
            "heading": "Limitation of Liability",
            "text": "Customer shall have unlimited liability under all circumstances.",
            "revision": {
                "proposed_text": "Neither party's liability shall exceed the fees paid in preceding 12 months.",
                "rationale": "Inserted mutual cap per playbook rule 4.1",
            }
        }
    ]

    DocxRedlineEngine.generate_redlined_copy(
        contract_title="Test Commercial Contract",
        counterparty="Acme Partner",
        clauses=clauses_data,
        output_path=output_docx,
    )

    assert output_docx.exists()
    # Open document to verify XML integrity
    doc = docx.Document(output_docx)
    paras = [p.text for p in doc.paragraphs if p.text.strip()]
    assert any("AutoAudit Review Copy" in p for p in paras)
    assert any("Limitation of Liability" in p for p in paras)
    assert any("Policy Justification" in p for p in paras)
