import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Building, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('LEGAL_COUNSEL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          organization_name: orgName,
          role,
        });
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('counsel@acme.com');
    setPassword('password123');
    setLoading(true);
    setError(null);
    try {
      const res = await api.login('counsel@acme.com', 'password123');
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: '460px',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {mode === 'login' ? 'Sign in to AutoAudit' : 'Create Organization Account'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {mode === 'login'
                ? 'Access your organization contracts, policy rules & redlines'
                : 'Set up your tenant profile and custom policy knowledgebase'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: mode === 'login' ? 700 : 500,
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              border: 'none',
              borderBottom: mode === 'login' ? '2px solid var(--brand-accent)' : 'none',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: mode === 'register' ? 700 : 500,
              color: mode === 'register' ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
              background: mode === 'register' ? '#ffffff' : 'transparent',
              border: 'none',
              borderBottom: mode === 'register' ? '2px solid var(--brand-accent)' : 'none',
              cursor: 'pointer',
            }}
          >
            Register Organization
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '16px 24px 0 24px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {mode === 'register' && (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Full Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins, Esq."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Organization / Company Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Professional Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  <option value="LEGAL_COUNSEL">In-House Legal Counsel</option>
                  <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                  <option value="PROCUREMENT_LEAD">Procurement & Commercial Lead</option>
                  <option value="ADMIN">Corporate Administrator</option>
                </select>
              </div>
            </>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="email"
                required
                placeholder="counsel@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '14px', justifyContent: 'center' }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Quick Demo Login Option */}
        {mode === 'login' && (
          <div style={{
            padding: '14px 24px',
            background: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Demo Counsel Account
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                counsel@acme.com / password123
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              1-Click Demo Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
