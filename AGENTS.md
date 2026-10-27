# AGENTS.md --- Coding Agent Rules and Repository Guidelines

## 1. Core Principles
1. **Source of Truth**: Always treat `AutoAudit_Project_Build_Plan.md` and documents under `docs/` as the project specification and ground truth.
2. **Phase by Phase**: Work deliberately through the implementation phases. Do not attempt to implement unvalidated multi-model pipelines until the basic vertical slice is robustly tested.
3. **No Hollow Placeholders**: Never build mock interfaces or stubs that pretend to perform operations while quietly dropping data or failing silently. Every component must have functional logic or explicit graceful degradation.
4. **Verifiable Progress**: Validate all changes with unit tests, integration tests, or demonstrable browser checks. Never claim a feature works without evidence.
5. **Preserve Documentation Integrity**: Maintain comments, docstrings, and update documentation when APIs or behavior change.
6. **Data & Security Boundaries**:
   - Never commit sensitive customer contracts, real company policies, secrets, or API keys into version control.
   - Use public, synthetic, or explicitly authorized sample contracts for testing and demos.
   - Always run file validations (MIME check, size cap, extension check, content sniffing).

## 2. Architecture Boundaries
- **Backend (`backend/app/`)**:
  - `api/`: FastAPI route handlers grouped by resource (`contracts`, `findings`, `playbooks`, `jobs`, `reports`).
  - `core/`: Application settings, logging, exceptions, database session management.
  - `models/`: SQLAlchemy database models.
  - `schemas/`: Pydantic request and response models.
  - `services/`: Isolated business logic:
    - `ingestion/`: Text & layout extraction from PDF and DOCX.
    - `extraction/`: Clause segmentation & category classification.
    - `policy/`: Policy chunking, indexing, and comparison.
    - `risk/`: Rule-based risk engine & scoring.
    - `redlining/`: Revision proposal drafting & DOCX OpenXML tracked change generation.
    - `reporting/`: Audit report compilation (JSON / Markdown / HTML / PDF).
  - `workers/`: Background task execution (supports in-process async worker or Celery).
- **Frontend (`frontend/`)**:
  - React + TypeScript + Vite.
  - Custom CSS design system adhering to high aesthetic standards (glassmorphism, dark palette, modern typography, micro-animations).
  - Clean state management, real-time polling or WebSocket updates for job status, and interactive contract review screen with diff viewer and human review controls.

## 3. Testing Requirements
- Unit tests in `backend/tests/` for:
  - Document ingestion (PDF & DOCX parsing).
  - Clause segmentation and classification accuracy.
  - Policy matching and citation retrieval.
  - Risk engine calculations.
  - Redline revision proposal generation and OpenXML validation.
- API tests using `httpx.AsyncClient` or FastAPI `TestClient`.

## 4. Phase Sign-off Checklist
At the completion of each phase, ensure:
1. List of files modified or created.
2. Terminal commands executed.
3. Test suite execution results.
4. Documented limitations or edge cases.
5. Clear statement of the next task.
