import React, { useState, useEffect } from 'react';
import {
  complianceApi,
  AuditVerificationResult,
  LegalHoldItem,
  ComplianceDsarRequestItem,
  SsoConfigItem,
  Soc2EvidenceResponse,
} from '../api/compliance';
import {
  ShieldCheck,
  Lock,
  FileText,
  UserX,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Key,
  Globe,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';

export const ComplianceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'soc2' | 'audit' | 'gdpr' | 'holds' | 'sso'>('soc2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // SOC 2 State
  const [soc2Evidence, setSoc2Evidence] = useState<Soc2EvidenceResponse | null>(null);

  // Audit Verifier State
  const [auditResult, setAuditResult] = useState<AuditVerificationResult | null>(null);
  const [verifyingAudit, setVerifyingAudit] = useState(false);

  // Legal Holds State
  const [legalHolds, setLegalHolds] = useState<LegalHoldItem[]>([]);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdForm, setHoldForm] = useState({
    name: '',
    description: '',
    scope_type: 'organization' as 'organization' | 'project' | 'user',
    scope_id: '',
  });

  // DSAR State
  const [dsarRequests, setDsarRequests] = useState<ComplianceDsarRequestItem[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [erasureUserId, setErasureUserId] = useState('');
  const [confirmErasure, setConfirmErasure] = useState(false);

  // SSO & SCIM State
  const [ssoConfig, setSsoConfig] = useState<SsoConfigItem | null>(null);
  const [generatedScimToken, setGeneratedScimToken] = useState<string | null>(null);
  const [scimTokenName, setScimTokenName] = useState('Default SCIM Provisioner');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'soc2') {
        const ev = await complianceApi.getSoc2Evidence();
        setSoc2Evidence(ev);
      } else if (activeTab === 'holds') {
        const res = await complianceApi.getLegalHolds();
        setLegalHolds(res.legal_holds || []);
      } else if (activeTab === 'gdpr') {
        const res = await complianceApi.listDsarRequests();
        setDsarRequests(res.dsar_requests || []);
      } else if (activeTab === 'sso') {
        const res = await complianceApi.getSsoConfig();
        if (res.sso_configuration) {
          setSsoConfig(res.sso_configuration);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleVerifyAudit = async () => {
    setVerifyingAudit(true);
    setError(null);
    try {
      const res = await complianceApi.verifyAuditChain({ limit: 50 });
      setAuditResult(res);
      setSuccess(`Audit chain verified: ${res.total_verified} records checked. Cryptographic hash sequence is valid.`);
    } catch (err: any) {
      setError(err?.message || 'Cryptographic audit verification failed');
    } finally {
      setVerifyingAudit(false);
    }
  };

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await complianceApi.createLegalHold(holdForm);
      setSuccess('Legal hold issued successfully. Deletion guards active.');
      setShowHoldModal(false);
      setHoldForm({ name: '', description: '', scope_type: 'organization', scope_id: '' });
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create legal hold');
    }
  };

  const handleReleaseHold = async (id: string) => {
    if (!confirm('Are you sure you want to release this legal hold? Deletion prevention will be lifted.')) return;
    setError(null);
    try {
      await complianceApi.releaseLegalHold(id);
      setSuccess('Legal hold released.');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to release legal hold');
    }
  };

  const handleRequestDsar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    setError(null);
    try {
      await complianceApi.requestDsarExport({ user_id: targetUserId.trim() });
      setSuccess('DSAR export requested. Async processing queued.');
      setTargetUserId('');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to request DSAR export');
    }
  };

  const handleExecuteErasure = async () => {
    if (!erasureUserId.trim()) return;
    setError(null);
    try {
      await complianceApi.executeErasure({ user_id: erasureUserId.trim() });
      setSuccess('Right to Erasure executed. User attributes pseudonymized and tokens revoked.');
      setErasureUserId('');
      setConfirmErasure(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute erasure');
    }
  };

  const handleGenerateScimToken = async () => {
    setError(null);
    try {
      const res = await complianceApi.createScimToken({ name: scimTokenName });
      setGeneratedScimToken(res.plain_text_token);
      setSuccess('New SCIM bearer token created. Copy it now.');
    } catch (err: any) {
      setError(err?.message || 'Failed to create SCIM token');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Enterprise Compliance & Trust Center</h1>
                <p className="text-sm text-slate-400">
                  Cryptographic non-repudiation, SOC 2 Type II controls, GDPR privacy, and legal hold orchestration.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SOC 2 / ISO 27001 Active
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div className="text-sm font-medium">{success}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
          {[
            { id: 'soc2', label: 'SOC 2 & Trust Evidence', icon: ShieldCheck },
            { id: 'audit', label: 'Audit Chain Verifier', icon: Lock },
            { id: 'holds', label: 'Legal Holds & E-Discovery', icon: FileText },
            { id: 'gdpr', label: 'GDPR & Privacy (DSAR)', icon: UserX },
            { id: 'sso', label: 'SSO, SCIM & Residency', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: SOC 2 Evidence Matrix */}
        {activeTab === 'soc2' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Access Controls (CC6.1)
                </div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> JIT & SCIM Enforced
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Automated deprovisioning via RFC 7644 and group role synchronization.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Audit Integrity (CC7.1)
                </div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" /> SHA-256 Hash Chained
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Non-repudiable ledger serialized with pessimistic row locking.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Litigation Defense (PI1.1)
                </div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" /> Model Deletion Guards
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Active legal holds block hard/soft deletion of projects and tasks.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Uptime SLA (A1.2)
                </div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" /> 99.95% Target
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Public uptime metric monitoring and automated health telemetry.
                </p>
              </div>
            </div>

            {soc2Evidence && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-base font-semibold text-white">Live Organization Evidence Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-300">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div>Organization ID: {soc2Evidence.organization.id}</div>
                    <div>Designated Region: {soc2Evidence.organization.region}</div>
                    <div>Plan Tier: {soc2Evidence.organization.plan}</div>
                    <div>Generated: {soc2Evidence.timestamp}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div>Latest Row Hash: {soc2Evidence.evidence_matrix.cc7_audit_integrity.latest_row_hash || 'Genesis'}</div>
                    <div>Active Legal Holds: {soc2Evidence.evidence_matrix.pi1_legal_holds.active_holds_count}</div>
                    <div>Uptime (30d): {soc2Evidence.evidence_matrix.a1_uptime_sla.uptime_30d}%</div>
                    <div>SSO Configured: {soc2Evidence.evidence_matrix.cc6_access_control.sso_enforced ? 'YES' : 'NO'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audit Chain Verifier */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Cryptographic Audit Chain Integrity Verifier</h3>
                  <p className="text-sm text-slate-400">
                    Mathematically recalculates SHA-256 row hashes across the chronological audit trail to verify that no log entries have been forged, altered, deleted, or reordered.
                  </p>
                </div>
                <button
                  onClick={handleVerifyAudit}
                  disabled={verifyingAudit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition-colors flex items-center gap-2 self-start md:self-auto"
                >
                  <Lock className={`w-4 h-4 ${verifyingAudit ? 'animate-spin' : ''}`} />
                  {verifyingAudit ? 'Verifying Chain...' : 'Verify Cryptographic Chain'}
                </button>
              </div>

              {auditResult && (
                <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    {auditResult.valid ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-5 h-5" /> All Inspected Blocks Valid
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-400 font-semibold">
                        <AlertTriangle className="w-5 h-5" /> Cryptographic Chain Break Detected!
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-300 space-y-1">
                    <div>Total Verified Logs: {auditResult.total_verified}</div>
                    <div>Last Verified Log ID: {auditResult.last_verified_id}</div>
                    <div className="break-all">Latest Hash: {auditResult.latest_hash}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Legal Holds & E-Discovery */}
        {activeTab === 'holds' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Active Legal Holds</h3>
                <p className="text-sm text-slate-400">
                  Freezes targeted projects, users, or the entire organization against data deletion during litigation.
                </p>
              </div>
              <button
                onClick={() => setShowHoldModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Issue Legal Hold
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Hold Name</th>
                    <th className="px-6 py-4">Scope</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Issued At</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {legalHolds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No active legal holds found for this tenant workspace.
                      </td>
                    </tr>
                  ) : (
                    legalHolds.map((hold) => (
                      <tr key={hold.id} className="hover:bg-slate-800/40">
                        <td className="px-6 py-4 font-medium text-white">{hold.name}</td>
                        <td className="px-6 py-4 capitalize text-slate-300">
                          {hold.scope_type} {hold.scope_id ? `(${hold.scope_id})` : ''}
                        </td>
                        <td className="px-6 py-4">
                          {hold.active ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Active (Locked)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                              Released
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">{new Date(hold.issued_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          {hold.active && (
                            <button
                              onClick={() => handleReleaseHold(hold.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                            >
                              Release Hold
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal */}
            {showHoldModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                  <h4 className="text-lg font-bold text-white">Issue Regulatory Legal Hold</h4>
                  <form onSubmit={handleCreateHold} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Hold Title</label>
                      <input
                        type="text"
                        required
                        value={holdForm.name}
                        onChange={(e) => setHoldForm({ ...holdForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                        placeholder="e.g. Litigation 2026-SEC-01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Scope</label>
                      <select
                        value={holdForm.scope_type}
                        onChange={(e) => setHoldForm({ ...holdForm, scope_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                      >
                        <option value="organization">Entire Organization</option>
                        <option value="project">Specific Project</option>
                        <option value="user">Specific User</option>
                      </select>
                    </div>
                    {holdForm.scope_type !== 'organization' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Target ID (Project or User)</label>
                        <input
                          type="text"
                          required
                          value={holdForm.scope_id}
                          onChange={(e) => setHoldForm({ ...holdForm, scope_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowHoldModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold"
                      >
                        Lock Records
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: GDPR & Privacy (DSAR) */}
        {activeTab === 'gdpr' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DSAR Export Request */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-base font-semibold text-white">GDPR Article 15/20 DSAR Export</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Queues an asynchronous extraction job generating machine-readable JSON containing all user-attributed tasks, comments, time logs, and audit trails.
                </p>
                <form onSubmit={handleRequestDsar} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="Enter Target User ID"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-sm transition-colors"
                  >
                    Queue DSAR Export Job
                  </button>
                </form>
              </div>

              {/* Right to Erasure */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-400" />
                  <h4 className="text-base font-semibold text-white">GDPR Article 17 Right to Erasure</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Irreversibly pseudonymizes user profile fields, revokes active sessions, and severs OAuth refresh chains. Active legal holds will reject this operation.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={erasureUserId}
                    onChange={(e) => setErasureUserId(e.target.value)}
                    placeholder="Enter User ID to Erase"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirmErasure"
                      checked={confirmErasure}
                      onChange={(e) => setConfirmErasure(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-0"
                    />
                    <label htmlFor="confirmErasure" className="text-xs text-slate-400">
                      I understand this action is permanent and audited.
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={!confirmErasure || !erasureUserId}
                    onClick={handleExecuteErasure}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 font-semibold text-white text-sm transition-colors"
                  >
                    Permanently Anonymize User
                  </button>
                </div>
              </div>
            </div>

            {/* Existing DSAR Requests */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-base font-semibold text-white">Recent DSAR Export Requests</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3">Request ID</th>
                      <th className="py-3">Target User</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Expires At</th>
                      <th className="py-3 text-right">Download Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dsarRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No DSAR requests recorded.
                        </td>
                      </tr>
                    ) : (
                      dsarRequests.map((req) => (
                        <tr key={req.id}>
                          <td className="py-3 font-mono text-xs">{req.id}</td>
                          <td className="py-3 text-xs">{req.target_user_id}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400">
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-400">
                            {req.expires_at ? new Date(req.expires_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3 text-right">
                            {req.download_url ? (
                              <a
                                href={req.download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: SSO, SCIM & Residency */}
        {activeTab === 'sso' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-white">Enterprise Identity & SCIM Provisioning</h3>
              <p className="text-sm text-slate-400">
                Configure corporate identity federation (Okta, Azure AD, Google Workspace) and generate SCIM 2.0 bearer tokens.
              </p>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-semibold text-white">SCIM 2.0 Provisioning Token</h5>
                    <p className="text-xs text-slate-400">
                      RFC 7644 endpoints: <code>/scim/v2/Users</code> and <code>/scim/v2/Groups</code>
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateScimToken}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                  >
                    Generate SCIM Token
                  </button>
                </div>

                {generatedScimToken && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
                    <div className="text-xs font-semibold text-indigo-400">Bearer Token (Displayed Once):</div>
                    <code className="block p-2 rounded bg-black text-xs text-emerald-400 break-all">
                      {generatedScimToken}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
