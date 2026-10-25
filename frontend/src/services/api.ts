const API_BASE = '/api/v1';

export interface ClauseAttribute {
  id: string;
  attribute_name: string;
  value_text: string;
  value_numeric?: number;
  confidence: number;
  evidence_text?: string;
}

export interface Clause {
  id: string;
  clause_number: string;
  heading: string;
  text: string;
  category: string;
  confidence: number;
  page_start: number;
  page_end: number;
  char_start: number;
  char_end: number;
  attributes: ClauseAttribute[];
}

export interface RevisionProposal {
  id: string;
  original_text: string;
  proposed_text: string;
  rationale: string;
  status: string;
  generated_at: string;
}

export interface ReviewDecision {
  id: string;
  decision: string;
  reviewer: string;
  notes?: string;
  modified_text?: string;
  created_at: string;
}

export interface Finding {
  id: string;
  contract_id: string;
  clause_id: string;
  clause_heading?: string;
  clause_category?: string;
  clause_number?: string;
  finding_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  risk_score: number;
  explanation: string;
  evidence: string;
  policy_reference: string;
  confidence: number;
  status: string;
  created_at: string;
  proposal?: RevisionProposal;
  decision?: ReviewDecision;
}

export interface Contract {
  id: string;
  title: string;
  counterparty?: string;
  contract_type: string;
  status: 'PROCESSING' | 'NEEDS_REVIEW' | 'REVIEWED' | 'FAILED';
  risk_score: number;
  risk_band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number;
  created_at: string;
  updated_at: string;
  findings_count: number;
  clauses_count: number;
}

export interface ContractDetail extends Contract {
  clauses: Clause[];
  findings: Finding[];
}

export interface JobStatus {
  job_id: string;
  contract_id: string;
  status: string;
  progress_percent: number;
  current_stage: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface PolicyRule {
  id: string;
  clause_category: string;
  rule_name: string;
  preferred_position: string;
  fallback_position: string;
  unacceptable_position: string;
  severity: string;
  policy_reference: string;
  rationale: string;
}

export interface PolicyPlaybook {
  id: string;
  name: string;
  description: string;
  version: string;
  is_default: boolean;
  created_at: string;
  rules: PolicyRule[];
}

export interface Organization {
  id: string;
  name: string;
  legal_entity_name: string;
  primary_jurisdiction: string;
  risk_threshold_high: number;
  risk_threshold_medium: number;
  default_playbook_id: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  organization_name?: string;
}

export interface PolicyDocument {
  id: string;
  organization_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  checksum_sha256: string;
  chunk_count: number;
  created_at: string;
}

export interface PolicyDocumentChunk {
  id: string;
  policy_document_id: string;
  chunk_index: number;
  section_heading: string;
  content: string;
  category_tag?: string;
  page_number: number;
}

export interface SampleContractManifestItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  title: string;
  file_name: string;
  relative_path: string;
  file_type: string;
  contract_type: string;
  counterparty: string;
  expected_risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expected_score_range: string;
  pages: number;
  key_deviations: string[];
  description: string;
}

export interface SessionInfo {
  authenticated: boolean;
  session_id: string;
  last_active: string;
  tenant: string;
  detected_cookies: string[];
  has_access_token_cookie: boolean;
  has_refresh_token_cookie: boolean;
  access_token_expires_minutes: number;
  refresh_token_expires_days: number;
  client_ip: string;
  user?: User | null;
}

let isRefreshing = false;

// Helper with credentials included (cookies) and token fallback + auto-refresh
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('autoaudit_access_token');
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send and receive HTTP-only cookies
  });

  // Silent automatic refresh if 401 unauthorized and not already calling auth routes
  if (
    response.status === 401 &&
    !url.includes('/auth/login') &&
    !url.includes('/auth/refresh') &&
    !url.includes('/auth/register') &&
    !isRefreshing
  ) {
    try {
      isRefreshing = true;
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          localStorage.setItem('autoaudit_access_token', refreshData.access_token);
          headers.set('Authorization', `Bearer ${refreshData.access_token}`);
          // Retry original request
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        }
      }
    } catch {
      // Refresh failed
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

export const api = {
  // ------------------- Authentication & Session -------------------
  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const res = await fetchWithAuth(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. Invalid credentials.');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('autoaudit_access_token', data.access_token);
    }
    return data;
  },

  async register(registerData: {
    email: string;
    password: string;
    full_name: string;
    organization_name?: string;
    role?: string;
  }): Promise<{ access_token: string; refresh_token: string; user: User }> {
    const res = await fetchWithAuth(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed.');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('autoaudit_access_token', data.access_token);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE}/auth/logout`, { method: 'POST' });
    } finally {
      localStorage.removeItem('autoaudit_access_token');
    }
  },

  async getMe(): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async getSessionInfo(): Promise<SessionInfo> {
    const res = await fetchWithAuth(`${API_BASE}/auth/session`);
    if (!res.ok) throw new Error('Failed to retrieve session info');
    return res.json();
  },

  async updateProfile(profileData: { full_name?: string; email?: string }): Promise<User> {
    const res = await fetchWithAuth(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update password');
    }
  },

  // ------------------- Contracts -------------------
  async getContracts(status?: string, search?: string): Promise<Contract[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const res = await fetchWithAuth(`${API_BASE}/contracts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
  },

  async getContractDetail(id: string): Promise<ContractDetail> {
    const res = await fetchWithAuth(`${API_BASE}/contracts/${id}`);
    if (!res.ok) throw new Error('Failed to fetch contract details');
    return res.json();
  },

  async deleteContract(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/contracts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete contract');
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetchWithAuth(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job status');
    return res.json();
  },

  async uploadContract(file: File, title?: string, counterparty?: string): Promise<{ contract_id: string; job_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (counterparty) formData.append('counterparty', counterparty);

    const res = await fetchWithAuth(`${API_BASE}/contracts/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getSamplesManifest(): Promise<SampleContractManifestItem[]> {
    const res = await fetchWithAuth(`${API_BASE}/contracts/samples/manifest`);
    if (!res.ok) throw new Error('Failed to load sample contracts manifest');
    const data = await res.json();
    return data.manifest || [];
  },

  async loadSampleContract(sampleId: string, playbookId?: string): Promise<{
    contract_id: string;
    job_id: string;
    title: string;
    sample: SampleContractManifestItem;
  }> {
    const res = await fetchWithAuth(`${API_BASE}/contracts/samples/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_id: sampleId, playbook_id: playbookId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load sample contract');
    }
    return res.json();
  },

  async submitDecision(
    findingId: string,
    decision: 'ACCEPTED' | 'REJECTED' | 'MODIFIED',
    reviewer: string,
    notes?: string,
    modifiedText?: string
  ): Promise<ReviewDecision> {
    const res = await fetchWithAuth(`${API_BASE}/findings/${findingId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reviewer, notes, modified_text: modifiedText }),
    });
    if (!res.ok) throw new Error('Failed to submit decision');
    return res.json();
  },

  // ------------------- Playbooks & Rules -------------------
  async getPlaybooks(): Promise<PolicyPlaybook[]> {
    const res = await fetchWithAuth(`${API_BASE}/playbooks`);
    if (!res.ok) throw new Error('Failed to fetch playbooks');
    return res.json();
  },

  async updatePlaybookRule(
    playbookId: string,
    ruleId: string,
    updateData: Partial<PolicyRule>
  ): Promise<PolicyRule> {
    const res = await fetchWithAuth(`${API_BASE}/playbooks/${playbookId}/rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) throw new Error('Failed to update playbook rule');
    return res.json();
  },

  // ------------------- Organization -------------------
  async getOrganization(): Promise<Organization> {
    const res = await fetchWithAuth(`${API_BASE}/organization`);
    if (!res.ok) throw new Error('Failed to fetch organization profile');
    return res.json();
  },

  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const res = await fetchWithAuth(`${API_BASE}/organization`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update organization profile');
    return res.json();
  },

  // ------------------- Policy Knowledgebase (RAG) -------------------
  async uploadPolicyDocument(file: File, title?: string): Promise<PolicyDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetchWithAuth(`${API_BASE}/policy-docs/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload policy document');
    }
    return res.json();
  },

  async getPolicyDocuments(): Promise<PolicyDocument[]> {
    const res = await fetchWithAuth(`${API_BASE}/policy-docs`);
    if (!res.ok) throw new Error('Failed to fetch policy documents');
    return res.json();
  },

  async deletePolicyDocument(docId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/policy-docs/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete policy document');
  },

  async getPolicyDocumentChunks(docId: string): Promise<PolicyDocumentChunk[]> {
    const res = await fetchWithAuth(`${API_BASE}/policy-docs/${docId}/chunks`);
    if (!res.ok) throw new Error('Failed to fetch document chunks');
    return res.json();
  },

  getRedlineUrl(contractId: string): string {
    return `${API_BASE}/contracts/${contractId}/redline`;
  },

  getReportUrl(contractId: string, format = 'html'): string {
    return `${API_BASE}/contracts/${contractId}/report?format=${format}`;
  },
};
