# AutoAudit — Comprehensive Manual Test Dataset

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
