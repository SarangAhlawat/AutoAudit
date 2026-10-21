import re
from typing import List, Dict, Any, Optional, Tuple


class ClauseSegmenter:
    # Patterns for detecting clause headings and boundaries
    HEADING_REGEXES = [
        # e.g., "1. Limitation of Liability", "1.1 Indemnification", "SECTION 4. TERMINATION"
        re.compile(r"^(?:(?:SECTION|ARTICLE|CLAUSE)\s+)?(\d+(?:\.\d+)*)\.?\s*[:\-\—]?\s*(.+)$", re.IGNORECASE),
        # e.g., "ARTICLE IV - GOVERNING LAW"
        re.compile(r"^(?:ARTICLE|SECTION)\s+([IVXLCDM]+)\.?\s*[:\-\—]?\s*(.+)$", re.IGNORECASE),
        # e.g., "LIMITATION OF LIABILITY" (all caps short line)
        re.compile(r"^([A-Z\s]{4,60})$"),
    ]

    # Keyword and regex definitions for 12 key clause categories
    CATEGORY_PATTERNS = {
        "LIMITATION_OF_LIABILITY": [
            r"limitation of liability",
            r"liability cap",
            r"aggregate liability",
            r"indirect, incidental, consequential",
            r"in no event shall .* be liable",
            r"maximum liability",
            r"consequential damages",
        ],
        "INDEMNIFICATION": [
            r"indemnif(?:y|ication|ied|ying)",
            r"hold harmless",
            r"defend, indemnify",
            r"third[\s\-]party claims",
        ],
        "CONFIDENTIALITY": [
            r"confidential(?:ity)?",
            r"non[\s\-]disclosure",
            r"proprietary information",
            r"trade secrets",
            r"receiving party shall protect",
        ],
        "TERMINATION": [
            r"term and termination",
            r"termination for convenience",
            r"termination for cause",
            r"right to terminate",
            r"upon termination",
        ],
        "GOVERNING_LAW": [
            r"governing law",
            r"jurisdiction",
            r"laws of the state of",
            r"exclusive venue",
            r"choice of law",
            r"dispute resolution",
        ],
        "PAYMENT_TERMS": [
            r"payment terms",
            r"invoic(?:e|ing)",
            r"net \d+ days",
            r"late payment",
            r"fees and expenses",
            r"taxes and payment",
        ],
        "LIQUIDATED_DAMAGES": [
            r"liquidated damages",
            r"penalty fee",
            r"delay damages",
            r"service credits",
        ],
        "CURE_PERIOD": [
            r"cure period",
            r"notice of breach and \d+ days to cure",
            r"fail(?:s|ure) to cure",
            r"remedy such breach within",
        ],
        "INTELLECTUAL_PROPERTY": [
            r"intellectual property",
            r"work made for hire",
            r"ip rights",
            r"ownership of deliverables",
            r"patent, copyright, trademark",
        ],
        "DATA_SECURITY": [
            r"data (?:protection|security|privacy)",
            r"personal data",
            r"gdpr",
            r"security breach",
            r"confidentiality of data",
        ],
        "WARRANTIES": [
            r"warrant(?:y|ies)",
            r"as is, without warranty",
            r"implied warranties of merchantability",
            r"fitness for a particular purpose",
        ],
        "FORCE_MAJEURE": [
            r"force majeure",
            r"acts of god",
            r"unforeseeable events beyond reasonable control",
        ],
    }

    @classmethod
    def segment_document(cls, full_text: str, pages_data: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        Segments full document text into structured clauses using heading recognition.
        Works across both single-spaced and double-spaced contracts.
        """
        raw_lines = [l.strip() for l in full_text.splitlines() if l.strip()]
        clauses: List[Dict[str, Any]] = []

        current_number = "1.0"
        current_heading = "Preamble & Background"
        current_lines: List[str] = []
        clause_counter = 1

        for line in raw_lines:
            matched_heading = None
            matched_num = None

            # Skip checking heading regexes if the line is very long (it's body text)
            if len(line) <= 80:
                for regex in cls.HEADING_REGEXES:
                    match = regex.match(line)
                    if match:
                        groups = match.groups()
                        if len(groups) == 2:
                            matched_num = groups[0].strip()
                            matched_heading = groups[1].strip()
                        elif len(groups) == 1 and line.isupper() and len(line) >= 4:
                            matched_num = f"{clause_counter}.0"
                            matched_heading = groups[0].strip().title()
                        break

            if matched_heading:
                # Flush previous clause if it has text
                if current_lines:
                    clause_text = "\n".join(current_lines).strip()
                    if clause_text:
                        category, confidence = cls.classify_clause(current_heading, clause_text)
                        page_num = cls._estimate_page(current_lines[0], pages_data)
                        clauses.append({
                            "clause_number": current_number,
                            "heading": current_heading,
                            "text": clause_text,
                            "category": category,
                            "confidence": confidence,
                            "page_start": page_num,
                            "page_end": page_num,
                            "attributes": cls.extract_attributes(category, clause_text),
                        })

                clause_counter += 1
                current_number = matched_num or f"{clause_counter}.0"
                current_heading = matched_heading
                current_lines = []
            else:
                current_lines.append(line)

        # Flush the final clause
        if current_lines:
            clause_text = "\n".join(current_lines).strip()
            if clause_text:
                category, confidence = cls.classify_clause(current_heading, clause_text)
                page_num = cls._estimate_page(current_lines[0], pages_data)
                clauses.append({
                    "clause_number": current_number,
                    "heading": current_heading,
                    "text": clause_text,
                    "category": category,
                    "confidence": confidence,
                    "page_start": page_num,
                    "page_end": page_num,
                    "attributes": cls.extract_attributes(category, clause_text),
                })

        return clauses

    @classmethod
    def classify_clause(cls, heading: str, text: str) -> Tuple[str, float]:
        """
        Classifies clause text and heading into one of the 12 categories.
        Returns (category, confidence).
        """
        combined = f"{heading}\n{text}".lower()

        scores: Dict[str, float] = {}
        for category, patterns in cls.CATEGORY_PATTERNS.items():
            cat_score = 0.0
            for pattern in patterns:
                # Matches in heading have higher weight
                if re.search(pattern, heading.lower()):
                    cat_score += 2.5
                matches = re.findall(pattern, combined)
                cat_score += len(matches) * 1.0
            scores[category] = cat_score

        best_category = max(scores, key=scores.get)
        best_score = scores[best_category]

        if best_score >= 2.0:
            confidence = min(0.99, 0.70 + (best_score * 0.05))
            return best_category, round(confidence, 2)

        return "GENERAL", 0.50

    @classmethod
    def extract_attributes(cls, category: str, text: str) -> List[Dict[str, Any]]:
        """
        Extracts structured attributes such as caps, cure periods, jurisdictions.
        """
        attrs: List[Dict[str, Any]] = []

        if category == "LIMITATION_OF_LIABILITY":
            # Look for monetary cap
            cap_match = re.search(r"(\$[\d,]+(?:\.\d{2})?|\b(?:one|two|three|five|ten)\s+million\s+dollars)\b", text, re.IGNORECASE)
            if cap_match:
                cap_str = cap_match.group(1)
                num_val = cls._parse_dollar_amount(cap_str)
                attrs.append({
                    "attribute_name": "liability_cap",
                    "value_text": cap_str,
                    "value_numeric": num_val,
                    "confidence": 0.95,
                    "evidence_text": cap_match.group(0),
                })
            elif re.search(r"\bfees\s+paid\s+(?:or\s+payable\s+)?(?:in\s+the\s+)?(?:preceding\s+)?(\d+)\s+months\b", text, re.IGNORECASE):
                match = re.search(r"\bfees\s+paid\s+(?:or\s+payable\s+)?(?:in\s+the\s+)?(?:preceding\s+)?(\d+)\s+months\b", text, re.IGNORECASE)
                attrs.append({
                    "attribute_name": "liability_cap",
                    "value_text": f"{match.group(1)} months fees",
                    "value_numeric": float(match.group(1)),
                    "confidence": 0.90,
                    "evidence_text": match.group(0),
                })
            elif re.search(r"unlimited|no\s+cap|shall\s+not\s+apply\s+to|without\s+limitation", text, re.IGNORECASE):
                attrs.append({
                    "attribute_name": "liability_cap",
                    "value_text": "UNCAPPED",
                    "value_numeric": None,
                    "confidence": 0.85,
                    "evidence_text": "No liability cap specified / Uncapped carve-out",
                })

        elif category == "GOVERNING_LAW":
            # Look for jurisdiction
            state_match = re.search(r"(?:laws of|State of|Commonwealth of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", text)
            if state_match:
                jurisdiction = state_match.group(1).strip()
                attrs.append({
                    "attribute_name": "governing_jurisdiction",
                    "value_text": jurisdiction,
                    "value_numeric": None,
                    "confidence": 0.95,
                    "evidence_text": state_match.group(0),
                })

        elif category == "CURE_PERIOD" or category == "TERMINATION":
            # Look for cure days
            days_match = re.search(r"(\d+)\s+(?:calendar\s+|business\s+)?days\b(?:\s+to\s+cure|\s+written\s+notice|\s+cure\s+period)?", text, re.IGNORECASE)
            if days_match:
                days = int(days_match.group(1))
                attrs.append({
                    "attribute_name": "cure_period_days",
                    "value_text": f"{days} days",
                    "value_numeric": float(days),
                    "confidence": 0.90,
                    "evidence_text": days_match.group(0),
                })

        elif category == "INDEMNIFICATION":
            is_mutual = bool(re.search(r"\b(each party|mutually|both parties)\b", text, re.IGNORECASE))
            attrs.append({
                "attribute_name": "indemnity_structure",
                "value_text": "MUTUAL" if is_mutual else "UNILATERAL",
                "value_numeric": None,
                "confidence": 0.85,
                "evidence_text": "Mutual indemnity" if is_mutual else "Unilateral indemnity detected",
            })

        return attrs

    @staticmethod
    def _parse_dollar_amount(val: str) -> Optional[float]:
        val_clean = val.replace("$", "").replace(",", "").strip().lower()
        try:
            return float(val_clean)
        except ValueError:
            if "million" in val_clean:
                return 1000000.0
            return None

    @staticmethod
    def _estimate_page(sample_text: str, pages_data: Optional[List[Dict[str, Any]]]) -> int:
        if not pages_data:
            return 1
        sample_snippet = sample_text[:60]
        for p in pages_data:
            if sample_snippet in p.get("text", ""):
                return p.get("page_number", 1)
        return 1
