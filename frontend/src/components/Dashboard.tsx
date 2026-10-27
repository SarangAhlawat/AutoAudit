import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  ExternalLink,
  Search,
  RefreshCw,
  Trash2,
  Scale,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Upload,
} from 'lucide-react';
import { api } from '../services/api';
import type { Contract } from '../services/api';

interface DashboardProps {
  onOpenReview: (contractId: string) => void;
  onOpenUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenReview, onOpenUpload }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await api.getContracts();
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleDelete = async (contractId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove all clauses, findings, and redline artifacts.`)) {
      return;
    }
    try {
      setDeletingId(contractId);
      await api.deleteContract(contractId);
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
    } catch (err: any) {
      alert(`Failed to delete contract: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.counterparty && c.counterparty.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalContracts = contracts.length;
  const criticalCount = contracts.filter((c) => c.risk_band === 'CRITICAL' || c.risk_band === 'HIGH').length;
  const needsReviewCount = contracts.filter((c) => c.status === 'NEEDS_REVIEW').length;
  const reviewedCount = contracts.filter((c) => c.status === 'REVIEWED').length;

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Contract Review Pipeline
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              borderRadius: '9999px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}>
              <span>⚖️ Indian Legal Standard</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>ICA 1872 / DPDP Act 2023</span>
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Automated clause extraction, Indian statutory compliance audit, and native Microsoft Word tracked changes for opposing counsel.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Info size={14} color="var(--brand-accent)" />
            <span>{showWorkflowGuide ? 'Hide Process Guide' : 'How It Works'}</span>
            {showWorkflowGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onOpenUpload} className="btn-primary">
            Upload Contract for Review
          </button>
        </div>
      </div>

      {/* Expandable Workflow Architecture Guide */}
      {showWorkflowGuide && (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Indian Contract Review Workflow Architecture
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                How contracts move from raw files to fully negotiated Word redlines ready for counterparty execution.
              </p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-accent)', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
              3-Step Automated Pipeline
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* Step 1 */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#0f172a',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Step 1: Ingestion
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Upload Agreement (.docx / .pdf)
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Upload any counterparty contract. The layout extractor segments numbered clauses, paragraphs, recital preambles, and definitions into indexed review nodes.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--brand-accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--brand-accent)' }}>
                    Step 2: Statutory Audit
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Indian Law & Policy Check
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Scans for Section 27 ICA void non-competes, DPDP Act 2023 breach rules, Arbitration Act 1996 sole-arbitrator compliance, and 12-month mutual liability caps.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#047857',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#047857' }}>
                    Step 3: Redline & Export
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Tracked Changes (.docx)
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Interactively review deviations side-by-side. Accept or reject revisions with a single click, then export genuine Microsoft Word tracked changes for opposing counsel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metric Stat Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="card-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Contracts</span>
            <FileText size={16} color="var(--text-dim)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalContracts}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>In current workspace</div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9a3412', fontWeight: 500 }}>High-Risk Findings</span>
            <AlertCircle size={16} color="#c2410c" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#9a3412' }}>{criticalCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Uncapped liability or indemnity risks</div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#854d0e', fontWeight: 500 }}>Pending Review</span>
            <Clock size={16} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#854d0e' }}>{needsReviewCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting counsel sign-off</div>
        </div>

        <div className="card-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--brand-accent-hover)', fontWeight: 500 }}>Approved & Cleared</span>
            <CheckCircle2 size={16} color="var(--brand-accent)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--brand-accent-hover)' }}>{reviewedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>All suggestions resolved</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card-panel" style={{ overflow: 'hidden' }}>
        {/* Table Controls */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--bg-surface)',
        }}>
          {/* Segmented Filter */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'ALL', label: 'All Agreements' },
              { id: 'NEEDS_REVIEW', label: 'Needs Review' },
              { id: 'REVIEWED', label: 'Approved' },
              { id: 'PROCESSING', label: 'Processing' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search contracts or counterparty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '7px 12px 7px 34px',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  width: '260px',
                }}
              />
            </div>

            <button onClick={loadContracts} className="btn-secondary" style={{ padding: '7px 12px' }} title="Refresh list">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading contract records...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', background: '#fafbfc' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}>
                <Scale size={28} color="#059669" />
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Your Organization Workspace is Ready
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
                Upload vendor MSAs, customer licenses, non-disclosure agreements, or procurement contracts to run automated compliance checks and generate redlined Word documents.
              </p>

              {/* 3 Step Explanation Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                textAlign: 'left',
                marginBottom: '28px',
              }}>
                {/* Step 1 */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#0f172a',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>1</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Ingest & Parse
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Upload Agreement (.docx / .pdf)
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Upload any contract file. The layout parser extracts numbered clauses, recitals, and definitions without losing document structure.
                  </p>
                </div>

                {/* Step 2 */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--brand-accent)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>2</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-accent)' }}>
                      Statutory Audit
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Indian Law & Policy Engine
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Scans for void non-competes (Section 27 ICA), DPDP Act 2023 breach rules, Arbitration Act 1996 sole-arbitrator compliance, and 12-month liability caps.
                  </p>
                </div>

                {/* Step 3 */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#047857',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>3</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#047857' }}>
                      Redline & Export
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Word Redline Tracked Changes
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Review diffs side-by-side. Accept or reject revisions with one click, then export client-ready Microsoft Word tracked changes for counsel.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                <button onClick={onOpenUpload} className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
                  <Upload size={16} />
                  Upload Agreement for Review (.docx / .pdf)
                </button>
              </div>

              <div style={{
                marginTop: '20px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
              }}>
                <Shield size={12} color="#059669" />
                <span>Governing Law: Republic of India • Courts: New Delhi, Mumbai, Bengaluru • DPDP Act 2023 Compliant</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  <th style={{ padding: '12px 24px' }}>Contract Title</th>
                  <th style={{ padding: '12px 20px' }}>Counterparty</th>
                  <th style={{ padding: '12px 20px' }}>Risk Assessment</th>
                  <th style={{ padding: '12px 20px' }}>Review Status</th>
                  <th style={{ padding: '12px 20px' }}>Clauses</th>
                  <th style={{ padding: '12px 20px' }}>Deviations</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div
                        onClick={() => onOpenReview(c.id)}
                        style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {c.title}
                        <ArrowRight size={13} color="var(--brand-accent)" />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {c.original_filename} ({c.file_type.toUpperCase()})
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {c.counterparty || 'Not specified'}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-risk ${c.risk_band.toLowerCase()}`}>
                        {c.risk_band} ({c.risk_score}/100)
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge-status ${c.status === 'NEEDS_REVIEW' ? 'needs-review' : c.status === 'REVIEWED' ? 'reviewed' : 'processing'}`}>
                        {c.status === 'NEEDS_REVIEW' ? 'Needs Review' : c.status === 'REVIEWED' ? 'Approved' : 'Processing'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {c.clauses_count}
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600, color: c.findings_count > 0 ? '#c2410c' : '#15803d' }}>
                        {c.findings_count} {c.findings_count === 1 ? 'deviation' : 'deviations'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onOpenReview(c.id)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Review
                        </button>
                        <a
                          href={api.getRedlineUrl(c.id)}
                          download
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
                          title="Download Word Redline (.docx)"
                        >
                          <Download size={13} />
                        </a>
                        <a
                          href={api.getReportUrl(c.id, 'html')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
                          title="Executive Summary Report"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => handleDelete(c.id, c.title)}
                          disabled={deletingId === c.id}
                          className="btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            color: '#b91c1c',
                            borderColor: '#fee2e2',
                            background: deletingId === c.id ? '#fef2f2' : '#ffffff',
                          }}
                          title="Delete Contract"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
