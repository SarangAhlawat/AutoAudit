from typing import List, Dict, Any, Optional


class PlaybookService:
    DEFAULT_PLAYBOOK_ID = "default-acme-playbook"
    DEFAULT_PLAYBOOK_NAME = "India Enterprise Commercial Standard Legal Playbook"

    DEFAULT_RULES = [
        {
            "clause_category": "LIMITATION_OF_LIABILITY",
            "rule_name": "Mutual Liability Cap & Section 73 ICA Remoteness",
            "preferred_position": (
                "Except for breach of confidentiality obligations or gross negligence, neither party's "
                "aggregate liability arising out of or related to this Agreement shall exceed the total amount "
                "paid or payable by Customer in the twelve (12) months preceding the claim. In accordance with "
                "Section 73 of the Indian Contract Act, 1872, in no event shall either party be liable for "
                "indirect, remote, special, or consequential damages."
            ),
            "fallback_position": (
                "Each party's aggregate liability shall be capped at two times (2x) the fees paid in the "
                "prior 12 months, or ₹1,00,00,000 (INR One Crore), whichever is greater."
            ),
            "unacceptable_position": (
                "Uncapped liability, unilateral customer liability, or exclusion of supplier liability "
                "for breach of contract or confidentiality."
            ),
            "severity": "CRITICAL",
            "policy_reference": "Indian Contract Act, 1872 (Sections 73 & 74) - Limitation of Liability & Remoteness",
            "rationale": "Under Section 74 of the Indian Contract Act 1872, damages must be a genuine pre-estimate of loss. Consequential/remote losses must be expressly excluded per Section 73."
        },
        {
            "clause_category": "INDEMNIFICATION",
            "rule_name": "Mutual IP & Gross Negligence Indemnity (Sections 124-125 ICA)",
            "preferred_position": (
                "Each party shall defend, indemnify, and hold harmless the other party against any "
                "direct third-party claims arising from intellectual property infringement or gross negligence, "
                "provided prompt written notice and control of defense is granted."
            ),
            "fallback_position": (
                "Supplier indemnifies Customer for third-party IP claims in India with reasonable defense procedure."
            ),
            "unacceptable_position": (
                "Unilateral indemnity obligating Customer to indemnify Supplier for ordinary negligence, "
                "or uncapped indemnification without prompt notice conditions."
            ),
            "severity": "HIGH",
            "policy_reference": "Indian Contract Act, 1872 (Sections 124 & 125) - Contract of Indemnity",
            "rationale": "Unilateral indemnification creates one-sided exposure to third-party litigation costs."
        },
        {
            "clause_category": "CONFIDENTIALITY",
            "rule_name": "Mutual Confidentiality with Indian Law Carve-outs",
            "preferred_position": (
                "Each party agrees to hold the other party's Confidential Information in confidence, "
                "using at least reasonable care, for a period of three (3) years from disclosure, provided trade secrets remain protected perpetually. "
                "Excludes disclosures required under Indian law, valid court order, or statutory authorities (e.g., RBI, SEBI)."
            ),
            "fallback_position": (
                "Mutual confidentiality surviving two (2) years from disclosure with standard Indian statutory carve-outs."
            ),
            "unacceptable_position": (
                "Unilateral confidentiality binding only Customer, or lack of carve-out for disclosures "
                "required by Indian courts or regulatory authorities."
            ),
            "severity": "HIGH",
            "policy_reference": "Commercial Law Confidentiality & Indian Evidence Act",
            "rationale": "Unilateral terms fail to protect company trade secrets, and carve-outs are mandatory for Indian regulatory compliance."
        },
        {
            "clause_category": "GOVERNING_LAW",
            "rule_name": "Governing Law of Republic of India & Competent Courts",
            "preferred_position": (
                "This Agreement shall be governed by, and construed in accordance with, the laws of the "
                "Republic of India, without regard to conflict of law principles. Subject to arbitration, "
                "the competent courts at New Delhi, Mumbai, or Bengaluru shall have exclusive jurisdiction."
            ),
            "fallback_position": (
                "Laws of the Republic of India with jurisdiction in High Court of Delhi or High Court of Bombay."
            ),
            "unacceptable_position": (
                "Foreign jurisdictions (e.g. Delaware, New York, English law, Singapore) or non-Indian courts."
            ),
            "severity": "HIGH",
            "policy_reference": "Indian Commercial Courts Act, 2015 & CPC 1908 - Territorial Jurisdiction",
            "rationale": "Foreign jurisdictions impose prohibitive cross-border dispute expenses and conflict with Indian corporate governance."
        },
        {
            "clause_category": "DISPUTE_RESOLUTION",
            "rule_name": "Indian Arbitration and Conciliation Act, 1996",
            "preferred_position": (
                "Any dispute arising out of or in connection with this Agreement shall be referred to and finally "
                "resolved by arbitration under the Arbitration and Conciliation Act, 1996 (as amended). "
                "The tribunal shall consist of a sole arbitrator mutually appointed by the parties. "
                "The seat and venue of arbitration shall be New Delhi (or Mumbai/Bengaluru), India, and proceedings conducted in English."
            ),
            "fallback_position": (
                "Arbitration administered by Delhi International Arbitration Centre (DIAC) or Mumbai Centre for International Arbitration (MCIA)."
            ),
            "unacceptable_position": (
                "Unilateral appointment of sole arbitrator by one party (violating Section 12(5) of the Arbitration Act and Perkins Eastman precedent) or foreign arbitral seats."
            ),
            "severity": "HIGH",
            "policy_reference": "Arbitration and Conciliation Act, 1996 (Sections 7, 11, 12(5)) & Perkins Eastman",
            "rationale": "Unilateral arbitrator appointments are invalid per se under Indian law; domestic Indian seat ensures expedited enforcement under Part I."
        },
        {
            "clause_category": "NON_COMPETE",
            "rule_name": "Section 27 Indian Contract Act 1872 - Restraint of Trade Void",
            "preferred_position": (
                "Neither party shall solicit or recruit key employees of the other party directly involved in "
                "the engagement for a period of twelve (12) months following termination. No post-termination "
                "restrictions on lawful trade, profession, or business are imposed."
            ),
            "fallback_position": (
                "6-month non-solicitation of key management personnel."
            ),
            "unacceptable_position": (
                "Post-termination non-compete clauses on individuals or service providers, which are void ab initio under Section 27 of the Indian Contract Act, 1872."
            ),
            "severity": "CRITICAL",
            "policy_reference": "Section 27, Indian Contract Act, 1872 - Agreement in Restraint of Trade Void",
            "rationale": "Under Section 27 of the Indian Contract Act 1872 and settled Supreme Court jurisprudence (Percept D'Mark v. Zaheer Khan), post-termination non-compete covenants are void and legally unenforceable in India."
        },
        {
            "clause_category": "DATA_PRIVACY",
            "rule_name": "Digital Personal Data Protection Act, 2023 (DPDP Act)",
            "preferred_position": (
                "Each party shall comply with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the "
                "Information Technology Act, 2000. Supplier shall process personal data solely as a Data Processor "
                "upon written instructions, implement reasonable security safeguards, and notify any personal data breach "
                "to the Data Fiduciary and the Data Protection Board of India (DPBI) within 72 hours."
            ),
            "fallback_position": (
                "Compliance with DPDP Act 2023 with data breach notification within 5 business days."
            ),
            "unacceptable_position": (
                "Unrestricted offshore transfer of personal data without consent, or complete disclaimer of DPDP Act statutory data fiduciary obligations."
            ),
            "severity": "HIGH",
            "policy_reference": "Digital Personal Data Protection Act, 2023 & IT Act 2000 Section 43A",
            "rationale": "Failure to comply with DPDP Act 2023 exposes organizations to statutory penalties up to ₹250 Crores imposed by the Data Protection Board of India."
        },
        {
            "clause_category": "TERMINATION",
            "rule_name": "Convenience & 30-Day Cure Period Required",
            "preferred_position": (
                "Either party may terminate this Agreement for convenience upon thirty (30) days prior written "
                "notice, or immediately upon written notice if the other party breaches a material term and fails "
                "to cure such breach within thirty (30) days of receipt of written notice."
            ),
            "fallback_position": (
                "Termination for convenience upon 60 days notice; cure period of 15 business days."
            ),
            "unacceptable_position": (
                "Lock-in clauses with no termination for convenience or immediate termination without cure."
            ),
            "severity": "HIGH",
            "policy_reference": "Indian Contract Act, 1872 (Section 39) - Discharge & Breach",
            "rationale": "Lack of termination rights or cure periods risks severe operational lock-in and dispute liability."
        },
        {
            "clause_category": "PAYMENT_TERMS",
            "rule_name": "CGST Act 2017 Tax Invoices & TDS Compliance",
            "preferred_position": (
                "Invoices shall be paid within thirty (30) days of receipt of a valid Tax Invoice compliant with "
                "the Central Goods and Services Tax (CGST) Act, 2017. Customer shall deduct applicable Tax Deducted at Source (TDS) "
                "under the Indian Income-tax Act, 1961 and issue TDS certificates (Form 16A)."
            ),
            "fallback_position": (
                "Payment within forty-five (45) days in compliance with Section 15 of the MSMED Act, 2006."
            ),
            "unacceptable_position": (
                "Payment upon receipt, advance payments without bank guarantee, or failure to issue GST-compliant tax invoices."
            ),
            "severity": "LOW",
            "policy_reference": "CGST Act 2017 (Sec 31), Income-tax Act 1961 (Sec 194C/194J), MSMED Act 2006",
            "rationale": "GST tax invoices are required to claim Input Tax Credit (ITC), and payments to registered MSME vendors are statutorily regulated under MSMED Act."
        },
    ]

    @classmethod
    def get_default_playbook(cls) -> Dict[str, Any]:
        return {
            "id": cls.DEFAULT_PLAYBOOK_ID,
            "name": cls.DEFAULT_PLAYBOOK_NAME,
            "description": "Standard Indian commercial contracts legal playbook aligned with ICA 1872, DPDP Act 2023, and Arbitration Act 1996.",
            "version": "1.0",
            "is_default": True,
            "rules": cls.DEFAULT_RULES,
        }

    @classmethod
    def find_rule_for_category(cls, category: str, playbook_rules: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
        rules = playbook_rules or cls.DEFAULT_RULES
        for rule in rules:
            if rule.get("clause_category") == category:
                return rule
        return None
