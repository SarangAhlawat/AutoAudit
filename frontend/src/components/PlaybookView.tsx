import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Scale,
  Edit2,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { PolicyPlaybook, PolicyRule } from '../services/api';

export const PlaybookView: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<PolicyPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit form state
  const [ruleName, setRuleName] = useState('');
  const [preferredPosition, setPreferredPosition] = useState('');
  const [fallbackPosition, setFallbackPosition] = useState('');
  const [unacceptablePosition, setUnacceptablePosition] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [rationale, setRationale] = useState('');

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      const data = await api.getPlaybooks();
      setPlaybooks(data);
    } catch (err) {
      console.error('Failed to load playbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const handleStartEdit = (rule: PolicyRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.rule_name);
    setPreferredPosition(rule.preferred_position);
    setFallbackPosition(rule.fallback_position);
    setUnacceptablePosition(rule.unacceptable_position);
    setSeverity(rule.severity);
    setRationale(rule.rationale || '');
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
  };

  const handleSaveRule = async (playbookId: string, ruleId: string) => {
    setSaving(true);
    try {
      const updated = await api.updatePlaybookRule(playbookId, ruleId, {
        rule_name: ruleName,
        preferred_position: preferredPosition,
        fallback_position: fallbackPosition,
        unacceptable_position: unacceptablePosition,
        severity,
        rationale,
      });

      // Update local state
      setPlaybooks((prev) =>
        prev.map((pb) => {
          if (pb.id !== playbookId) return pb;
          return {
            ...pb,
            rules: pb.rules.map((r) => (r.id === ruleId ? { ...r, ...updated } : r)),
          };
        })
      );

      setEditingRuleId(null);
      setSuccessMessage('Policy rule updated successfully. Automated audits will apply these updated standards.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Failed to save policy rule: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading policy playbook rules...</div>;
  }

  const activePlaybook = playbooks[0];

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#0f172a',
              padding: '8px',
              borderRadius: '6px',
              color: '#ffffff',
            }}>
              <Scale size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activePlaybook?.name || 'Enterprise Legal Playbook'}
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Version {activePlaybook?.version} · {activePlaybook?.rules.length || 0} Standard Clause Rules Defined
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: '#ffffff',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
          }}>
            Fully customizable per organization or tenant
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '900px', marginTop: '10px' }}>
          Guidelines defined here govern automated clause extraction, risk scoring, and tracked redline generation. You can adjust preferred stances, acceptable fallbacks, and unacceptable terms to match your company's risk tolerance.
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#166534',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activePlaybook?.rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;

          if (isEditing) {
            return (
              <div
                key={rule.id}
                className="card-panel"
                style={{
                  padding: '24px',
                  border: '2px solid var(--brand-primary)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Editing Rule · {rule.clause_category.replace(/_/g, ' ')}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      Customize Clause Stance
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      disabled={saving}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveRule(activePlaybook.id, rule.id)}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                      disabled={saving}
                    >
                      <Save size={14} />
                      {saving ? 'Saving...' : 'Save Rule Changes'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Rule Title
                    </label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Risk Severity
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '13px',
                        background: '#ffffff',
                      }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                {/* Positions Editor Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                      <CheckCircle size={14} />
                      Preferred Position
                    </label>
                    <textarea
                      rows={5}
                      value={preferredPosition}
                      onChange={(e) => setPreferredPosition(e.target.value)}
                      placeholder="Company's preferred legal clause text..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #bbf7d0',
                        fontSize: '12px',
                        fontFamily: 'var(--font-legal)',
                        background: '#f0fdf4',
                        color: '#166534',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#854d0e', marginBottom: '6px' }}>
                      <AlertTriangle size={14} />
                      Fallback Position
                    </label>
                    <textarea
                      rows={5}
                      value={fallbackPosition}
                      onChange={(e) => setFallbackPosition(e.target.value)}
                      placeholder="Acceptable fallback text if counterparty pushes back..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fef08a',
                        fontSize: '12px',
                        fontFamily: 'var(--font-legal)',
                        background: '#fefce8',
                        color: '#854d0e',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                      <ShieldAlert size={14} />
                      Unacceptable Terms
                    </label>
                    <textarea
                      rows={5}
                      value={unacceptablePosition}
                      onChange={(e) => setUnacceptablePosition(e.target.value)}
                      placeholder="Disallowed terms that trigger a critical risk finding..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fecaca',
                        fontSize: '12px',
                        fontFamily: 'var(--font-legal)',
                        background: '#fef2f2',
                        color: '#991b1b',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Review Guidance & Internal Counsel Notes
                  </label>
                  <input
                    type="text"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Explanation for counsel evaluating this clause..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={rule.id} className="card-panel" style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {rule.clause_category.replace(/_/g, ' ')}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {rule.rule_name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {rule.policy_reference}
                  </span>
                  <span className={`badge badge-risk ${rule.severity.toLowerCase()}`}>
                    {rule.severity} RISK
                  </span>
                  <button
                    onClick={() => handleStartEdit(rule)}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    title="Customize rule for your organization"
                  >
                    <Edit2 size={12} />
                    Customize
                  </button>
                </div>
              </div>

              {/* 3 Positions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                {/* Preferred */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    <CheckCircle size={14} />
                    Preferred Position
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#166534', fontFamily: 'var(--font-legal)' }}>
                    {rule.preferred_position}
                  </div>
                </div>

                {/* Fallback */}
                <div style={{
                  background: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#854d0e', marginBottom: '6px' }}>
                    <AlertTriangle size={14} />
                    Fallback Position
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#854d0e', fontFamily: 'var(--font-legal)' }}>
                    {rule.fallback_position}
                  </div>
                </div>

                {/* Unacceptable */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                    <ShieldAlert size={14} />
                    Unacceptable Terms
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#991b1b', fontFamily: 'var(--font-legal)' }}>
                    {rule.unacceptable_position}
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Review Guidance:</strong> {rule.rationale}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
