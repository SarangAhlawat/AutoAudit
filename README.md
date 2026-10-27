# AutoAudit ⚖️🔍

> **Intelligent Contract-Review Assistance System for Legal, Compliance, and Procurement Teams**  
> *Decision-support platform for clause extraction, policy playbook comparison, explainable risk scoring, and native Word (`.docx`) tracked-changes redlining.*

---

## 1. Overview & Core Workflow

AutoAudit accepts contracts in **PDF** and **DOCX** formats and executes an end-to-end audit workflow:
1. **Document Ingestion**: Extracts text, tables, and page-level provenance with SHA-256 tamper-proof checksums.
2. **Clause Segmentation & Classification**: Segments text into structured clauses and classifies them across 12 high-value legal categories (`LIMITATION_OF_LIABILITY`, `INDEMNIFICATION`, `CONFIDENTIALITY`, `TERMINATION`, `GOVERNING_LAW`, `PAYMENT_TERMS`, `LIQUIDATED_DAMAGES`, `CURE_PERIOD`, `INTELLECTUAL_PROPERTY`, `DATA_SECURITY`, `WARRANTIES`, `FORCE_MAJEURE`).
3. **Structured Attribute Extraction**: Extracts numeric caps, cure day counts, and governing jurisdictions.
4. **Policy Playbook RAG & Comparison**: Compares contract terms against corporate playbooks (preferred, fallback, and unacceptable terms) and pinpoints policy section citations.
5. **Explainable Risk Engine**: Calculates clause-level and aggregate contract risk scores (0–100) with transparent rationales.
6. **Tracked-Changes DOCX Redlining**: Generates native Microsoft Word (`.docx`) review copies containing tracked deletions (`<w:del>`) and tracked insertions (`<w:ins>`) with playbook justifications.
7. **Human-in-the-Loop Review**: Automatically routes high-risk or uncertain contracts to legal reviewers who can Accept, Reject, or Modify proposed redlines with complete audit logging.

---

## 2. Repository Structure

```text
autoaudit/
├── AutoAudit_Project_Build_Plan.md # Master project build plan
├── AGENTS.md                       # Coding agent guidelines & architectural boundaries
├── README.md                       # System overview & setup instructions
├── pyproject.toml                  # Python dependencies & pytest configuration
├── .env.example                    # Environment configuration template
├── docker-compose.yml              # Local multi-container development configuration
├── docs/                           # Architecture, security, API & phase specifications
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DATA_AND_EVALUATION.md
│   ├── SECURITY.md
│   ├── DECISIONS.md
│   └── implementation/             # Implementation phase guides (Phases 1 - 7)
├── backend/                        # FastAPI backend application
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── api/                    # Health, Contracts, Findings, Jobs, Playbooks
│   │   ├── core/                   # Configuration & settings
│   │   ├── db/                     # Async SQLAlchemy database & session
│   │   ├── models/                 # Relational schemas (Contract, Clause, Finding, etc.)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Ingestion, Segmentation, Policy, Risk, Redline, Report
│   │   └── workflows/              # Pipeline orchestrator
│   └── tests/                      # Pytest test suite (6 passing tests)
├── frontend/                       # React 18 + TypeScript + Vite frontend
│   ├── package.json
│   ├── src/
│   │   ├── components/             # Navbar, Dashboard, ContractReview, PlaybookView, UploadModal
│   │   ├── services/api.ts         # Frontend API client
│   │   ├── index.css               # Obsidian dark aesthetic design system
│   │   └── App.tsx                 # Root application workflow
├── storage/                        # Uploads, processed documents, and redlines
└── scripts/                        # Sample data generators
```

---

## 3. Quick Start & Setup

### Prerequisites
- Python 3.11+ (Python 3.12 recommended)
- Node.js 18+ and npm
- `uv` (recommended for rapid package management) or standard `pip`

### Step 1: Clone and Set Up Backend
```bash
# Create virtual environment
uv venv .venv --python /usr/bin/python3.12
source .venv/bin/activate

# Install backend dependencies
uv pip install -r backend/requirements.txt

# Generate synthetic sample contracts
python scripts/generate_samples.py
```

### Step 2: Run Backend Server
```bash
# Starts FastAPI server on http://localhost:8000
.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Step 3: Run Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Running Tests

Run the complete backend automated test suite:
```bash
.venv/bin/pytest backend/tests/ -v
```
All 6 test suites cover:
- `test_health_check`: API & DB connectivity
- `test_docx_extraction_and_segmentation`: DOCX parsing, table text, clause identification
- `test_pdf_extraction_and_segmentation`: PDF PyMuPDF extraction and page provenance
- `test_risk_evaluation_for_uncapped_liability`: Risk scoring & playbook policy matching
- `test_docx_tracked_change_generation`: OpenXML `<w:del>` and `<w:ins>` validation
- `test_full_contract_api_workflow`: End-to-end upload, pipeline execution, decision recording, and redline export

---

## 5. API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Health check (DB connection & worker status) |
| `/api/v1/contracts/upload` | `POST` | Upload DOCX/PDF contract and start audit pipeline |
| `/api/v1/contracts` | `GET` | List contracts with filters and risk metrics |
| `/api/v1/contracts/{id}` | `GET` | Fetch contract detail, clauses, and findings |
| `/api/v1/contracts/{id}/report` | `GET` | Generate Executive Report (JSON or HTML) |
| `/api/v1/contracts/{id}/redline` | `GET` | Download generated Word DOCX with tracked revisions |
| `/api/v1/findings/{id}/decision` | `POST` | Record reviewer decision (`ACCEPTED`, `REJECTED`, `MODIFIED`) |
| `/api/v1/playbooks` | `GET` | List corporate policy playbooks and rules |
| `/api/v1/jobs/{id}` | `GET` | Check background job progress status |

---

## 6. Disclaimer

> **NOTICE**: AutoAudit is an automated decision-support and workflow assistance tool. Risk scores are estimations based on configured policy heuristics and model inference. AutoAudit **does not provide legal advice** and is not a substitute for review by qualified legal counsel.
