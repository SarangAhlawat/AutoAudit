import React, { useState, useRef } from 'react';
import { X, UploadCloud, AlertCircle, Loader2, FileText } from 'lucide-react';
import { api } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contractId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectFile = (selected: File) => {
    const ext = selected.name.toLowerCase();
    if (!ext.endsWith('.docx') && !ext.endsWith('.pdf') && !ext.endsWith('.doc')) {
      setError('Please select a valid Word document (.docx) or PDF file.');
      return;
    }
    setError(null);
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const pollJobAndFinish = (jobId: string, contractId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const job = await api.getJobStatus(jobId);
        setStatusMessage(`${job.current_stage || 'Processing document'}`);
        setProgressPercent(job.progress_percent || 0);

        if (job.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setLoading(false);
          onSuccess(contractId);
          onClose();
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          setLoading(false);
          setError(job.error_message || 'Contract analysis failed.');
        }
      } catch (err) {
        console.error('Error polling job:', err);
      }
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop a contract document (.docx or .pdf)');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for this agreement.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Uploading agreement to sovereign storage...');
    setProgressPercent(15);

    try {
      const res = await api.uploadContract(file, title.trim(), counterparty.trim());
      setStatusMessage('Extracting document layout and segmenting clauses...');
      setProgressPercent(35);
      pollJobAndFinish(res.job_id, res.contract_id);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to upload contract. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(8, 13, 20, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        width: '100%',
        maxWidth: '540px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 20px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <div className="eyebrow-luxury" style={{ marginBottom: '4px' }}>
              Institutional Document Ingestion
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Upload Contract Agreement
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Select an executed or draft agreement (.docx or .pdf) to initiate automated policy compliance analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '16px 28px 0 28px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#991b1b',
            fontSize: '13px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Progress State */}
        {loading && (
          <div style={{
            margin: '20px 28px',
            background: 'var(--brand-accent-subtle)',
            border: '1px solid var(--brand-accent-border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <Loader2 size={18} color="var(--brand-accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-accent-hover)' }}>
                {statusMessage}
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--brand-accent)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Main Upload Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {/* Drag & Drop Surface */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed var(--brand-accent)' : file ? '1.5px solid var(--brand-accent-border)' : '1.5px dashed var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              background: isDragging ? 'var(--brand-accent-subtle)' : file ? '#f0fdf4' : '#fafafa',
              padding: file ? '20px' : '32px 20px',
              textAlign: 'center',
              cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '20px',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".docx,.pdf,.doc"
              style={{ display: 'none' }}
              disabled={loading}
            />

            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-accent)',
                }}>
                  <FileText size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB · Ready for parsing
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    padding: '4px',
                  }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--brand-accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  color: 'var(--brand-accent)',
                }}>
                  <UploadCloud size={22} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drag & drop contract file here, or <span style={{ color: 'var(--brand-accent)' }}>browse</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports Microsoft Word (.docx) and PDF documents up to 50MB
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Agreement Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Master Services Agreement 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Counterparty Name <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Technologies Inc. or Apex Supply LLC"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing Document...
                </>
              ) : (
                'Begin Policy Audit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
