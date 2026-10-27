import React, { useState, useEffect } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { api } from '../services/api';
import type { Organization } from '../services/api';

interface OrganizationSettingsProps {
  onProfileUpdated?: () => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ onProfileUpdated }) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [legalEntity, setLegalEntity] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [riskHigh, setRiskHigh] = useState(75);
  const [riskMed, setRiskMed] = useState(45);

  const loadOrg = async () => {
    try {
      setLoading(true);
      const data = await api.getOrganization();
      setOrg(data);
      setName(data.name);
      setLegalEntity(data.legal_entity_name);
      setJurisdiction(data.primary_jurisdiction);
      setRiskHigh(data.risk_threshold_high);
      setRiskMed(data.risk_threshold_medium);
    } catch (err) {
      console.error('Failed to load organization profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateOrganization({
        name,
        legal_entity_name: legalEntity,
        primary_jurisdiction: jurisdiction,
        risk_threshold_high: riskHigh,
        risk_threshold_medium: riskMed,
      });
      setOrg(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      alert(`Error saving profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: { name: string; entity: string; jurisdiction: string; high: number; med: number }) => {
    setName(preset.name);
    setLegalEntity(preset.entity);
    setJurisdiction(preset.jurisdiction);
    setRiskHigh(preset.high);
    setRiskMed(preset.med);
  };

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading organization settings...</div>;
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Organization & Policy Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Configure your corporate legal entity details, primary dispute jurisdictions, and automated risk thresholds.
          {org && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
              Tenant ID: {org.id.slice(0, 8)} · Last saved: {new Date(org.updated_at).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      {saveSuccess && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          <CheckCircle2 size={16} />
          Organization profile and review parameters updated successfully.
        </div>
      )}

      {/* Preset Fast-Switch Buttons */}
      <div className="card-panel" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Standard Enterprise Configuration Presets
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Select an industry standard preset to configure corporate jurisdiction and risk sensitivity:
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            {
              label: '01 / Acme Technologies',
              name: 'Acme Technologies',
              entity: 'Acme Technologies Private Limited',
              jurisdiction: 'New Delhi (High Court of Delhi)',
              high: 75,
              med: 45,
            },
            {
              label: '02 / Bharat Logistics',
              name: 'Bharat Logistics Solutions',
              entity: 'Bharat Logistics Solutions LLP',
              jurisdiction: 'Mumbai (Bombay High Court)',
              high: 70,
              med: 40,
            },
            {
              label: '03 / Bangalore Cloud Tech',
              name: 'IndoCloud Systems',
              entity: 'IndoCloud Technologies Private Limited',
              jurisdiction: 'Bengaluru (High Court of Karnataka)',
              high: 80,
              med: 50,
            },
            {
              label: '04 / Hyderabad Pharma',
              name: 'Deccan Therapeutics',
              entity: 'Deccan Biopharma Private Limited',
              jurisdiction: 'Hyderabad (High Court of Telangana)',
              high: 75,
              med: 45,
            },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="card-panel" style={{ padding: '28px 32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Entity Profile & Governance
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Organization Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Organization / Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Legal Entity */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Registered Legal Entity Name
            </label>
            <input
              type="text"
              value={legalEntity}
              onChange={(e) => setLegalEntity(e.target.value)}
              placeholder="e.g. Acme Global Technologies Inc."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Primary Legal Jurisdiction */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Primary Choice of Law Jurisdiction
          </label>
          <input
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="e.g. New Delhi, Mumbai, Bengaluru, or Courts of the Republic of India"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Agreements designating foreign jurisdictions (e.g. Delaware, Singapore, English law) or non-Indian governing law will be flagged for review.
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Review Thresholds & Escalation Triggers
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Critical Risk Escalation Score</span>
                <strong>{riskHigh} / 100</strong>
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={riskHigh}
                onChange={(e) => setRiskHigh(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Contracts scoring above this threshold require mandatory human legal sign-off.
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Moderate Risk Review Threshold</span>
                <strong>{riskMed} / 100</strong>
              </label>
              <input
                type="range"
                min="20"
                max="60"
                value={riskMed}
                onChange={(e) => setRiskMed(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Contracts between moderate and critical are routed with highlighted advisory warnings.
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '8px 20px' }}
          >
            <Save size={14} />
            {saving ? 'Saving Profile...' : 'Save Organization Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
