import os
from pathlib import Path
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import fitz  # PyMuPDF


def add_docx_header(doc, title: str, subtitle: str, company: str):
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run(title)
    run_title.font.name = "Arial"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(26, 36, 48)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run(f"{subtitle}  |  Entity: {company}")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.color.rgb = RGBColor(110, 104, 98)

    div_p = doc.add_paragraph()
    div_p.paragraph_format.space_after = Pt(16)
    run_div = div_p.add_run("―" * 55)
    run_div.font.color.rgb = RGBColor(220, 215, 208)


def add_docx_clause(doc, number_heading: str, body_text: str):
    h_p = doc.add_paragraph()
    h_p.paragraph_format.space_before = Pt(14)
    h_p.paragraph_format.space_after = Pt(4)
    run_h = h_p.add_run(number_heading)
    run_h.font.name = "Arial"
    run_h.font.size = Pt(12)
    run_h.font.bold = True
    run_h.font.color.rgb = RGBColor(26, 36, 48)

    b_p = doc.add_paragraph()
    b_p.paragraph_format.space_after = Pt(10)
    b_p.paragraph_format.line_spacing = 1.2
    run_b = b_p.add_run(body_text)
    run_b.font.name = "Georgia"
    run_b.font.size = Pt(10.5)
    run_b.font.color.rgb = RGBColor(34, 33, 32)


def add_docx_signatures(doc, party_a: str, party_b: str):
    s_p = doc.add_paragraph()
    s_p.paragraph_format.space_before = Pt(28)
    s_p.paragraph_format.space_after = Pt(14)
    run_s = s_p.add_run("IN WITNESS WHEREOF, the parties hereto have executed this Agreement by their duly authorized representatives.")
    run_s.font.size = Pt(10)
    run_s.font.italic = True
    run_s.font.color.rgb = RGBColor(110, 104, 98)

    table = doc.add_table(rows=3, cols=2)
    table.autofit = True
    for row in table.rows:
        for cell in row.cells:
            cell.width = Inches(3.2)

    table.cell(0, 0).paragraphs[0].text = f"FOR: {party_a.upper()}"
    table.cell(0, 1).paragraphs[0].text = f"FOR: {party_b.upper()}"

    table.cell(1, 0).paragraphs[0].text = "By: __________________________\nName: Authorized Officer\nTitle: Vice President, Legal"
    table.cell(1, 1).paragraphs[0].text = "By: __________________________\nName: Authorized Signatory\nTitle: Managing Director"

    table.cell(2, 0).paragraphs[0].text = "Date: October 26, 2026"
    table.cell(2, 1).paragraphs[0].text = "Date: October 26, 2026"


def create_pdf_document(output_path: Path, title: str, subtitle: str, clauses: list, signature_text: str):
    doc = fitz.open()

    # Split clauses into pages of 3-4 clauses each
    chunk_size = 4
    clause_chunks = [clauses[i:i + chunk_size] for i in range(0, len(clauses), chunk_size)]

    for page_idx, chunk in enumerate(clause_chunks):
        page = doc.new_page(width=612, height=792)  # US Letter
        y_cursor = 50

        # Header on first page
        if page_idx == 0:
            # Title
            page.insert_text(fitz.Point(50, y_cursor), title, fontsize=16, fontname="helv", color=(0.1, 0.14, 0.19))
            y_cursor += 20
            # Subtitle
            page.insert_text(fitz.Point(50, y_cursor), subtitle, fontsize=10, fontname="helv", color=(0.43, 0.41, 0.38))
            y_cursor += 20
            # Divider line
            page.draw_line(fitz.Point(50, y_cursor), fitz.Point(562, y_cursor), color=(0.85, 0.83, 0.80), width=0.8)
            y_cursor += 25

        for heading, body in chunk:
            # Heading
            page.insert_text(fitz.Point(50, y_cursor), heading, fontsize=11, fontname="helv", color=(0.1, 0.14, 0.19))
            y_cursor += 15

            # Body text in bounded rect
            rect = fitz.Rect(50, y_cursor, 562, y_cursor + 90)
            page.insert_textbox(rect, body, fontsize=9.5, fontname="times-roman", color=(0.13, 0.13, 0.13))
            y_cursor += 100

        # Signature on last page
        if page_idx == len(clause_chunks) - 1:
            sig_rect = fitz.Rect(50, y_cursor + 10, 562, y_cursor + 90)
            page.insert_textbox(sig_rect, signature_text, fontsize=9, fontname="helv", color=(0.35, 0.35, 0.35))

        # Footer page number
        page.insert_text(fitz.Point(500, 760), f"Page {page_idx + 1} of {len(clause_chunks)}", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_path))
    doc.close()
    print(f"Generated PDF: {output_path}")


def generate_all_test_data(base_dir: Path):
    print("Generating comprehensive test dataset across 4 enterprise tenants...")

    # ==========================================
    # TENANT 1: Acme Corp (Enterprise Tech)
    # ==========================================
    acme_dir = base_dir / "01_Acme_Corp_Technology"

    # 1.1 Vendor MSA (DOCX)
    msa_doc = docx.Document()
    add_docx_header(msa_doc, "MASTER SERVICES AGREEMENT", "Commercial Cloud Infrastructure & Support Agreement", "Acme Corporation")
    add_docx_clause(msa_doc, "SECTION 1. DEFINITIONS AND SCOPE OF WORK",
                    "Supplier (CloudCore Systems Inc.) agrees to perform enterprise cloud migration, systems architecture design, and 24x7 infrastructure monitoring services for Customer (Acme Corporation). Detailed technical delivery milestones and acceptance criteria shall be specified in individual Statements of Work executed pursuant to this Agreement.")
    add_docx_clause(msa_doc, "SECTION 2. PAYMENT TERMS AND INVOICING",
                    "Invoices shall be submitted monthly in arrears. Customer shall remit payment within fifteen (15) days of the invoice date. Past-due amounts shall accrue late interest at two percent (2.0%) per month or the maximum rate permitted by law. Customer shall reimburse Supplier for all legal fees incurred in collecting delinquent fees.")
    add_docx_clause(msa_doc, "SECTION 3. CONFIDENTIALITY AND PROPRIETARY SECRETS",
                    "Customer agrees to maintain in strict secrecy all technical specifications, code, and financial terms disclosed by Supplier. Customer shall not disclose such Confidential Information for five (5) years following disclosure. This confidentiality restriction shall not bind or restrict Supplier in any manner.")
    add_docx_clause(msa_doc, "SECTION 4. INTELLECTUAL PROPERTY RIGHTS",
                    "Supplier retains sole and exclusive title to all pre-existing software, core algorithms, and custom scripts developed under this Agreement. Customer is granted a limited, revocable, non-transferable license to use deliverables solely for internal corporate operations.")
    add_docx_clause(msa_doc, "SECTION 5. LIMITATION OF LIABILITY",
                    "IN NO EVENT SHALL SUPPLIER'S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS OF ANY KIND ARISING UNDER OR RELATED TO THIS AGREEMENT EXCEED FIVE THOUSAND DOLLARS ($5,000). CUSTOMER'S LIABILITY UNDER THIS AGREEMENT SHALL BE UNLIMITED AND UNCAPPED. NEITHER PARTY SHALL BE LIABLE FOR PUNITIVE OR CONSEQUENTIAL DAMAGES.")
    add_docx_clause(msa_doc, "SECTION 6. INDEMNIFICATION",
                    "Customer shall defend, indemnify, and hold harmless Supplier and its affiliates from and against any third-party claims, liabilities, damages, or settlements arising out of Customer's use of the deliverables, data transmissions, or alleged infringement of third-party patents.")
    add_docx_clause(msa_doc, "SECTION 7. TERM AND TERMINATION",
                    "This Agreement shall remain in effect for three (3) years. Neither party may terminate this Agreement for convenience. In the event of breach, the non-breaching party may terminate only if the breaching party fails to cure such breach within five (5) business days after receipt of written notice.")
    add_docx_clause(msa_doc, "SECTION 8. GOVERNING LAW AND EXCLUSIVE JURISDICTION",
                    "This Agreement shall be governed by, and construed in accordance with, the laws of the State of Florida. The parties consent to the exclusive jurisdiction and venue of the state courts located in Miami-Dade County, Florida.")
    add_docx_signatures(msa_doc, "Acme Corporation", "CloudCore Systems Inc.")
    msa_path = acme_dir / "Vendor_Master_Services_Agreement_CloudCore.docx"
    msa_path.parent.mkdir(parents=True, exist_ok=True)
    msa_doc.save(str(msa_path))
    print(f"Generated DOCX: {msa_path}")

    # 1.2 Mutual NDA (PDF)
    nda_clauses = [
        ("1. PURPOSE AND DEFINITION",
         "The Disclosing Party and Receiving Party wish to explore an enterprise strategic AI collaboration. 'Confidential Information' refers to any proprietary software, architecture diagrams, product roadmaps, and business negotiations disclosed in tangible or electronic format."),
        ("2. OBLIGATIONS OF MUTUAL NON-DISCLOSURE",
         "Each party agrees to safeguard the Confidential Information of the other using the same standard of care it uses for its own confidential assets, being not less than reasonable care. Information may be shared only with employees having a bona fide need to know."),
        ("3. PERMITTED COMPELLED DISCLOSURES",
         "A Receiving Party may disclose Confidential Information to the extent required by a valid order of a court or regulatory authority, provided it gives prompt written notice to the Disclosing Party to allow an opportunity to seek a protective order."),
        ("4. LIMITATION OF LIABILITY AND DAMAGES",
         "Neither party's aggregate liability under this NDA shall exceed $250,000, except that liability for gross negligence, willful misconduct, or unauthorized public disclosure of trade secrets shall not be limited by this cap."),
        ("5. TERM AND RETURN OF MATERIALS",
         "This Agreement remains in effect for two (2) years. Upon written request, each party shall promptly return or certify the secure destruction of all tangible copies of Confidential Information."),
        ("6. GOVERNING LAW AND DISPUTE RESOLUTION",
         "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any dispute shall be resolved in Wilmington, Delaware.")
    ]
    sig_text = "IN WITNESS WHEREOF, Acme Corporation and Apex Ventures LLC have executed this Mutual NDA.\nSigned by: Sarah Jenkins, VP Legal (Acme) | Michael Vance, Managing Partner (Apex)"
    create_pdf_document(acme_dir / "Mutual_Non_Disclosure_Agreement_Apex.pdf",
                        "MUTUAL NON-DISCLOSURE AGREEMENT",
                        "Acme Corporation & Apex Ventures LLC · Confidential Legal Document",
                        nda_clauses, sig_text)

    # 1.3 Acme Policy Playbook Doc (DOCX)
    playbook_doc = docx.Document()
    add_docx_header(playbook_doc, "ACME CORPORATE CONTRACT POLICY PLAYBOOK", "Standard Procurement Guidelines & Risk Baseline v1.0", "Acme Corporation Legal Dept")
    add_docx_clause(playbook_doc, "POLICY 1. LIMITATION OF LIABILITY REQUIREMENTS",
                    "All commercial agreements must provide a mutual aggregate liability cap not to exceed twelve (12) months of fees paid. Uncapped customer liability or one-sided supplier caps are strictly unacceptable and must be redlined.")
    add_docx_clause(playbook_doc, "POLICY 2. INDEMNITY RECIPROCITY",
                    "Customer must not agree to unilateral indemnification of suppliers. Indemnity must be reciprocal and confined to third-party intellectual property infringement and gross negligence.")
    add_docx_clause(playbook_doc, "POLICY 3. TERMINATION AND CURE RIGHTS",
                    "Contracts must contain a thirty (30) day termination for convenience clause and a minimum thirty (30) day cure period for material breach.")
    add_docx_clause(playbook_doc, "POLICY 4. APPROVED GOVERNING VENUES",
                    "Preferred jurisdictions: State of Delaware or State of New York. Fallback: California. Other jurisdictions require legal approval.")
    playbook_path = acme_dir / "Acme_Corporate_Contract_Policy_Playbook.docx"
    playbook_doc.save(str(playbook_path))
    print(f"Generated Policy DOCX: {playbook_path}")

    # ==========================================
    # TENANT 2: Nexus Logistics (Supply Chain)
    # ==========================================
    nexus_dir = base_dir / "02_Nexus_Logistics_Enterprise"

    nexus_doc = docx.Document()
    add_docx_header(nexus_doc, "FREIGHT AND LOGISTICS SERVICES AGREEMENT", "Commercial Warehousing and Cross-Dock Transportation Agreement", "Nexus Logistics Enterprise")
    add_docx_clause(nexus_doc, "ARTICLE 1. TRANSPORTATION SERVICES AND SLA",
                    "Carrier shall provide scheduled refrigerated cross-dock transport across regional distribution hubs. Carrier guarantees an on-time pickup rate of ninety-eight percent (98%) evaluated on a quarterly basis.")
    add_docx_clause(nexus_doc, "ARTICLE 2. RATES, INVOICING AND SURCHARGES",
                    "Rates are defined in Schedule A. Payment terms shall be Net sixty (60) days upon receipt of audit-cleared bills of lading. No fuel surcharges shall be imposed without prior written consent.")
    add_docx_clause(nexus_doc, "ARTICLE 3. CARGO LOSS AND LIQUIDATED DAMAGES",
                    "Carrier shall be strictly liable for cargo spoilage, theft, or damage up to $1,000,000 per shipment. In the event of delivery delays exceeding 48 hours, Carrier shall pay liquidated damages of $2,500 per day of delay.")
    add_docx_clause(nexus_doc, "ARTICLE 4. CONFIDENTIALITY AND ROUTE DATA",
                    "Each party shall treat customer lists, shipping rates, and optimization telemetry as strictly confidential for a term of three (3) years from disclosure.")
    add_docx_clause(nexus_doc, "ARTICLE 5. INDEMNITY FOR REGULATORY COMPLIANCE",
                    "Carrier shall defend and indemnify Nexus Logistics from any fines, environmental citations, or vehicular liabilities arising from Carrier's fleet operations or driver statutory violations.")
    add_docx_clause(nexus_doc, "ARTICLE 6. TERMINATION AND CURE PERIOD",
                    "Either party may terminate this Agreement for convenience upon sixty (60) days written notice. Material defaults may be cured within thirty (30) days following formal cure notification.")
    add_docx_clause(nexus_doc, "ARTICLE 7. GOVERNING LAW AND JURISDICTION",
                    "This Agreement is governed by the laws of the State of Ohio. Any formal dispute shall be adjudicated in the federal courts located in Columbus, Ohio.")
    add_docx_signatures(nexus_doc, "Nexus Logistics Enterprise", "Apex Freight Carriers LLC")
    nexus_path = nexus_dir / "Freight_and_Warehousing_Services_Agreement.docx"
    nexus_path.parent.mkdir(parents=True, exist_ok=True)
    nexus_doc.save(str(nexus_path))
    print(f"Generated DOCX: {nexus_path}")

    # Nexus Policy Standards PDF
    nexus_policy_clauses = [
        ("SECTION 1. FLEET SAFETY AND INSURANCE MANDATES",
         "All freight carriers must carry a minimum of $5,000,000 primary commercial automotive liability and $1,000,000 cargo indemnity insurance. Certificates of insurance must name Nexus Logistics as an additional insured."),
        ("SECTION 2. LIQUIDATED DAMAGES FOR TRANSIT FAILURE",
         "Carrier contracts must include enforceable liquidated delay credits of at least $1,000 per day for perishable cold-chain logistics."),
        ("SECTION 3. CARRIER INDEMNIFICATION REQUIREMENTS",
         "Carriers must hold Nexus harmless against all Department of Transportation (DOT) citations, driver labor claims, and hazardous cargo contamination.")
    ]
    create_pdf_document(nexus_dir / "Nexus_Logistics_Vendor_Compliance_Policy.pdf",
                        "NEXUS LOGISTICS VENDOR COMPLIANCE STANDARDS",
                        "Mandatory Transportation & Carrier Policy Baseline v2.1",
                        nexus_policy_clauses,
                        "Approved: Marcus Vance, Chief Logistics Counsel · Nexus Logistics")

    # ==========================================
    # TENANT 3: FinTech Global Systems (Banking Tech)
    # ==========================================
    fintech_dir = base_dir / "03_FinTech_Global_Systems"

    fintech_doc = docx.Document()
    add_docx_header(fintech_doc, "ENTERPRISE SAAS SUBSCRIPTION AGREEMENT", "Core Banking Cloud Platform Terms of Service", "FinTech Global Systems")
    add_docx_clause(fintech_doc, "SECTION 1. HOSTED SERVICES AND API ACCESS",
                    "Provider grants FinTech Global Systems non-exclusive access to its automated payment clearance gateway and ledger API. Provider guarantees 99.99% monthly system availability excluding scheduled maintenance.")
    add_docx_clause(fintech_doc, "SECTION 2. FEES, AUDITS AND BILLING",
                    "Customer shall pay annual platform subscription fees within thirty (30) days of receipt of invoice. Provider reserves the right to audit Customer's transaction volumes annually upon five (5) days advance notice.")
    add_docx_clause(fintech_doc, "SECTION 3. DATA PRIVACY AND FINANCIAL RECORDS",
                    "Provider acknowledges that transaction records constitute non-public personal financial information. Provider shall implement SOC 2 Type II controls and ISO 27001 data protection standards.")
    add_docx_clause(fintech_doc, "SECTION 4. LIMITATION OF LIABILITY",
                    "PROVIDER'S MAXIMUM LIABILITY ARISING FROM SECURITY BREACHES OR OUTAGES SHALL BE CAPPED AT $100,000. CUSTOMER SHALL INDEMNIFY PROVIDER FOR ALL REGULATORY PENALTIES IMPOSED BY BANKING COMMISSIONS.")
    add_docx_clause(fintech_doc, "SECTION 5. TERM, TERMINATION AND TRANSITION",
                    "Initial term is five (5) years with automatic renewal. Neither party may terminate for convenience. In the event of system non-performance, Customer may terminate only after a sixty (60) day cure window.")
    add_docx_clause(fintech_doc, "SECTION 6. GOVERNING LAW AND ARBITRATION",
                    "This Agreement shall be construed under the laws of the State of New York. Disputes exceeding $250,000 shall be submitted to confidential binding arbitration in New York City.")
    add_docx_signatures(fintech_doc, "FinTech Global Systems", "PayLedger Cloud Solutions Corp")
    fintech_path = fintech_dir / "Enterprise_SaaS_Subscription_Agreement.docx"
    fintech_path.parent.mkdir(parents=True, exist_ok=True)
    fintech_doc.save(str(fintech_path))
    print(f"Generated DOCX: {fintech_path}")

    # FinTech DPA PDF
    dpa_clauses = [
        ("ARTICLE 1. SCOPE AND NATURE OF PROCESSING",
         "This Data Processing Addendum ('DPA') supplements the Master Agreement. Processor shall process Customer Personal Data strictly to provide automated transaction clearance, fraud monitoring, and settlement ledger operations."),
        ("ARTICLE 2. SECURITY SAFEGUARDS AND AUDITS",
         "Processor shall maintain technical safeguards including AES-256 encryption in transit and at rest, zero-trust network segmentation, and annual third-party penetration audits."),
        ("ARTICLE 3. SECURITY INCIDENT NOTIFICATION",
         "In the event of a confirmed Personal Data Breach, Processor shall notify Customer without undue delay and in no event later than forty-eight (48) hours after becoming aware of the breach."),
        ("ARTICLE 4. DATA TRANSFERS AND SUB-PROCESSORS",
         "Processor shall not transfer financial data outside the European Economic Area or United States without prior written consent and implementation of Standard Contractual Clauses (SCCs).")
    ]
    create_pdf_document(fintech_dir / "Data_Processing_Addendum_GDPR.pdf",
                        "DATA PROCESSING ADDENDUM (GDPR & SOC 2)",
                        "FinTech Global Systems & PayLedger Cloud Corp · Schedule DPA",
                        dpa_clauses,
                        "Executed by Data Protection Officer: Elena Rostova · FinTech Global Systems")

    # ==========================================
    # TENANT 4: BioHealth Research Partners (Life Sciences)
    # ==========================================
    bio_dir = base_dir / "04_BioHealth_Research_Partners"

    bio_doc = docx.Document()
    add_docx_header(bio_doc, "CLINICAL RESEARCH AND IP ASSIGNMENT AGREEMENT", "Oncology Phase II Clinical Trial Collaboration", "BioHealth Research Partners")
    add_docx_clause(bio_doc, "SECTION 1. CLINICAL PROTOCOL AND SERVICES",
                    "Institution shall conduct the Phase II oncology trial in strict compliance with the Institutional Review Board (IRB) approved protocol, Good Clinical Practice (GCP), and applicable FDA regulations.")
    add_docx_clause(bio_doc, "SECTION 2. RESEARCH FUNDING AND DISBURSEMENTS",
                    "Sponsor (BioHealth Research Partners) shall disburse research grants in quarterly installments within forty-five (45) days of verified patient milestone enrollment verified by the clinical monitor.")
    add_docx_clause(bio_doc, "SECTION 3. INTELLECTUAL PROPERTY AND PATENT RIGHTS",
                    "All inventions, chemical compounds, biological data, and patent claims conceived or developed during the research shall become the sole property of Sponsor. Institution assigns all global rights to Sponsor.")
    add_docx_clause(bio_doc, "SECTION 4. CONFIDENTIALITY AND PUBLICATION REVIEW",
                    "Institution may publish research results only after providing Sponsor sixty (60) days advance review. Sponsor may delay publication for up to ninety (90) days to file patent applications.")
    add_docx_clause(bio_doc, "SECTION 5. MUTUAL INDEMNIFICATION",
                    "Sponsor shall indemnify Institution for subject injury claims directly resulting from investigational drug administration. Institution shall indemnify Sponsor for gross medical negligence.")
    add_docx_clause(bio_doc, "SECTION 6. TERM, SUSPENSION AND TERMINATION",
                    "Sponsor may terminate or suspend the trial immediately for patient safety reasons. Either party may terminate upon thirty (30) days notice for uncured material breach.")
    add_docx_clause(bio_doc, "SECTION 7. GOVERNING LAW AND VENUE",
                    "This Agreement shall be governed by the laws of the State of Delaware. Any dispute shall be resolved in the federal courts located in Wilmington, Delaware.")
    add_docx_signatures(bio_doc, "BioHealth Research Partners", "Apex University Medical Center")
    bio_path = bio_dir / "Clinical_Trial_and_IP_Assignment_Contract.docx"
    bio_path.parent.mkdir(parents=True, exist_ok=True)
    bio_doc.save(str(bio_path))
    print(f"Generated DOCX: {bio_path}")

    # BioHealth Consulting PDF
    consult_clauses = [
        ("SECTION 1. ADVISORY SCOPE",
         "Consultant shall provide scientific advisory services regarding targeted immunotherapy drug candidates, regulatory submissions, and scientific advisory board representation."),
        ("SECTION 2. COMPENSATION AND EXPENSES",
         "BioHealth shall pay Consultant an hourly rate of $650 per hour. Invoices submitted monthly shall be paid Net thirty (30) days from receipt."),
        ("SECTION 3. CONFLICT OF INTEREST AND NON-COMPETITION",
         "Consultant agrees not to render advisory services to direct competitors developing competitive PD-L1 oncology therapeutics during the term of this Agreement."),
        ("SECTION 4. TERMINATION FOR CONVENIENCE",
         "Either party may terminate this Agreement without cause upon fourteen (14) days prior written notice. Accrued undisputed fees shall be paid upon termination."),
        ("SECTION 5. GOVERNING LAW",
         "This Agreement shall be governed by the laws of the Commonwealth of Massachusetts without reference to its choice of law rules.")
    ]
    create_pdf_document(bio_dir / "Consulting_and_Advisory_Services_Agreement.pdf",
                        "STRATEGIC SCIENTIFIC CONSULTING AGREEMENT",
                        "BioHealth Research Partners & Dr. Julian Thorne · Advisory Terms",
                        consult_clauses,
                        "Executed by: Dr. Arthur Pendelton, Chief Scientific Officer · BioHealth Research")

    # Generate README in test-data/
    readme_path = base_dir / "README.md"
    readme_content = """# AutoAudit — Comprehensive Manual Test Dataset

This directory contains real-world styled legal contracts, compliance documents, and policy playbooks designed for **manual product testing** directly through the AutoAudit web user interface.

## Overview of Test Files by Enterprise Tenant

### 📁 `01_Acme_Corp_Technology/` (Enterprise Software & Cloud)
1. **`Vendor_Master_Services_Agreement_CloudCore.docx`**
   - **Type**: 4-page Master Services Agreement (Word `.docx`).
   - **Intentional Deviations**: Uncapped customer liability with $5,000 supplier cap, unilateral indemnity, 15-day payment, Florida jurisdiction, 5-day cure period.
   - **Expected Audit Outcome**: **CRITICAL Risk** (Score 85–95). Generates tracked Word redlines for liability cap, reciprocal indemnity, and Delaware choice of law.
2. **`Mutual_Non_Disclosure_Agreement_Apex.pdf`**
   - **Type**: 2-page Mutual NDA (Digital `.pdf`).
   - **Intentional Deviations**: Standard mutual terms with $250,000 cap and trade secret carve-out.
   - **Expected Audit Outcome**: **Low/Medium Risk** (Score 20–35).
3. **`Acme_Corporate_Contract_Policy_Playbook.docx`**
   - **Type**: Internal corporate legal playbook document.

---

### 📁 `02_Nexus_Logistics_Enterprise/` (Supply Chain & Transportation)
1. **`Freight_and_Warehousing_Services_Agreement.docx`**
   - **Type**: 3-page Supply Chain & Transportation Contract.
   - **Intentional Deviations**: Strict $2,500/day liquidated delay damages, Net 60 payment, Ohio jurisdiction.
   - **Expected Audit Outcome**: **HIGH Risk** on liquidated damages & strict performance SLA.
2. **`Nexus_Logistics_Vendor_Compliance_Policy.pdf`**
   - **Type**: Transportation standards policy document with mandatory cargo insurance requirements.

---

### 📁 `03_FinTech_Global_Systems/` (Banking & Financial Services)
1. **`Enterprise_SaaS_Subscription_Agreement.docx`**
   - **Type**: 4-page Core Banking Cloud Platform Agreement.
   - **Intentional Deviations**: Supplier liability capped at $100k, Customer indemnifies for banking regulatory fines, 5-year lock-in with no termination for convenience.
   - **Expected Audit Outcome**: **CRITICAL Risk**. Flagged for one-sided regulatory indemnification and lack of convenience exit.
2. **`Data_Processing_Addendum_GDPR.pdf`**
   - **Type**: 3-page Data Processing Addendum (GDPR / SOC 2).
   - **Features**: 48-hour breach notification, standard contractual clauses.

---

### 📁 `04_BioHealth_Research_Partners/` (Life Sciences & Healthcare)
1. **`Clinical_Trial_and_IP_Assignment_Contract.docx`**
   - **Type**: 3-page Clinical Research Agreement.
   - **Features**: Complete sponsor IP assignment, patient injury indemnity, 60-day publication review.
2. **`Consulting_and_Advisory_Services_Agreement.pdf`**
   - **Type**: 2-page Strategic Advisory Contract.
   - **Features**: $650/hour rate, Net 30 payment, Massachusetts choice of law, 14-day convenience termination.

---

## How to Test Manually in the Product

1. **Open the Web UI**: [http://localhost:5173](http://localhost:5173).
2. Click **"+ Upload Contract"** in the top navigation bar.
3. Select any `.docx` or `.pdf` file from one of the folders above.
4. Watch the pipeline extract clauses, match against the active legal playbook, calculate risk scores, and generate native tracked changes.
5. In the **Contract Review Workspace**:
   - Inspect individual clauses and extracted attributes (caps, cure days, jurisdictions).
   - Review the side-by-side proposed redlines with strike-throughs and insertions.
   - Click **"Approve Language"** or **"Keep Original"** to record your review decision.
   - Click **"Export Word Redline (.docx)"** to verify that the generated document opens cleanly with tracked changes in Microsoft Word.
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print(f"Generated README: {readme_path}")
    print("Test data generation complete!")


if __name__ == "__main__":
    test_data_dir = Path("test-data")
    generate_all_test_data(test_data_dir)
