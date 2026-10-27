import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Building,
  Upload,
  Trash2,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  FolderOpen,
  BookOpen,
  RefreshCw,
  Key,
  Shield,
  Edit2,
  X,
  Radio,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import type { User, Organization, PolicyDocument, SessionInfo, PolicyPlaybook, PolicyRule } from '../services/api';

interface SettingsViewProps {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUserUpdated,
  onLogout,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'playbook' | 'knowledgebase' | 'security'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Organization Form state
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState('');
  const [legalEntity, setLegalEntity] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [riskHigh, setRiskHigh] = useState(75);
  const [riskMed, setRiskMed] = useState(45);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);

  // Policy Documents (RAG) state
  const [policyDocs, setPolicyDocs] = useState<PolicyDocument[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyUploadTitle, setPolicyUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [policyUploading, setPolicyUploading] = useState(false);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);

  // Company Playbook Rules state
  const [playbooks, setPlaybooks] = useState<PolicyPlaybook[]>([]);
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [preferredPos, setPreferredPos] = useState('');
  const [fallbackPos, setFallbackPos] = useState('');
  const [unacceptablePos, setUnacceptablePos] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState('HIGH');
  const [ruleRationale, setRuleRationale] = useState('');
  const [ruleSaving, setRuleSaving] = useState(false);
  const [playbookSuccess, setPlaybookSuccess] = useState<string | null>(null);

  // Live Session Telemetry state
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Load Organization & Policy Docs
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name);
      setEmail(currentUser.email);
    }

    const loadOrgAndDocs = async () => {
      try {
        const orgData = await api.getOrganization();
        setOrg(orgData);
        setOrgName(orgData.name);
        setLegalEntity(orgData.legal_entity_name);
        setJurisdiction(orgData.primary_jurisdiction);
        setRiskHigh(orgData.risk_threshold_high);
        setRiskMed(orgData.risk_threshold_medium);

        setPolicyLoading(true);
        const docs = await api.getPolicyDocuments();
        setPolicyDocs(docs);
      } catch (err) {
        // Fallback
      } finally {
        setPolicyLoading(false);
      }

      try {
        setPlaybookLoading(true);
        const pbs = await api.getPlaybooks();
        setPlaybooks(pbs);
      } catch {
        // Fallback
      } finally {
        setPlaybookLoading(false);
      }

      try {
        setSessionLoading(true);
        const s = await api.getSessionInfo();
        setSessionInfo(s);
      } catch {
        // Fallback
      } finally {
        setSessionLoading(false);
      }
    };

    loadOrgAndDocs();
  }, [currentUser]);

  const handleRefreshSession = async () => {
    try {
      setSessionLoading(true);
      const s = await api.getSessionInfo();
      setSessionInfo(s);
    } catch (err) {
      console.error('Failed to refresh session telemetry:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleStartEditRule = (rule: PolicyRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.rule_name);
    setPreferredPos(rule.preferred_position);
    setFallbackPos(rule.fallback_position);
    setUnacceptablePos(rule.unacceptable_position);
    setRuleSeverity(rule.severity);
    setRuleRationale(rule.rationale || '');
  };

  const handleSaveRule = async (playbookId: string, ruleId: string) => {
    setRuleSaving(true);
    try {
      const updated = await api.updatePlaybookRule(playbookId, ruleId, {
        rule_name: ruleName,
        preferred_position: preferredPos,
        fallback_position: fallbackPos,
        unacceptable_position: unacceptablePos,
        severity: ruleSeverity,
        rationale: ruleRationale,
      });
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
      setPlaybookSuccess('Company policy standard updated! New audits will adhere to these revised parameters.');
      setTimeout(() => setPlaybookSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to update policy rule: ${err.message || 'Unknown error'}`);
    } finally {
      setRuleSaving(false);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const updated = await api.updateProfile({ full_name: fullName, email });
      onUserUpdated(updated);
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await api.changePassword(currentPassword, newPassword);
      setProfileSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update password.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Organization Update
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    setOrgSuccess(false);

    try {
      const updated = await api.updateOrganization({
        name: orgName,
        legal_entity_name: legalEntity,
        primary_jurisdiction: jurisdiction,
        risk_threshold_high: riskHigh,
        risk_threshold_medium: riskMed,
      });
      setOrg(updated);
      setOrgSuccess(true);
      setTimeout(() => setOrgSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update organization settings.');
    } finally {
      setOrgSaving(false);
    }
  };

  // Handle Policy Document Upload
  const handleUploadPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setPolicyUploading(true);
    setPolicySuccess(null);

    try {
      const doc = await api.uploadPolicyDocument(selectedFile, policyUploadTitle);
      setPolicyDocs((prev) => [doc, ...prev]);
      setPolicySuccess(`Policy "${doc.title}" indexed into knowledgebase (${doc.chunk_count} clauses parsed).`);
      setSelectedFile(null);
      setPolicyUploadTitle('');
      setTimeout(() => setPolicySuccess(null), 4000);
    } catch (err: any) {
      alert(`Policy upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPolicyUploading(false);
    }
  };

  // Handle Policy Document Deletion
  const handleDeletePolicy = async (docId: string, title: string) => {
    if (!window.confirm(`Delete policy "${title}" and remove its indexed chunks from knowledgebase?`)) {
      return;
    }
    try {
      await api.deletePolicyDocument(docId);
      setPolicyDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert('Failed to delete policy document.');
    }
  };

  // Tenant Quick Presets
  const applyPreset = (name: string, entity: string, juris: string, high: number, med: number) => {
    setOrgName(name);
    setLegalEntity(entity);
    setJurisdiction(juris);
    setRiskHigh(high);
    setRiskMed(med);
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Settings & Corporate Knowledgebase
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage user credentials, organization profiles, risk sensitivity, and RAG policy documents.
          </p>
        </div>

        {currentUser ? (
          <button
            onClick={onLogout}
            className="btn-secondary"
            style={{ color: '#b91c1c', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        ) : (
          <button onClick={onOpenAuth} className="btn-primary">
            Sign In / Register
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
      }}>
        {[
          { id: 'profile', label: 'User Profile & Credentials', icon: UserIcon },
          { id: 'organization', label: 'Organization & Risk Scoring', icon: Building },
          { id: 'playbook', label: 'Company Policy Playbook', icon: BookOpen },
          { id: 'knowledgebase', label: 'Policy Knowledgebase (RAG)', icon: FolderOpen },
          { id: 'security', label: 'Session & Cookie Security', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: isActive ? '#ffffff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand-accent)' : '2px solid transparent',
                color: isActive ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} color={isActive ? 'var(--brand-accent)' : undefined} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {profileSuccess && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
              {profileError}
            </div>
          )}

          {/* Profile Details Card */}
          <div className="card-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Professional Information
            </h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Assigned Role: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser?.role || 'LEGAL_COUNSEL'}</span> · Organization: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser?.organization_name || org?.name || 'Acme Corporation'}</span>
                </div>
                <button type="submit" disabled={profileSaving} className="btn-primary">
                  <Save size={14} />
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Card */}
          <div className="card-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Change Password
            </h2>
            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button type="submit" disabled={profileSaving || !currentPassword || !newPassword} className="btn-secondary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ORGANIZATION & RISK ENGINE */}
      {activeTab === 'organization' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orgSuccess && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              Organization profile and risk parameters updated successfully.
            </div>
          )}

          {/* Preset Buttons */}
          <div className="card-panel" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Standard Industry Presets (Jurisdiction & Risk Thresholds)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
              {[
                { name: 'Acme Technologies', entity: 'Acme Technologies Private Limited', juris: 'New Delhi', high: 75, med: 45, label: '01 Acme Tech' },
                { name: 'Bharat Logistics Solutions', entity: 'Bharat Logistics Solutions LLP', juris: 'Mumbai', high: 70, med: 40, label: '02 Bharat Logistics' },
                { name: 'IndoCloud Systems', entity: 'IndoCloud Technologies Private Limited', juris: 'Bengaluru', high: 80, med: 50, label: '03 IndoCloud' },
                { name: 'Deccan Biopharma', entity: 'Deccan Biopharma Private Limited', juris: 'Hyderabad', high: 75, med: 45, label: '04 Deccan Pharma' },
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.name, p.entity, p.juris, p.high, p.med)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.juris} ({p.high}/{p.med})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Org Profile Form */}
          <form onSubmit={handleSaveOrg} className="card-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Legal Entity Configuration
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tenant Brand Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full Legal Entity Name
                </label>
                <input
                  type="text"
                  value={legalEntity}
                  onChange={(e) => setLegalEntity(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Primary Choice of Law Jurisdiction (Indian Commercial Courts)
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px', background: '#ffffff' }}
              >
                <option value="New Delhi">New Delhi (High Court of Delhi - Commercial Division)</option>
                <option value="Mumbai">Mumbai (High Court of Bombay - Commercial Capital)</option>
                <option value="Bengaluru">Bengaluru (High Court of Karnataka - Technology Hub)</option>
                <option value="Hyderabad">Hyderabad (High Court of Telangana - IT & Pharma)</option>
                <option value="Chennai">Chennai (High Court of Madras - Manufacturing / Auto)</option>
                <option value="Gurugram">Gurugram (Punjab & Haryana High Court - Enterprise)</option>
                <option value="Kolkata">Kolkata (Calcutta High Court - Eastern Hub)</option>
                <option value="Republic of India">Courts of the Republic of India (National Jurisdiction)</option>
              </select>
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Automated Risk Scoring Thresholds
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Contracts exceeding these calculated thresholds are flagged for mandatory legal review before approval.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>High Risk Threshold</label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>{riskHigh}/100</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={riskHigh}
                  onChange={(e) => setRiskHigh(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#b91c1c' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#854d0e' }}>Medium Risk Threshold</label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#854d0e' }}>{riskMed}/100</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="70"
                  value={riskMed}
                  onChange={(e) => setRiskMed(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ca8a04' }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button type="submit" disabled={orgSaving} className="btn-primary">
                <Save size={14} />
                {orgSaving ? 'Saving...' : 'Save Organization & Thresholds'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: COMPANY POLICY PLAYBOOK */}
      {activeTab === 'playbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {playbookSuccess && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {playbookSuccess}
            </div>
          )}

          <div className="card-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Company Contract Negotiation Standards & Playbook Rules
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Customize your organization's legal positions. AutoAudit checks incoming contracts against these rules to detect deviations, assign risk scores, and propose redlines.
                </p>
              </div>
              <span className="badge-pill" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                {playbooks.reduce((acc, pb) => acc + (pb.rules?.length || 0), 0)} Active Rules
              </span>
            </div>

            {playbookLoading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading company playbook rules...
              </div>
            ) : playbooks.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No playbooks found. AutoAudit will use system baseline policies.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {playbooks.map((pb) => (
                  <div key={pb.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{pb.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{pb.description}</div>
                      </div>
                      <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        v{pb.version} {pb.is_default ? '• Default' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {pb.rules?.map((rule) => {
                        const isEditing = editingRuleId === rule.id;
                        return (
                          <div
                            key={rule.id}
                            style={{
                              padding: '16px 20px',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: isEditing ? '#f8fafc' : '#ffffff',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  className="badge-pill"
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background:
                                      rule.severity === 'CRITICAL'
                                        ? '#fee2e2'
                                        : rule.severity === 'HIGH'
                                        ? '#ffedd5'
                                        : rule.severity === 'MEDIUM'
                                        ? '#fef9c3'
                                        : '#ecfdf5',
                                    color:
                                      rule.severity === 'CRITICAL'
                                        ? '#991b1b'
                                        : rule.severity === 'HIGH'
                                        ? '#9a3412'
                                        : rule.severity === 'MEDIUM'
                                        ? '#854d0e'
                                        : '#065f46',
                                  }}
                                >
                                  {rule.severity}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {rule.rule_name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  ({rule.clause_category})
                                </span>
                              </div>

                              <div>
                                {!isEditing ? (
                                  <button
                                    onClick={() => handleStartEditRule(rule)}
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <Edit2 size={12} />
                                    Edit Policy
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingRuleId(null)}
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                  >
                                    <X size={12} />
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>

                            {!isEditing ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                                <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#166534', marginBottom: '4px' }}>
                                    Preferred Standard
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#14532d', lineHeight: 1.4 }}>
                                    {rule.preferred_position}
                                  </div>
                                </div>

                                <div style={{ background: '#fefce8', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fef08a' }}>
                                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#854d0e', marginBottom: '4px' }}>
                                    Acceptable Fallback
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#713f12', lineHeight: 1.4 }}>
                                    {rule.fallback_position}
                                  </div>
                                </div>

                                <div style={{ background: '#fef2f2', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#991b1b', marginBottom: '4px' }}>
                                    Unacceptable / Red Flag
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: 1.4 }}>
                                    {rule.unacceptable_position}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                      Rule Title
                                    </label>
                                    <input
                                      type="text"
                                      value={ruleName}
                                      onChange={(e) => setRuleName(e.target.value)}
                                      style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                      Severity Trigger
                                    </label>
                                    <select
                                      value={ruleSeverity}
                                      onChange={(e) => setRuleSeverity(e.target.value)}
                                      style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: '#fff' }}
                                    >
                                      <option value="CRITICAL">CRITICAL</option>
                                      <option value="HIGH">HIGH</option>
                                      <option value="MEDIUM">MEDIUM</option>
                                      <option value="LOW">LOW</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                                    Preferred Clause Position (Standard AutoAudit Recommendation)
                                  </label>
                                  <textarea
                                    value={preferredPos}
                                    onChange={(e) => setPreferredPos(e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', background: '#f0fdf4', fontFamily: 'inherit' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#854d0e', marginBottom: '4px' }}>
                                    Acceptable Fallback Position
                                  </label>
                                  <textarea
                                    value={fallbackPos}
                                    onChange={(e) => setFallbackPos(e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fef08a', background: '#fefce8', fontFamily: 'inherit' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
                                    Unacceptable Position (Triggers Immediate Deviation Finding)
                                  </label>
                                  <textarea
                                    value={unacceptablePos}
                                    onChange={(e) => setUnacceptablePos(e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', background: '#fef2f2', fontFamily: 'inherit' }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Legal Rationale / Commentary
                                  </label>
                                  <input
                                    type="text"
                                    value={ruleRationale}
                                    onChange={(e) => setRuleRationale(e.target.value)}
                                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                                    placeholder="Explain commercial rationale or statutory constraints..."
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                  <button
                                    onClick={() => setEditingRuleId(null)}
                                    className="btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveRule(pb.id, rule.id)}
                                    disabled={ruleSaving}
                                    className="btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <Save size={13} />
                                    {ruleSaving ? 'Saving Policy...' : 'Save Policy Position'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: POLICY KNOWLEDGEBASE (RAG) */}
      {activeTab === 'knowledgebase' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {policySuccess && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {policySuccess}
            </div>
          )}

          {/* Upload Card */}
          <div className="card-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Upload Corporate Policy Guidelines to Knowledgebase
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Upload internal procurement policies, vendor compliance codes, or standard terms (.docx or .pdf). The RAG engine automatically segments and indexes passages to cite as ground-truth evidence during contract reviews.
            </p>

            <form onSubmit={handleUploadPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Policy Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Procurement & Security Playbook 2026"
                    value={policyUploadTitle}
                    onChange={(e) => setPolicyUploadTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Select Document (.docx or .pdf)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tip: Upload internal procurement policies, vendor compliance codes, or corporate standard terms (.docx or .pdf).
                </div>
                <button
                  type="submit"
                  disabled={policyUploading || !selectedFile}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={14} />
                  {policyUploading ? 'Indexing Knowledgebase...' : 'Index Policy Document'}
                </button>
              </div>
            </form>
          </div>

          {/* Indexed Documents Table */}
          <div className="card-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Indexed Organization Policy Documents ({policyDocs.length})
              </h3>
            </div>

            {policyLoading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading knowledgebase documents...
              </div>
            ) : policyDocs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FolderOpen size={36} color="var(--text-dim)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No policy documents indexed yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Upload a policy document above to establish your organization's RAG citations.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 20px' }}>Policy Title</th>
                    <th style={{ padding: '12px 16px' }}>Format</th>
                    <th style={{ padding: '12px 16px' }}>Indexed Chunks</th>
                    <th style={{ padding: '12px 16px' }}>Date Added</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policyDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {doc.title}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.original_filename}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {doc.file_type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600, color: '#065f46' }}>{doc.chunk_count}</span> policy sections
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeletePolicy(doc.id, doc.title)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#b91c1c', borderColor: '#fee2e2' }}
                          title="Remove policy from knowledgebase"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SESSION & COOKIE SECURITY */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--brand-accent)" />
                  JWT Authentication & Cookie Telemetry
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Stateless JSON Web Tokens with HTTP-only cookies, client tracking cookies, and automatic silent renewal.
                </p>
              </div>

              <button
                onClick={handleRefreshSession}
                disabled={sessionLoading}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              >
                <RefreshCw size={13} className={sessionLoading ? 'animate-spin' : ''} />
                Refresh Heartbeat
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Key size={14} color="var(--brand-accent)" />
                  Access Token (HTTP-Only)
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {sessionInfo?.access_token_expires_minutes || 60} Minutes
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Status: {sessionInfo?.has_access_token_cookie ? 'Active in HttpOnly cookie' : 'Bearer fallback'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Clock size={14} color="var(--brand-accent)" />
                  Refresh Token (Cookie)
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {sessionInfo?.refresh_token_expires_days || 7} Days
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {sessionInfo?.has_refresh_token_cookie ? 'Active persistence cookie' : 'Automatic silent refresh'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Radio size={14} color="var(--brand-accent)" />
                  Session Telemetry Status
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
                  {sessionInfo?.authenticated ? 'Verified Active' : 'Public Session'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Session ID: <code style={{ fontSize: '10px' }}>{sessionInfo?.session_id?.slice(0, 8)}...</code>
                </div>
              </div>
            </div>

            {/* Live Detected Cookies Table */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '12px 18px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Browser Cookies & Tracking Telemetry Detected
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 16px' }}>Cookie Identifier</th>
                    <th style={{ padding: '10px 16px' }}>Security Type</th>
                    <th style={{ padding: '10px 16px' }}>Current State / Value Snippet</th>
                    <th style={{ padding: '10px 16px' }}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>access_token</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>HttpOnly • Lax</span></td>
                    <td style={{ padding: '10px 16px', color: sessionInfo?.has_access_token_cookie ? '#059669' : '#991b1b', fontWeight: 600 }}>
                      {sessionInfo?.has_access_token_cookie ? '✓ Present & Verified' : '○ Local / Bearer'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Stateless JWT bearer for all API calls</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>refresh_token</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>HttpOnly • Lax</span></td>
                    <td style={{ padding: '10px 16px', color: sessionInfo?.has_refresh_token_cookie ? '#059669' : '#991b1b', fontWeight: 600 }}>
                      {sessionInfo?.has_refresh_token_cookie ? '✓ Present (7-day persistence)' : '○ Local / Cookie'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Allows background token renewal without re-login</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>aa_session_id</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>Tracking Cookie</span></td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {sessionInfo?.session_id || 'Generating...'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Audit trail & forensic session correlation</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>aa_last_active</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>Timestamp</span></td>
                    <td style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {sessionInfo?.last_active ? new Date(sessionInfo.last_active).toLocaleString() : new Date().toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Idle session tracking and timeout enforcement</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>aa_tenant</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>Tenant Context</span></td>
                    <td style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sessionInfo?.tenant || org?.name || 'Default Org'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Multi-tenant policy and contract segregation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Authenticated Identity: <strong>{currentUser?.email || 'Guest Session'}</strong> ({currentUser?.role || 'VIEWER'})
              </div>
              {currentUser && (
                <button onClick={onLogout} className="btn-secondary" style={{ color: '#b91c1c', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LogOut size={13} />
                  Sign Out & Destroy Cookies
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
