from datetime import datetime, timezone
from typing import Dict, Any, List


class ReportGenerator:
    LEGAL_DISCLAIMER = (
        "AutoAudit provides automated decision-support analysis and risk estimation based on configurable "
        "policy playbooks. This report does not constitute legal advice and is not a substitute for review "
        "by qualified legal counsel."
    )

    @classmethod
    def generate_html_report(cls, report_data: Dict[str, Any]) -> str:
        findings_html = ""
        for raw_f in report_data.get("findings", []):
            f = raw_f.model_dump() if hasattr(raw_f, "model_dump") else raw_f
            sev = f.get("severity", "MEDIUM")
            sev_color = {
                "CRITICAL": "#ef4444",
                "HIGH": "#f97316",
                "MEDIUM": "#eab308",
                "LOW": "#22c55e",
            }.get(sev, "#64748b")

            proposal_html = ""
            if f.get("proposal"):
                prop = f["proposal"]
                proposal_html = f"""
                <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #6366f1;">
                    <div style="font-weight: 600; font-size: 13px; color: #4338ca; margin-bottom: 4px;">Proposed Revision:</div>
                    <div style="font-size: 13px; line-height: 1.5; color: #1e293b;">{prop.get('proposed_text')}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px; font-style: italic;">Rationale: {prop.get('rationale')}</div>
                </div>
                """

            findings_html += f"""
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="background: {sev_color}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        {sev} RISK ({f.get('risk_score', 0)}/100)
                    </span>
                    <span style="font-size: 13px; color: #64748b; font-weight: 500;">{f.get('policy_reference')}</span>
                </div>
                <div style="font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px;">
                    {f.get('finding_type', '').replace('_', ' ').title()}
                </div>
                <div style="font-size: 14px; color: #334155; margin-bottom: 8px; line-height: 1.5;">
                    {f.get('explanation')}
                </div>
                <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 13px; color: #475569; font-family: monospace;">
                    <strong>Evidence:</strong> "{f.get('evidence')}"
                </div>
                {proposal_html}
            </div>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AutoAudit Report - {report_data.get('title')}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px; }}
        .container {{ max-width: 900px; margin: 0 auto; }}
        .header {{ background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px; }}
        .disclaimer {{ margin-top: 32px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e40af; line-height: 1.5; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0 0 8px 0; font-size: 24px;">AutoAudit Executive Report</h1>
            <div style="font-size: 16px; color: #64748b; margin-bottom: 16px;">
                Contract: <strong>{report_data.get('title')}</strong> | Counterparty: {report_data.get('counterparty', 'N/A')}
            </div>
            <div style="display: flex; gap: 16px; align-items: center;">
                <span class="badge" style="background: #fee2e2; color: #991b1b;">Overall Risk: {report_data.get('overall_risk_score')}/100 ({report_data.get('risk_band')})</span>
                <span style="font-size: 14px; color: #475569;">Total Findings: <strong>{report_data.get('total_findings')}</strong></span>
                <span style="font-size: 14px; color: #475569;">Total Clauses Analyzed: <strong>{report_data.get('total_clauses')}</strong></span>
            </div>
        </div>

        <h2 style="font-size: 18px; margin-bottom: 16px; color: #1e293b;">Findings & Policy Deviations</h2>
        {findings_html}

        <div class="disclaimer">
            <strong>Legal Notice:</strong> {cls.LEGAL_DISCLAIMER}
        </div>
    </div>
</body>
</html>
"""
        return html
