import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ContractReview } from './components/ContractReview';
import { UploadModal } from './components/UploadModal';
import { LandingPage } from './components/LandingPage';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import type { User } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('landing');
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orgName, setOrgName] = useState<string>('Acme Corporation');
  const [authChecking, setAuthChecking] = useState(true);

  // Authenticate session and check user state on load
  const checkAuthAndOrg = async () => {
    try {
      const session = await api.getSessionInfo();
      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        if (session.user.organization_name) setOrgName(session.user.organization_name);
        setCurrentTab('dashboard');
      } else {
        setCurrentUser(null);
        setCurrentTab('landing');
      }
    } catch {
      setCurrentUser(null);
      setCurrentTab('landing');
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkAuthAndOrg();
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.organization_name) setOrgName(user.organization_name);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    }
    setCurrentUser(null);
    setCurrentTab('landing');
    setActiveContractId(null);
  };

  const handleOpenReview = (contractId: string) => {
    setActiveContractId(contractId);
    setCurrentTab('review');
  };

  const handleUploadSuccess = (contractId: string) => {
    setActiveContractId(contractId);
    setCurrentTab('review');
  };

  // If initial auth check is in flight, render clean subtle loader
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f18',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        letterSpacing: '0.04em',
      }}>
        Initialising Sovereign Environment...
      </div>
    );
  }

  // STRICT GATING: When unauthenticated, ONLY show Landing Page and Auth Modal
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fcfdfe' }}>
        <Navbar
          currentTab="landing"
          setCurrentTab={() => setIsAuthModalOpen(true)}
          onOpenUpload={() => setIsAuthModalOpen(true)}
          hasActiveReview={false}
          orgName={orgName}
          currentUser={null}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <LandingPage
          onLaunchWorkspace={() => setIsAuthModalOpen(true)}
          onOpenUpload={() => setIsAuthModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          currentUser={null}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Executive Editorial Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '40px 40px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          background: '#ffffff',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '-0.01em', marginBottom: '6px' }}>
            AutoAudit Legal Decision Support Platform · Sovereign Edition
          </div>
          <div style={{ maxWidth: '640px', margin: '0 auto', lineHeight: 1.6, color: 'var(--text-dim)' }}>
            AutoAudit provides automated contractual risk assessment and recommended tracked revisions based on codified enterprise playbooks. It does not provide legal advice and is not a substitute for review by qualified legal counsel.
          </div>
        </footer>
      </div>
    );
  }

  // AUTHENTICATED USER LAYOUT: Full access to Dashboard, Review, Settings, and Upload
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        hasActiveReview={!!activeContractId}
        orgName={orgName}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentTab === 'landing' && (
          <LandingPage
            onLaunchWorkspace={() => setCurrentTab('dashboard')}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenAuth={() => {}}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            onOpenReview={handleOpenReview}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        )}

        {currentTab === 'review' && activeContractId && (
          <ContractReview
            contractId={activeContractId}
            onBack={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onUserUpdated={(u) => {
              setCurrentUser(u);
              if (u.organization_name) setOrgName(u.organization_name);
            }}
            onLogout={handleLogout}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Authenticated Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 40px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
        background: '#ffffff',
      }}>
        <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
          AutoAudit Legal Decision Support Platform · Sovereign Edition
        </div>
        <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
          Session authenticated under tenant <strong>{orgName}</strong> · OpenXML tracked changes active
        </div>
      </footer>
    </div>
  );
};

export default App;
