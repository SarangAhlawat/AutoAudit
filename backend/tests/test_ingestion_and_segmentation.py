from pathlib import Path
import pytest
from backend.app.services.ingestion.extractor import DocumentExtractor
from backend.app.services.extraction.segmenter import ClauseSegmenter


def test_docx_extraction_and_segmentation():
    msa_path = Path("storage/samples/sample_vendor_msa.docx")
    assert msa_path.exists(), "Sample MSA docx must exist"

    checksum = DocumentExtractor.calculate_checksum(msa_path)
    assert len(checksum) == 64

    full_text, paragraphs_data, page_count = DocumentExtractor.extract_from_docx(msa_path)
    assert "MASTER SERVICES AGREEMENT" in full_text
    assert len(paragraphs_data) > 0

    clauses = ClauseSegmenter.segment_document(full_text)
    assert len(clauses) >= 7

    categories = [c["category"] for c in clauses]
    assert "LIMITATION_OF_LIABILITY" in categories
    assert "INDEMNIFICATION" in categories
    assert "CONFIDENTIALITY" in categories
    assert "GOVERNING_LAW" in categories
    assert "PAYMENT_TERMS" in categories

    # Check attribute extraction
    liability_clauses = [c for c in clauses if c["category"] == "LIMITATION_OF_LIABILITY"]
    assert len(liability_clauses) > 0
    l_clause = liability_clauses[0]
    attrs = {a["attribute_name"]: a for a in l_clause["attributes"]}
    assert "liability_cap" in attrs


def test_pdf_extraction_and_segmentation():
    nda_path = Path("storage/samples/sample_mutual_nda.pdf")
    assert nda_path.exists(), "Sample NDA pdf must exist"

    checksum = DocumentExtractor.calculate_checksum(nda_path)
    assert len(checksum) == 64

    full_text, pages_data, page_count = DocumentExtractor.extract_from_pdf(nda_path)
    assert page_count >= 1
    assert "MUTUAL NON-DISCLOSURE AGREEMENT" in full_text

    clauses = ClauseSegmenter.segment_document(full_text, pages_data)
    assert len(clauses) >= 4

    categories = [c["category"] for c in clauses]
    assert "CONFIDENTIALITY" in categories
    assert "GOVERNING_LAW" in categories
