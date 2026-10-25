import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
  BookOpen,
  User,
  FileCheck,
  Scale,
} from 'lucide-react';
import { api } from '../services/api';
import type { ContractDetail } from '../services/api';

interface ContractReviewProps {
  contractId: string;
  onBack: () => void;
}

export const ContractReview: React.FC<ContractReviewProps> = ({ contractId, onBack }) => {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewerName, setReviewerName] = useState('Legal Reviewer');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadContract = async () => {
    try {
      setLoading(true);
      const data = await api.getContractDetail(contractId);
      setContract(data);
      if (data.clauses && data.clauses.length > 0 && !selectedClauseId) {
        // Select first clause with a finding by default, or the first clause
        const firstFindingClause = data.clauses.find(c =>
          data.findings.some(f => f.clause_id === c.id)
        );
        setSelectedClauseId(firstFindingClause ? firstFindingClause.id : data.clauses[0].id);
      }
    } catch (err) {
      console.error('Failed to load contract details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractId]);

  if (loading || !contract) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '15px', fontWeight: 500 }}>Loading contract review workspace...</div>
      </div>
    );
  }

  const selectedClause = contract.clauses.find(c => c.id === selectedClauseId) || contract.clauses[0];
  const selectedFinding = contract.findings.find(f => f.clause_id === selectedClause?.id);

  const filteredClauses = contract.clauses.filter(c =>
    c.heading.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDecision = async (decision: 'ACCEPTED' | 'REJECTED') => {
    if (!selectedFinding) return;
    setActionLoading(true);
    try {
      await api.submitDecision(selectedFinding.id, decision, reviewerName, reviewerNotes);
      setFeedbackMessage(
        decision === 'ACCEPTED'
          ? 'Proposed revision approved and added to tracked redline.'
          : 'Proposed revision rejected. Original contract language preserved.'
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadContract();
    } catch (err: any) {
      alert(`Error submitting decision: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'badge-risk critical';
      case 'HIGH': return 'badge-risk high';
      case 'MEDIUM': return 'badge-risk medium';
      default: return 'badge-risk low';
    }
  };

  return (
    <div style={{ padding: '24px 36px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Contract Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span onClick={onBack} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Contracts
            </span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {contract.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {contract.title}
            </h1>
            <span className={`badge badge-risk ${contract.risk_band.toLowerCase()}`}>
              {contract.risk_band} RISK ({contract.risk_score}/100)
            </span>
            <span className={`badge-status ${contract.status === 'NEEDS_REVIEW' ? 'needs-review' : 'reviewed'}`}>
              {contract.status === 'NEEDS_REVIEW' ? 'Review Required' : 'Approved & Cleared'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Counterparty: <strong style={{ color: 'var(--text-secondary)' }}>{contract.counterparty || 'Not specified'}</strong> · {contract.page_count} {contract.page_count === 1 ? 'page' : 'pages'} · {contract.findings_count} policy deviations flagged
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api.getRedlineUrl(contract.id)}
            download
            className="btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={14} />
            Export Word Redline (.docx)
          </a>
          <a
            href={api.getReportUrl(contract.id, 'html')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            Executive Summary Report
          </a>
        </div>
      </div>

      {feedbackMessage && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle size={16} />
          {feedbackMessage}
        </div>
      )}

      {/* Workflow Step Guide */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 18px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>1</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Select Flagged Clause</span>
            <span style={{ color: 'var(--text-muted)' }}>(Left Panel)</span>
          </div>
          <span style={{ color: 'var(--text-dim)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--brand-accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>2</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Inspect Redline Diff</span>
            <span style={{ color: 'var(--text-muted)' }}>(Center Panel)</span>
          </div>
          <span style={{ color: 'var(--text-dim)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#047857', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>3</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Review Indian Law Rationale & Accept/Reject</span>
            <span style={{ color: 'var(--text-muted)' }}>(Right Panel)</span>
          </div>
          <span style={{ color: 'var(--text-dim)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#1e293b', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>4</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Export Word (.docx)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#065f46', fontWeight: 600, background: '#ecfdf5', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
          <Scale size={12} color="#059669" />
          <span>ICA 1872 • DPDP 2023 Benchmarks Active</span>
        </div>
      </div>

      {/* Main 3-Column Review Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr 360px',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left Column: Clause Outline Navigator */}
        <div className="card-panel" style={{ padding: '16px', maxHeight: 'calc(100vh - 170px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clauses ({contract.clauses.length})
            </span>
            <span style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600 }}>
              {contract.findings.length} flagged
            </span>
          </div>

          {/* Search Clauses */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search clause headings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: 'var(--radius-sm)',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Clause list scroll */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredClauses.map((c) => {
              const finding = contract.findings.find(f => f.clause_id === c.id);
              const isSelected = c.id === selectedClause?.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClauseId(c.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-subtle)' : '#ffffff',
                    border: isSelected ? '1px solid var(--border-medium)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {c.clause_number}
                    </span>
                    {finding && (
                      <span className={`badge ${getSeverityBadgeClass(finding.severity)}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {finding.severity}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '2px' }}>
                    {c.heading}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {c.category.replace(/_/g, ' ')} · p. {c.page_start}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Document Clause Canvas & Redline Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Document Section Canvas */}
          <div className="card-panel" style={{ padding: '24px 28px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {selectedClause.category.replace(/_/g, ' ')}
                </span>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedClause.clause_number} {selectedClause.heading}
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Page {selectedClause.page_start}
              </span>
            </div>

            {/* Extracted Attributes Pills */}
            {selectedClause.attributes && selectedClause.attributes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {selectedClause.attributes.map(attr => (
                  <span
                    key={attr.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong>{attr.attribute_name.replace(/_/g, ' ')}:</strong> {attr.value_text}
                  </span>
                ))}
              </div>
            )}

            {/* Clean Document Prose */}
            <div style={{
              background: '#fcfcfc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-legal)',
            }}>
              {selectedClause.text}
            </div>
          </div>

          {/* Proposed Tracked Redline Review Box */}
          {selectedFinding?.proposal ? (
            <div className="card-panel" style={{ padding: '22px 24px', borderLeft: '4px solid #0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Proposed Revision (Tracked Changes)
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedFinding.proposal.rationale}
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedFinding.proposal.status === 'ACCEPTED' ? '#f0fdf4' : '#f8fafc',
                  color: selectedFinding.proposal.status === 'ACCEPTED' ? '#166534' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  {selectedFinding.proposal.status === 'ACCEPTED' ? 'Approved' : 'Pending Counsel Review'}
                </span>
              </div>

              {/* Side-by-side Diff View */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {/* Original (Marked for Deletion) */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Original Contract Language (Deleted)
                  </div>
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: '#991b1b',
                    textDecoration: 'line-through',
                    fontFamily: 'var(--font-legal)',
                  }}>
                    {selectedFinding.proposal.original_text}
                  </div>
                </div>

                {/* Proposed Text (Insertion) */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Playbook-Aligned Language (Inserted)
                  </div>
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: '#166534',
                    textDecoration: 'underline',
                    fontFamily: 'var(--font-legal)',
                  }}>
                    {selectedFinding.proposal.proposed_text}
                  </div>
                </div>
              </div>

              {/* Human Decision Action Bar */}
              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Reviewer Name"
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '5px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      width: '180px',
                    }}
                  />
                  <input
                    type="text"
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Approval comments or review rationale..."
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '5px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      width: '260px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDecision('REJECTED')}
                    disabled={actionLoading}
                    className="btn-reject"
                  >
                    <XCircle size={15} />
                    Keep Original
                  </button>
                  <button
                    onClick={() => handleDecision('ACCEPTED')}
                    disabled={actionLoading}
                    className="btn-approve"
                  >
                    <CheckCircle size={15} />
                    Approve Language
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileCheck size={28} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Compliant with Policy Playbook
              </div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                This clause meets our standard organizational positions. No redline required.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Policy Playbook Citation & Risk Assessment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Risk Card */}
          {selectedFinding ? (
            <div className="card-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Risk Classification
                </span>
                <span className={`badge ${getSeverityBadgeClass(selectedFinding.severity)}`}>
                  {selectedFinding.severity}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFinding.risk_score}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ 100 Risk Score</span>
              </div>

              {/* Clean gauge bar */}
              <div style={{
                height: '5px',
                background: 'var(--border-subtle)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginBottom: '14px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${selectedFinding.risk_score}%`,
                  background: selectedFinding.risk_score >= 80 ? '#dc2626' : '#ea580c',
                  borderRadius: '9999px',
                }} />
              </div>

              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {selectedFinding.explanation}
              </div>

              {/* Exact Evidence Excerpt */}
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Contract Evidence
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontStyle: 'italic', fontFamily: 'var(--font-legal)' }}>
                  "{selectedFinding.evidence}"
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Risk Classification
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>
                Low Risk (10/100)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Language adheres to standard corporate terms.
              </div>
            </div>
          )}

          {/* Policy Playbook Citation Card */}
          {selectedFinding && (
            <div className="card-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <BookOpen size={16} color="var(--brand-accent)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Policy Citation
                </h3>
              </div>

              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brand-accent)',
                marginBottom: '8px',
              }}>
                {selectedFinding.policy_reference}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Our corporate playbook mandates mutual reciprocal liabilities and standard 30-day cure periods. Terms departing from this standard require legal sign-off.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
