import React, { useState, useEffect } from 'react';
import { FileText, Upload, ChevronRight, Scale, Settings, Home, LogOut, Shield } from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../services/api';

export type NavTab = 'landing' | 'dashboard' | 'review' | 'playbooks' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
  hasActiveReview: boolean;
  orgName?: string;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenUpload,
  hasActiveReview,
  orgName: propOrgName,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [orgName, setOrgName] = useState(propOrgName || 'Acme Technologies');

  useEffect(() => {
    if (propOrgName) {
      setOrgName(propOrgName);
      return;
    }
    const fetchOrg = async () => {
      try {
        const org = await api.getOrganization();
        if (org && org.name) setOrgName(org.name);
      } catch (err) {
        // Fallback
      }
    };
    if (currentUser) {
      fetchOrg();
    }
  }, [propOrgName, currentUser]);

  return (
    <header style={{
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 40px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
    }}>
      {/* Brand & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        <div 
          onClick={() => setCurrentTab(currentUser ? 'dashboard' : 'landing')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title={currentUser ? 'Go to Dashboard' : 'AutoAudit Home'}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'var(--brand-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
          }}>
            <Scale size={18} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '17px',
              fontWeight: '800',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
            }}>
              AutoAudit
            </span>
            {currentUser && (
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                background: 'var(--brand-accent-subtle)',
                color: 'var(--brand-accent-hover)',
                padding: '2px 9px',
                borderRadius: '9999px',
                border: '1px solid var(--brand-accent-border)',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {orgName}
              </span>
            )}
          </div>
        </div>

        {/* Public vs. Authenticated Navigation */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {currentUser ? (
            /* AUTHENTICATED TABS ONLY */
            <>
              <button
                onClick={() => setCurrentTab('dashboard')}
                style={{
                  background: currentTab === 'dashboard' ? 'var(--brand-accent-subtle)' : 'transparent',
                  color: currentTab === 'dashboard' ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                  border: currentTab === 'dashboard' ? '1px solid var(--brand-accent-border)' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: currentTab === 'dashboard' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileText size={14} />
                Dashboard
              </button>

              {hasActiveReview && (
                <button
                  onClick={() => setCurrentTab('review')}
                  style={{
                    background: currentTab === 'review' ? 'var(--brand-accent-subtle)' : 'transparent',
                    color: currentTab === 'review' ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                    border: currentTab === 'review' ? '1px solid var(--brand-accent-border)' : '1px solid transparent',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ChevronRight size={14} />
                  Review Workspace
                </button>
              )}

              <button
                onClick={() => setCurrentTab('settings')}
                style={{
                  background: currentTab === 'settings' ? 'var(--brand-accent-subtle)' : 'transparent',
                  color: currentTab === 'settings' ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                  border: currentTab === 'settings' ? '1px solid var(--brand-accent-border)' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: currentTab === 'settings' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Settings size={14} />
                Settings & Policy
              </button>

              <button
                onClick={() => setCurrentTab('landing')}
                style={{
                  background: currentTab === 'landing' ? 'var(--brand-accent-subtle)' : 'transparent',
                  color: currentTab === 'landing' ? 'var(--brand-accent-hover)' : 'var(--text-muted)',
                  border: currentTab === 'landing' ? '1px solid var(--brand-accent-border)' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: currentTab === 'landing' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Home size={14} />
                Overview
              </button>
            </>
          ) : (
            /* PUBLIC EDITORIAL LINKS WHEN NOT LOGGED IN */
            <>
              <a
                href="#architecture"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Architecture
              </a>
              <a
                href="#pillars"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Pillars
              </a>
              <a
                href="#pipeline"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Pipeline
              </a>
              <a
                href="#security"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Security & Compliance
              </a>
              <a
                href="#faq"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                FAQ
              </a>
            </>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {currentUser ? (
          /* AUTHENTICATED USER CONTROLS */
          <>
            <button
              onClick={onOpenUpload}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px' }}
            >
              <Upload size={14} />
              <span>Upload Contract</span>
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              style={{
                background: 'var(--glass-bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '9999px',
                padding: '4px 14px 4px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="View Profile & Settings"
            >
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--brand-accent)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {currentUser.full_name ? currentUser.full_name[0].toUpperCase() : 'U'}
              </div>
              <span>{currentUser.full_name}</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{
                  padding: '7px 11px',
                  fontSize: '12px',
                  color: '#991b1b',
                  borderColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            )}
          </>
        ) : (
          /* PUBLIC VISITOR CTA: CLIENT PORTAL ONLY */
          onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="glass-pill"
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.04)',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--brand-accent)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--brand-accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.12)';
              }}
            >
              <Shield size={14} color="var(--brand-accent)" />
              <span>Client Portal</span>
              <ChevronRight size={13} />
            </button>
          )
        )}
      </div>
    </header>
  );
};
