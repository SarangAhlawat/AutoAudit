import re
from typing import List, Dict, Any, Tuple, Optional
from backend.app.services.policy.playbook_service import PlaybookService


class RiskEngine:
    SEVERITY_WEIGHTS = {
        "CRITICAL": 95,
        "HIGH": 75,
        "MEDIUM": 45,
        "LOW": 20,
    }

    @classmethod
    def evaluate_clause(
        cls,
        clause: Dict[str, Any],
        playbook_rules: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Evaluates a single clause against policy rules.
        Returns (finding_dict, revision_dict) or (None, None) if compliant.
        """
        category = clause.get("category")
        text = clause.get("text", "")
        heading = clause.get("heading", "")
        attrs = {a.get("attribute_name"): a for a in clause.get("attributes", [])}

        rule = PlaybookService.find_rule_for_category(category, playbook_rules)
        if not rule:
            return None, None

        finding = None
        revision = None

        if category == "LIMITATION_OF_LIABILITY":
            cap_attr = attrs.get("liability_cap")
            # If uncapped or missing cap
            is_uncapped = False
            evidence_snippet = ""

            if cap_attr and cap_attr.get("value_text") == "UNCAPPED":
                is_uncapped = True
                evidence_snippet = cap_attr.get("evidence_text", text[:120])
            elif not cap_attr and ("in no event shall" not in text.lower() and "maximum liability" not in text.lower()):
                is_uncapped = True
                evidence_snippet = text[:150]

            # Check if unilateral (e.g. "Customer's liability shall not be limited" or "Supplier's aggregate liability shall be limited to $100")
            is_unilateral = bool(re.search(r"supplier(?:'s)? aggregate liability.*(?:customer|client).*(?:without limitation|unlimited)", text, re.IGNORECASE))

            if is_uncapped or is_unilateral:
                finding = {
                    "finding_type": "UNCAPPED_LIABILITY",
                    "severity": rule["severity"],  # CRITICAL
                    "risk_score": 95,
                    "explanation": (
                        "The clause does not provide a mutual aggregate liability cap tied to fees paid, "
                        "exposing the company to potentially unbounded financial risk."
                    ),
                    "evidence": evidence_snippet or text[:180],
                    "policy_reference": rule["policy_reference"],
                    "confidence": 0.94,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "Except for breach of confidentiality obligations or gross negligence, neither party's "
                        "aggregate liability arising out of or related to this Agreement shall exceed the total amount "
                        "paid or payable by Customer in the twelve (12) months preceding the claim. In accordance with "
                        "Section 73 of the Indian Contract Act, 1872, in no event shall either party be liable for "
                        "indirect, incidental, special, or consequential damages."
                    ),
                    "rationale": "Inserted mutual 12-month fee liability cap and Section 73 Indian Contract Act 1872 waiver of consequential damages.",
                    "status": "PROPOSED",
                }

        elif category == "INDEMNIFICATION":
            indemnity_attr = attrs.get("indemnity_structure")
            is_unilateral = indemnity_attr and indemnity_attr.get("value_text") == "UNILATERAL"
            # Check if customer is only party indemnifying
            customer_only = bool(re.search(r"\b(customer|client)\s+shall\s+indemnify\b", text, re.IGNORECASE) and not re.search(r"\b(supplier|vendor)\s+shall\s+indemnify\b", text, re.IGNORECASE))

            if is_unilateral or customer_only:
                finding = {
                    "finding_type": "UNILATERAL_INDEMNIFICATION",
                    "severity": rule["severity"],  # HIGH
                    "risk_score": 80,
                    "explanation": (
                        "The indemnity provision is unilateral, obligating Customer to indemnify Supplier "
                        "without reciprocal protection for Customer against third-party IP or negligence claims."
                    ),
                    "evidence": text[:200],
                    "policy_reference": rule["policy_reference"],
                    "confidence": 0.91,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "Each party shall defend, indemnify, and hold harmless the other party, its affiliates, "
                        "and their respective officers and employees from and against any third-party claims, suits, "
                        "or damages arising out of: (a) infringement of any intellectual property rights; or "
                        "(b) gross negligence or willful misconduct, provided the indemnified party provides prompt "
                        "written notice and reasonable cooperation."
                    ),
                    "rationale": "Balanced indemnity structure to make obligations reciprocal with standard IP and gross negligence scope.",
                    "status": "PROPOSED",
                }

        elif category == "CONFIDENTIALITY":
            is_unilateral = bool(re.search(r"\b(customer|client)\s+shall\s+(?:hold|keep)\s+confidential\b", text, re.IGNORECASE) and not re.search(r"each\s+party|mutual", text, re.IGNORECASE))
            has_no_standard_carveouts = "court order" not in text.lower() and "required by law" not in text.lower()

            if is_unilateral or has_no_standard_carveouts:
                finding = {
                    "finding_type": "NON_STANDARD_CONFIDENTIALITY",
                    "severity": rule["severity"],  # HIGH
                    "risk_score": 70,
                    "explanation": (
                        "Confidentiality obligation lacks standard legal disclosure carve-outs or reciprocal protection."
                    ),
                    "evidence": text[:180],
                    "policy_reference": rule["policy_reference"],
                    "confidence": 0.88,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "Each party agrees to hold the other party's Confidential Information in confidence, using "
                        "the same degree of care as for its own proprietary information (not less than reasonable care). "
                        "This obligation shall not apply to information required to be disclosed by applicable law or "
                        "valid court order, provided prompt advance notice is given to the disclosing party."
                    ),
                    "rationale": "Added mutual protection and standard required-by-law disclosure exceptions.",
                    "status": "PROPOSED",
                }

        elif category == "GOVERNING_LAW":
            jurisdiction_attr = attrs.get("governing_jurisdiction")
            jurisdiction_val = jurisdiction_attr.get("value_text") if jurisdiction_attr else ""
            indian_jurisdictions = [
                "india", "delhi", "new delhi", "mumbai", "bombay", "maharashtra",
                "bengaluru", "bangalore", "karnataka", "hyderabad", "telangana",
                "chennai", "madras", "tamil nadu", "gurugram", "gurgaon", "noida",
                "kolkata", "calcutta", "pune"
            ]

            is_indian = any(ij in text.lower() or (jurisdiction_val and ij in jurisdiction_val.lower()) for ij in indian_jurisdictions)

            if not is_indian:
                finding = {
                    "finding_type": "FOREIGN_JURISDICTION_MISMATCH",
                    "severity": "HIGH",
                    "risk_score": 75,
                    "explanation": (
                        f"Governing jurisdiction is designated as '{jurisdiction_val or 'Foreign/Unspecified'}', which is a non-Indian jurisdiction. "
                        "Under Indian corporate policy, governing law must be Laws of the Republic of India with exclusive "
                        "jurisdiction in Indian commercial courts (e.g. New Delhi, Mumbai, or Bengaluru)."
                    ),
                    "evidence": jurisdiction_attr.get("evidence_text", text[:140]) if jurisdiction_attr else text[:140],
                    "policy_reference": rule.get("policy_reference", "Indian Commercial Courts Act, 2015 & CPC 1908"),
                    "confidence": 0.95,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "This Agreement shall be governed by, and construed in accordance with, the laws of the "
                        "Republic of India, without regard to principles of conflicts of law. Subject to arbitration, "
                        "the competent courts located at New Delhi / Mumbai / Bengaluru shall have exclusive jurisdiction over all "
                        "disputes arising out of or in connection with this Agreement."
                    ),
                    "rationale": "Updated choice of law to Laws of the Republic of India and designated Indian commercial courts.",
                    "status": "PROPOSED",
                }

        elif category in ["NON_COMPETE", "RESTRAINT_OF_TRADE"] or ("compete" in text.lower() and ("shall not" in text.lower() or "restrain" in text.lower())):
            finding = {
                "finding_type": "VOID_RESTRAINT_OF_TRADE",
                "severity": "CRITICAL",
                "risk_score": 95,
                "explanation": (
                    "The clause imposes a post-termination covenant restraining lawful trade, business, or employment. "
                    "Under Section 27 of the Indian Contract Act, 1872 and settled Supreme Court of India precedent (Percept D'Mark v. Zaheer Khan), "
                    "every agreement in restraint of trade is void ab initio and legally unenforceable in India."
                ),
                "evidence": text[:180],
                "policy_reference": "Section 27, Indian Contract Act, 1872 (Agreement in Restraint of Trade Void)",
                "confidence": 0.96,
                "status": "PENDING_REVIEW",
            }
            revision = {
                "original_text": text,
                "proposed_text": (
                    "During the term of this Agreement, the parties agree not to solicit or hire any key employees "
                    "of the other party directly engaged in providing the Services without prior written consent. "
                    "Nothing herein shall restrict any individual or party from freely exercising any lawful trade, "
                    "profession, or business after expiration or termination of this Agreement."
                ),
                "rationale": "Replaced void post-termination non-compete covenant with enforceable term-limited non-solicitation per Section 27 Indian Contract Act 1872.",
                "status": "PROPOSED",
            }

        elif category in ["DATA_PRIVACY", "DATA_PROTECTION"] or ("personal data" in text.lower() and "breach" in text.lower()):
            has_dpdp = "dpdp" in text.lower() or "digital personal data protection" in text.lower()
            if not has_dpdp or "board" not in text.lower():
                finding = {
                    "finding_type": "DPDP_ACT_NON_COMPLIANCE",
                    "severity": "HIGH",
                    "risk_score": 80,
                    "explanation": (
                        "Data protection clause fails to incorporate mandatory compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) "
                        "and statutory breach notification to the Data Protection Board of India (DPBI)."
                    ),
                    "evidence": text[:180],
                    "policy_reference": "Digital Personal Data Protection Act, 2023 (Sections 6 & 8)",
                    "confidence": 0.90,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "Each party shall strictly comply with the provisions of the Digital Personal Data Protection Act, 2023 (DPDP Act) "
                        "and applicable Indian IT rules. Supplier shall process personal data solely as a Data Processor upon verified written instructions, "
                        "maintain reasonable technical security safeguards, and promptly notify the Data Fiduciary and "
                        "the Data Protection Board of India (DPBI) of any personal data security breach within seventy-two (72) hours of detection."
                    ),
                    "rationale": "Updated data protection obligations to comply with Digital Personal Data Protection Act, 2023 (DPDP Act).",
                    "status": "PROPOSED",
                }

        elif category == "TERMINATION":
            cure_attr = attrs.get("cure_period_days")
            cure_days = cure_attr.get("value_numeric") if cure_attr else None
            no_convenience = "convenience" not in text.lower() and "without cause" not in text.lower()
            short_cure = cure_days is not None and cure_days < 30

            if no_convenience or short_cure:
                finding = {
                    "finding_type": "RESTRICTIVE_TERMINATION",
                    "severity": "HIGH" if no_convenience else "MEDIUM",
                    "risk_score": 65,
                    "explanation": (
                        "Contract lacks a standard termination for convenience clause, or specifies a cure period "
                        "shorter than the 30-day requirement."
                    ),
                    "evidence": text[:180],
                    "policy_reference": rule["policy_reference"],
                    "confidence": 0.89,
                    "status": "PENDING_REVIEW",
                }
                revision = {
                    "original_text": text,
                    "proposed_text": (
                        "Either party may terminate this Agreement without cause upon thirty (30) days prior written notice. "
                        "Additionally, either party may terminate immediately upon written notice if the other party breaches "
                        "any material obligation and fails to cure such breach within thirty (30) days after receipt of written notice."
                    ),
                    "rationale": "Added standard 30-day convenience termination and protected 30-day cure window.",
                    "status": "PROPOSED",
                }

        return finding, revision

    @classmethod
    def calculate_overall_risk(cls, findings: List[Dict[str, Any]]) -> Tuple[int, str, str]:
        """
        Calculates aggregate contract risk score and risk band.
        Returns:
            overall_score (0-100)
            risk_band (LOW, MEDIUM, HIGH, CRITICAL)
            status (PROCESSING, NEEDS_REVIEW, REVIEWED)
        """
        if not findings:
            return 10, "LOW", "REVIEWED"

        scores = [f.get("risk_score", 50) for f in findings]
        has_critical = any(f.get("severity") == "CRITICAL" for f in findings)
        has_high = any(f.get("severity") == "HIGH" for f in findings)

        max_score = max(scores)
        avg_score = sum(scores) / len(scores)

        # Blended score with high weight on worst finding
        blended = int((max_score * 0.70) + (avg_score * 0.30))
        blended = min(100, max(0, blended))

        if has_critical or blended >= 85:
            band = "CRITICAL"
            status = "NEEDS_REVIEW"
        elif has_high or blended >= 65:
            band = "HIGH"
            status = "NEEDS_REVIEW"
        elif blended >= 40:
            band = "MEDIUM"
            status = "NEEDS_REVIEW"
        else:
            band = "LOW"
            status = "REVIEWED"

        return blended, band, status
