import React, { useState } from 'react';
import {
  Scale,
  ArrowRight,
  Shield,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Lock,
  FileCheck,
  Key,
} from 'lucide-react';

interface LandingPageProps {
  onLaunchWorkspace: () => void;
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  currentUser?: { full_name: string; email: string } | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWorkspace,
  onOpenUpload,
  onOpenAuth,
  currentUser,
}) => {
  // Hero Interactive Specification Widget (calibrated for Indian Commercial Legal Standards)
  const [agreementType, setAgreementType] = useState('Master Services Agreement');
  const [jurisdiction, setJurisdiction] = useState('New Delhi (High Court of Delhi)');
  const [liabilityPosture, setLiabilityPosture] = useState('Section 73 ICA Mutual Cap (12 Mo Fees)');
  const [statutoryStandard, setStatutoryStandard] = useState('DPDP Act 2023 (72h Notice)');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleHeroAction = () => {
    if (currentUser) {
      onOpenUpload();
    } else {
      onOpenAuth();
    }
  };

  return (
    <div style={{ background: '#fcfdfe', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* HERO SECTION - Architectural Scale inspired by aerodynamics.nl */}
      <section style={{
        position: 'relative',
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '80px 24px 100px 24px',
        background: 'linear-gradient(180deg, #090e17 0%, #0d1522 55%, #162032 85%, #fcfdfe 100%)',
        color: '#ffffff',
        textAlign: 'center',
      }}>
        {/* Subtle noise and radial atmospheric glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 25%, rgba(5, 150, 105, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1040px',
          width: '100%',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Eyebrow Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '9999px',
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a7f3d0',
            marginBottom: '28px',
          }}>
            <Shield size={13} color="#10b981" />
            <span>Autonomous Legal Decision Infrastructure</span>
          </div>

          {/* Grand Headline with Editorial Serif Italics */}
          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 68px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            color: '#ffffff',
            margin: '0 0 24px 0',
          }}>
            Autonomous contract review.<br />
            <em className="editorial-italic" style={{ color: '#34d399', fontWeight: 400 }}>
              Absolute legal precision.
            </em>
          </h1>

          {/* Editorial Subheadline */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            lineHeight: 1.6,
            color: 'rgba(241, 245, 249, 0.82)',
            maxWidth: '720px',
            margin: '0 auto 48px auto',
            fontWeight: 400,
          }}>
            Codified policy governance and native Microsoft Word tracked changes for corporate legal counsel, procurement directors, and compliance officers.
          </p>

          {/* HERO INTERACTIVE SPECIFICATION WIDGET (Aerodynamics.nl Flight Calculator Equivalent) */}
          <div style={{
            width: '100%',
            maxWidth: '960px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr) auto',
            gap: '8px',
            alignItems: 'center',
            color: 'var(--text-primary)',
            textAlign: 'left',
          }}>
            {/* Field 1: Agreement Class */}
            <div style={{
              padding: '10px 14px',
              borderRight: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Agreement Class
              </label>
              <select
                value={agreementType}
                onChange={(e) => setAgreementType(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Master Services Agreement">Master Services Agreement (MSA)</option>
                <option value="Mutual Non-Disclosure Agreement">Mutual Non-Disclosure (NDA)</option>
                <option value="Data Processing Addendum">Data Processing Addendum (DPA)</option>
                <option value="Clinical Trial Protocol">Clinical Trial Protocol (CTA)</option>
                <option value="Enterprise SaaS License">Enterprise SaaS License</option>
              </select>
            </div>

            {/* Field 2: Governing Jurisdiction */}
            <div style={{
              padding: '10px 14px',
              borderRight: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Choice of Law
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="New Delhi (High Court of Delhi)">New Delhi (Delhi High Court)</option>
                <option value="Mumbai (Bombay High Court)">Mumbai (Bombay High Court)</option>
                <option value="Bengaluru (High Court of Karnataka)">Bengaluru (Karnataka High Court)</option>
                <option value="Hyderabad (High Court of Telangana)">Hyderabad (Telangana High Court)</option>
                <option value="Chennai (Madras High Court)">Chennai (Madras High Court)</option>
                <option value="Republic of India (National Commercial)">Republic of India (Commercial Courts)</option>
              </select>
            </div>

            {/* Field 3: Liability & Indemnity Posture */}
            <div style={{
              padding: '10px 14px',
              borderRight: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Liability Posture
              </label>
              <select
                value={liabilityPosture}
                onChange={(e) => setLiabilityPosture(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Section 73 ICA Mutual Cap (12 Mo Fees)">Section 73 ICA Cap (12 Mo Fees)</option>
                <option value="Section 74 Liquidated Damages Benchmark">Section 74 Pre-Estimate Benchmark</option>
                <option value="Super-Cap Gross Negligence Carveouts">Gross Negligence Carveouts</option>
                <option value="Strict Indian Contract Act Compliance">Strict Statutory ICA Compliance</option>
              </select>
            </div>

            {/* Field 4: Statutory Standard */}
            <div style={{
              padding: '10px 14px',
            }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Statutory Benchmark
              </label>
              <select
                value={statutoryStandard}
                onChange={(e) => setStatutoryStandard(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="DPDP Act 2023 (72h Notice)">DPDP Act 2023 (72h Notice)</option>
                <option value="ICA 1872 (Section 27 Non-Compete Void)">Section 27 ICA 1872 (Void Non-Compete)</option>
                <option value="Arbitration Act 1996 (Sole Arbitrator)">Arbitration Act 1996 (Indian Seat)</option>
                <option value="CGST Act 2017 & TDS (Form 16A)">CGST Act 2017 & TDS Invoicing</option>
              </select>
            </div>

            {/* Action Button */}
            <div style={{ padding: '4px' }}>
              <button
                onClick={handleHeroAction}
                className="btn-primary"
                style={{
                  height: '52px',
                  padding: '0 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{currentUser ? 'Upload Agreement' : 'Client Access'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '16px' }}>
            Multi-pass OpenXML redlining · SHA-256 checksum audit trail · Zero model training on client documents
          </div>
        </div>
      </section>

      {/* SECTION 1: PHILOSOPHY & REASONING (Inspired by Aerodynamics "Over Aerodynamics") */}
      <section id="architecture" style={{
        padding: '100px 40px',
        maxWidth: '1180px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow-luxury" style={{ marginBottom: '12px' }}>
              01 / Institutional Governance
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              AutoAudit delivers legal rigor and deterministic compliance at the <em className="editorial-italic" style={{ color: 'var(--brand-accent)' }}>highest executive standard.</em>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              Modern commercial transactions demand uncompromising accuracy. Generic generative chatbots hallucinate clause interpretations, invent nonexistent statutory precedents, and corrupt native document XML hierarchies.
            </p>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              AutoAudit replaces stochastic uncertainty with codified corporate playbooks, deterministic rule engines, and native Microsoft Word tracked changes. The result is an audit trail that in-house counsel can defend before boards, auditors, and opposing counsel.
            </p>
            <div style={{ display: 'flex', gap: '28px', marginTop: '10px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>100%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>OpenXML Fidelity</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '28px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>12</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Standard Clause Categories</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '28px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-accent)', letterSpacing: '-0.02em' }}>0.0%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Data Retention Leakage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE 4 PILLARS (Glassmorphic Luxury Cards) */}
      <section id="pillars" style={{
        background: 'var(--bg-canvas)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '100px 40px',
      }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div className="eyebrow-luxury" style={{ marginBottom: '10px' }}>
              02 / Architectural Pillars
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              Engineered for Enterprise Risk Control
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0 auto' }}>
              Four non-negotiable architectural guarantees built into the core review engine.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              {
                num: '01',
                title: 'Codified Playbooks',
                icon: Sliders,
                desc: 'Audits adhere to your organization’s codified fallback, preferred, and unacceptable legal positions—not generic AI opinion.',
              },
              {
                num: '02',
                title: 'Native OpenXML',
                icon: FileCheck,
                desc: 'Redlines are injected directly as genuine Word tracked changes (w:ins / w:del), preserving tables, headers, and document styles.',
              },
              {
                num: '03',
                title: 'Deterministic Risk',
                icon: Scale,
                desc: 'Mathematically scored risk exposure across High, Medium, and Low bands with instant policy citations and statutory grounding.',
              },
              {
                num: '04',
                title: 'Sovereign Isolation',
                icon: Lock,
                desc: 'Stateless JWT tokens, HTTP-Only SameSite=Lax cookie boundaries, and complete isolation of enterprise document memory.',
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.num}
                  className="card-panel"
                  style={{
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{p.num}</span>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--brand-accent-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-accent)',
                      }}>
                        <Icon size={16} />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {p.title}
                    </h3>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: 5-STAGE AUDIT PIPELINE */}
      <section id="pipeline" style={{ padding: '100px 40px', maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div className="eyebrow-luxury" style={{ marginBottom: '10px' }}>
            03 / Verification Engine
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            The 5-Stage Audit Pipeline
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '8px' }}>
            End-to-end procedural rigor from raw document ingestion to executive Word tracked redlines.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {[
            {
              step: 'Step 01',
              title: 'Ingestion & DOM',
              desc: 'PyMuPDF and python-docx parse text and structural layout, generating exact block coordinates and style trees.',
            },
            {
              step: 'Step 02',
              title: 'Clause Segmentation',
              desc: 'Identifies clause boundaries and tags sections against 12 standard legal categories with confidence scoring.',
            },
            {
              step: 'Step 03',
              title: 'Policy RAG Matching',
              desc: 'Retriever indexes corporate policy playbooks, matching incoming obligations to organizational standards.',
            },
            {
              step: 'Step 04',
              title: 'Risk Engine',
              desc: 'Flags missing protections, statutory violations, and onerous terms; computes 0–100 risk score against threshold.',
            },
            {
              step: 'Step 05',
              title: 'OpenXML Redlining',
              desc: 'Generates Word tracked changes (w:ins / w:del) with explanatory legal comments ready for counterparty negotiation.',
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: '8px' }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                {s.title}
              </h3>
              <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: SECURITY & DATA BOUNDARIES */}
      <section id="security" style={{
        background: '#0a1019',
        color: '#ffffff',
        padding: '100px 40px',
      }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34d399', marginBottom: '10px' }}>
                04 / Security & Governance
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                Sovereign security architecture.<br />
                <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>Zero external model training.</span>
              </h2>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.7)', marginTop: '18px' }}>
                AutoAudit implements bank-grade operational security designed to satisfy stringent corporate IT and information governance requirements.
              </p>

              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  'Stateless JWT tokens signed with HS256 with 60-minute automated rotation',
                  'HTTP-Only, SameSite=Lax cookie storage preventing cross-site scripting (XSS)',
                  'Active session correlation ID and forensic audit event trails',
                  '12-round salted bcrypt password hashing and PBKDF2 key derivation',
                  'Ephemeral processing containers with immediate file unlink upon review completion',
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel-dark" style={{ padding: '36px', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Key size={18} color="#34d399" />
                <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Cryptographic Session Spec
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Access Token Expiry</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>60 Minutes (HttpOnly Cookie)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Refresh Token Rotation</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>7 Days (Persistent Cookie)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Document Encryption</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>AES-256 at Rest / TLS 1.3 in Flight</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Integrity Verification</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>SHA-256 Checksum on Ingest</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Model Governance</span>
                  <span style={{ fontWeight: 600, color: '#34d399' }}>Zero Retraining Policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: FAQ ACCORDION */}
      <section id="faq" style={{ padding: '100px 40px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div className="eyebrow-luxury" style={{ marginBottom: '10px' }}>
            05 / Frequently Asked Questions
          </div>
          <h2 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
            Institutional Inquiries
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            {
              q: 'How does AutoAudit generate genuine Microsoft Word tracked changes?',
              a: 'AutoAudit modifies the underlying OpenXML zip container directly using python-docx and lxml. It injects native <w:ins> and <w:del> tags with reviewer metadata and timestamp stamps. When downloaded and opened in Word, legal counsel can use standard "Accept" or "Reject" buttons with 100% style fidelity.',
            },
            {
              q: 'Are client agreements or company policies used to train AI models?',
              a: 'Never. AutoAudit operates under strict confidentiality protocols. Documents are held in isolated memory for parsing, evaluated against tenant-specific database playbooks, and scrubbed upon completion. No third-party LLM training is ever performed on user data.',
            },
            {
              q: 'How does AutoAudit enforce custom corporate playbooks?',
              a: 'Organizations can define preferred, acceptable fallback, and strictly unacceptable positions across 12 legal categories in the Settings portal. The risk engine mathematically evaluates incoming contracts against these rules and flags deviations with specific clause citations.',
            },
            {
              q: 'Can AutoAudit handle scanned PDFs and OCR?',
              a: 'AutoAudit uses PyMuPDF (fitz) for high-performance layout and vector text extraction. Documents with embedded text are parsed immediately with font sizing and layout bounding boxes preserved.',
            },
            {
              q: 'Does AutoAudit provide legal advice?',
              a: 'AutoAudit is an automated legal decision support platform designed to assist qualified attorneys, compliance officers, and procurement managers. It accelerates review and identifies contractual risk but does not establish an attorney-client relationship or substitute for professional legal review.',
            },
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </button>
                {isOpen && (
                  <div style={{
                    padding: '0 22px 18px 22px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid var(--bg-subtle)',
                    paddingTop: '12px',
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL EXECUTIVE CTA */}
      <section style={{
        padding: '80px 40px',
        maxWidth: '1040px',
        margin: '0 auto 60px auto',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #090e17 0%, #111a28 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '60px 48px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(5, 150, 105, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', marginBottom: '16px' }}>
            Ready to initiate contract review?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '580px', margin: '0 auto 36px auto' }}>
            Access your sovereign enterprise portal to upload draft agreements, inspect corporate policy playbooks, and export native Word tracked changes.
          </p>

          <button
            onClick={currentUser ? onLaunchWorkspace : onOpenAuth}
            className="btn-primary"
            style={{
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: 'var(--radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>{currentUser ? 'Enter Review Dashboard' : 'Access Client Portal'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};
