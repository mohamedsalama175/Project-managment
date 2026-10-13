import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Shield,
  Plug,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Layers,
  FileUp,
  FileJson,
  FileSpreadsheet,
  Code,
  ArrowRight,
  Lock,
  Activity,
  Clock,
  Database,
  Radio,
  FileCode,
  MessageSquare,
  GitCommit,
  CheckCircle,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ClayButton } from '../components/common/ClayButton';
import { ClayCard } from '../components/common/ClayCard';
import { ClayBadge } from '../components/common/ClayBadge';
import { Modal } from '../components/common/Modal';
import {
  integrationsApi,
  ApiKey,
  OAuthClient,
  WebhookEndpoint,
  WebhookDelivery,
  ImportBatch,
} from '../api/integrations';

type TabType = 'api_keys' | 'webhooks' | 'oauth' | 'connectors' | 'importers';

export const IntegrationsView: React.FC = () => {
  const { projects, activeProjectId } = useProjectStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('api_keys');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // --- API Keys State ---
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['*']);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number | null>(90);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // --- Webhooks State ---
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [selectedWebhookForDeliveries, setSelectedWebhookForDeliveries] = useState<string | null>(null);
  const [isNewWebhookModalOpen, setIsNewWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([
    'task.created',
    'task.updated',
    'project.archived',
  ]);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [viewingPayload, setViewingPayload] = useState<WebhookDelivery | null>(null);

  // --- OAuth Apps State ---
  const [oauthClients, setOAuthClients] = useState<OAuthClient[]>([]);
  const [isNewOAuthModalOpen, setIsNewOAuthModalOpen] = useState(false);
  const [oauthName, setOAuthName] = useState('');
  const [oauthRedirectUris, setOAuthRedirectUris] = useState('');
  const [oauthScopes, setOAuthScopes] = useState<string[]>(['projects:read', 'tasks:read']);
  const [oauthIsConfidential, setOAuthIsConfidential] = useState(true);
  const [createdOAuthSecret, setCreatedOAuthSecret] = useState<string | null>(null);

  // --- Connectors State ---
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');

  // --- Importer State ---
  const [selectedProjectForImport, setSelectedProjectForImport] = useState<string>(
    activeProjectId || projects[0]?.id || ''
  );
  const [importProvider, setImportProvider] = useState<'jira' | 'asana' | 'monday' | 'ms_project'>('jira');
  const [importContent, setImportContent] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text: string, onCopied: () => void) => {
    navigator.clipboard.writeText(text);
    onCopied();
    showToast('Copied to clipboard');
  };

  // --- Data Fetching ---
  useEffect(() => {
    if (activeTab === 'api_keys') {
      loadApiKeys();
    } else if (activeTab === 'webhooks') {
      loadWebhooks();
      loadDeliveries();
    } else if (activeTab === 'oauth') {
      loadOAuthClients();
    } else if (activeTab === 'connectors') {
      loadConnectorsStatus();
    } else if (activeTab === 'importers') {
      loadImportBatches();
    }
  }, [activeTab]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.getApiKeys();
      setApiKeys(res.api_keys || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.getWebhooks();
      setWebhooks(res.webhook_endpoints || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (endpointId?: string) => {
    try {
      const res = await integrationsApi.getWebhookDeliveries(
        endpointId ? { webhook_endpoint_id: endpointId } : undefined
      );
      setDeliveries(res.data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadOAuthClients = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.getOAuthClients();
      setOAuthClients(res.oauth_clients || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to load OAuth apps', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectorsStatus = async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        integrationsApi.getSlackStatus().catch(() => ({ connected: false, connection: undefined })),
        integrationsApi.getTeamsStatus().catch(() => ({ connected: false, connection: undefined })),
      ]);
      setSlackConnected(sRes.connected);
      if (sRes.connection?.settings?.channel) {
        setSlackChannel(sRes.connection.settings.channel);
      }
      setTeamsConnected(tRes.connected);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadImportBatches = async () => {
    setLoading(true);
    try {
      const res = await integrationsApi.getImportBatches();
      setImportBatches(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- API Key Handlers ---
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    let expiresAt: string | null = null;
    if (newKeyExpiryDays) {
      const d = new Date();
      d.setDate(d.getDate() + newKeyExpiryDays);
      expiresAt = d.toISOString();
    }

    try {
      const res = await integrationsApi.createApiKey({
        name: newKeyName,
        scopes: newKeyScopes,
        rate_limit_per_minute: newKeyRateLimit,
        expires_at: expiresAt,
      });
      setCreatedRawKey(res.raw_key);
      setApiKeys((prev) => [res.api_key, ...prev]);
      setNewKeyName('');
      showToast('API key generated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to create API key', 'error');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to permanently revoke this API key?')) return;
    try {
      await integrationsApi.revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      showToast('API key revoked');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke key', 'error');
    }
  };

  // --- Webhook Handlers ---
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || webhookEvents.length === 0) return;

    try {
      const res = await integrationsApi.createWebhook({
        url: webhookUrl,
        events: webhookEvents,
        description: webhookDesc,
      });
      setCreatedWebhookSecret(res.secret);
      setWebhooks((prev) => [res.webhook_endpoint, ...prev]);
      setWebhookUrl('');
      setWebhookDesc('');
      showToast('Webhook registered successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to create webhook', 'error');
    }
  };

  const handleToggleWebhookActive = async (wh: WebhookEndpoint) => {
    try {
      const nextActive = !wh.active;
      const res = await integrationsApi.updateWebhook(wh.id, { active: nextActive });
      setWebhooks((prev) => prev.map((item) => (item.id === wh.id ? res.webhook_endpoint : item)));
      showToast(`Webhook ${nextActive ? 'activated' : 'paused'}`);
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return;
    try {
      await integrationsApi.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      showToast('Webhook deleted');
    } catch (err: any) {
      showToast(err.message || 'Deletion failed', 'error');
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await integrationsApi.testWebhook(id);
      showToast(`Test ping dispatched (Attempt #${res.delivery?.attempt || 1})`);
      loadDeliveries();
    } catch (err: any) {
      showToast(err.message || 'Test ping failed', 'error');
    }
  };

  const handleRotateSecret = async (id: string) => {
    if (!confirm('Rotate this signing secret? The previous secret will be immediately invalidated.')) return;
    try {
      const res = await integrationsApi.rotateWebhookSecret(id);
      setCreatedWebhookSecret(res.new_secret);
      showToast('Secret rotated successfully');
    } catch (err: any) {
      showToast(err.message || 'Secret rotation failed', 'error');
    }
  };

  const handleRetryDelivery = async (id: string) => {
    try {
      await integrationsApi.retryWebhookDelivery(id);
      showToast('Delivery queued for retry');
      loadDeliveries();
    } catch (err: any) {
      showToast(err.message || 'Retry failed', 'error');
    }
  };

  // --- OAuth Handlers ---
  const handleCreateOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthName.trim() || !oauthRedirectUris.trim()) return;

    const uris = oauthRedirectUris
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      const res = await integrationsApi.createOAuthClient({
        name: oauthName,
        redirect_uris: uris,
        scopes: oauthScopes,
        is_confidential: oauthIsConfidential,
      });
      if (res.client_secret) {
        setCreatedOAuthSecret(res.client_secret);
      }
      setOAuthClients((prev) => [res.oauth_client, ...prev]);
      setOAuthName('');
      setOAuthRedirectUris('');
      showToast('OAuth App registered');
    } catch (err: any) {
      showToast(err.message || 'Failed to register OAuth app', 'error');
    }
  };

  const handleDeleteOAuth = async (id: string) => {
    if (!confirm('Delete this OAuth application?')) return;
    try {
      await integrationsApi.deleteOAuthClient(id);
      setOAuthClients((prev) => prev.filter((c) => c.id !== id));
      showToast('OAuth app removed');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete OAuth app', 'error');
    }
  };

  // --- Connectors Handlers ---
  const handleConnectSlack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slackWebhookUrl.trim()) return;
    try {
      await integrationsApi.connectSlack({
        webhook_url: slackWebhookUrl,
        channel: slackChannel || undefined,
      });
      setSlackConnected(true);
      setSlackWebhookUrl('');
      showToast('Slack connected successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to connect Slack', 'error');
    }
  };

  const handleDisconnectSlack = async () => {
    try {
      await integrationsApi.disconnectSlack();
      setSlackConnected(false);
      showToast('Slack disconnected');
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect', 'error');
    }
  };

  const handleTestSlack = async () => {
    try {
      await integrationsApi.testSlack();
      showToast('Test notification sent to Slack!');
    } catch (err: any) {
      showToast(err.message || 'Test failed', 'error');
    }
  };

  const handleConnectTeams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamsWebhookUrl.trim()) return;
    try {
      await integrationsApi.connectTeams({ webhook_url: teamsWebhookUrl });
      setTeamsConnected(true);
      setTeamsWebhookUrl('');
      showToast('Microsoft Teams connected successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to connect Teams', 'error');
    }
  };

  const handleDisconnectTeams = async () => {
    try {
      await integrationsApi.disconnectTeams();
      setTeamsConnected(false);
      showToast('Teams disconnected');
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect', 'error');
    }
  };

  const handleTestTeams = async () => {
    try {
      await integrationsApi.testTeams();
      showToast('Test card sent to Microsoft Teams!');
    } catch (err: any) {
      showToast(err.message || 'Test failed', 'error');
    }
  };

  // --- Importer Handlers ---
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForImport) {
      showToast('Please select a target project', 'error');
      return;
    }
    if (!importContent.trim() && !importFile) {
      showToast('Provide raw content or upload an export file', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const res = await integrationsApi.importProject({
        project_id: selectedProjectForImport,
        provider: importProvider,
        content: importContent || undefined,
        file: importFile || undefined,
      });
      showToast(
        `Imported ${res.batch.tasks_count} tasks & ${res.batch.dependencies_count} dependencies with auto-calculated critical path!`
      );
      setImportContent('');
      setImportFile(null);
      loadImportBatches();
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const allAvailableScopes = [
    'projects:read',
    'projects:write',
    'tasks:read',
    'tasks:write',
    'reports:read',
    '*',
  ];

  const allWebhookEventTypes = [
    'task.created',
    'task.updated',
    'task.status_changed',
    'task.deleted',
    'project.created',
    'project.updated',
    'project.archived',
    '*',
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              DELIVEROPS API & INTEGRATIONS
            </span>
            <span className="text-xs text-slate-400 font-medium">Phase 7 Platform Hub</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Integrations, Webhooks & Public REST API v2
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build custom workflows, subscribe to real-time events, connect Slack/Teams/GitHub, or import from Jira, Asana, Monday & MS Project.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-300/50 dark:border-slate-700"
          >
            <Code className="w-4 h-4 text-emerald-500" />
            <span>OpenAPI 3.1 Spec</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-inner">
        {[
          { id: 'api_keys', label: 'API Keys & REST API v2', icon: <Key className="w-4 h-4" /> },
          { id: 'webhooks', label: 'Webhooks & Outbound Logs', icon: <Webhook className="w-4 h-4" /> },
          { id: 'oauth', label: 'OAuth 2.0 Apps (PKCE)', icon: <Shield className="w-4 h-4" /> },
          { id: 'connectors', label: 'Connectors (Slack / Teams / Git)', icon: <Plug className="w-4 h-4" /> },
          { id: 'importers', label: 'Competitor Importers', icon: <Layers className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeTab === t.id
                ? 'clay-card text-emerald-600 dark:text-emerald-400 scale-[1.01]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: API KEYS & REST API V2 */}
      {/* ========================================================================= */}
      {activeTab === 'api_keys' && (
        <div className="space-y-6">
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live API Keys</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authenticate with header <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400">X-API-Key: dops_live_...</code>. Token bucket rate limited.
              </p>
            </div>
            <ClayButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setCreatedRawKey(null);
                setIsNewKeyModalOpen(true);
              }}
            >
              Generate API Key
            </ClayButton>
          </div>

          {/* Keys Table Card */}
          <ClayCard className="overflow-hidden">
            {apiKeys.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Key className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No API Keys Generated</h4>
                <p className="text-xs mt-1">Create an API key to access DeliverOps programmatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Name / Identifier</th>
                      <th className="py-3 px-4">Prefix</th>
                      <th className="py-3 px-4">Scopes</th>
                      <th className="py-3 px-4">Rate Limit</th>
                      <th className="py-3 px-4">Last Used</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">{k.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {k.id.slice(0, 10)}...</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {k.key_prefix}...
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => (
                              <ClayBadge key={s} color={s === '*' ? '#10B981' : '#6366F1'}>
                                {s}
                              </ClayBadge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs">{k.rate_limit_per_minute} req/min</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRevokeApiKey(k.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ClayCard>

          {/* Quick Developer Spec Card */}
          <ClayCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Public REST API v2 Integration Guide
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              DeliverOps v2 endpoints enforce <strong>token-bucket rate limiting</strong>, granular scope authorization, and <strong>mandatory idempotency</strong> on all mutating requests (<code className="font-mono">POST</code>, <code className="font-mono">PUT</code>, <code className="font-mono">DELETE</code>).
            </p>

            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2 border border-slate-800">
              <div className="text-slate-400"># Example mutating request with idempotency key</div>
              <div>
                curl -X POST https://deliverops.io/api/v2/projects \<br />
                &nbsp;&nbsp;-H "X-API-Key: dops_live_YOUR_SECRET_KEY" \<br />
                &nbsp;&nbsp;-H "X-Idempotency-Key: e4a70682-628d-4cb0-9bc2-8089bccefe94" \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '{`{"name": "Apollo Scaling", "budget_amount": 150000}`}'
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Idempotency Guarantee
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Duplicate requests with identical idempotency keys return the cached 2xx response immediately without re-executing business logic.
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Rate Limit Headers
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Every response includes <code className="font-mono">X-RateLimit-Limit</code>, <code className="font-mono">X-RateLimit-Remaining</code>, and <code className="font-mono">Retry-After</code> on 429 status.
                </span>
              </div>
            </div>
          </ClayCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WEBHOOKS & DELIVERIES */}
      {/* ========================================================================= */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Outbound Webhooks</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive signed HMAC-SHA256 HTTP POST payloads (<code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400">DeliverOps-Signature: t=...,v1=...</code>) on system events.
              </p>
            </div>
            <ClayButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setCreatedWebhookSecret(null);
                setIsNewWebhookModalOpen(true);
              }}
            >
              Add Webhook Endpoint
            </ClayButton>
          </div>

          {/* Endpoints List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                <Webhook className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Webhook Endpoints</h4>
                <p className="text-xs mt-1">Register a URL to receive real-time updates.</p>
              </div>
            ) : (
              webhooks.map((w) => (
                <ClayCard key={w.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            w.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                          {w.description || 'DeliverOps Webhook'}
                        </h4>
                      </div>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                        {w.url}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleWebhookActive(w)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-colors ${
                        w.active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {w.active ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {w.events.map((ev) => (
                      <ClayBadge key={ev} color="#10B981" variant="subtle">
                        {ev}
                      </ClayBadge>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Failures: <strong className="text-slate-600 dark:text-slate-300">{w.consecutive_failed_attempts}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestWebhook(w.id)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Send Test Ping"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRotateSecret(w.id)}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Rotate Secret"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWebhookForDeliveries(w.id);
                          loadDeliveries(w.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title="View Deliveries"
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(w.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </ClayCard>
              ))
            )}
          </div>

          {/* Delivery Logs Card */}
          <ClayCard className="overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Delivery Attempts</h3>
              </div>
              {selectedWebhookForDeliveries && (
                <button
                  onClick={() => {
                    setSelectedWebhookForDeliveries(null);
                    loadDeliveries();
                  }}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  Show all endpoints
                </button>
              )}
            </div>

            {deliveries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No webhook delivery attempts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">HTTP Code</th>
                      <th className="py-2.5 px-3">Attempt</th>
                      <th className="py-2.5 px-3">Dispatched At</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {d.event_type}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              d.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : d.status === 'failed'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {d.response_status ? (
                            <span className={d.response_status >= 200 && d.response_status < 300 ? 'text-emerald-500' : 'text-red-500'}>
                              {d.response_status}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">#{d.attempt}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(d.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => setViewingPayload(d)}
                            className="text-xs text-indigo-500 hover:underline"
                          >
                            Payload
                          </button>
                          {d.status !== 'delivered' && (
                            <button
                              onClick={() => handleRetryDelivery(d.id)}
                              className="text-xs text-emerald-500 hover:underline"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ClayCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OAUTH 2.0 APPS (PKCE) */}
      {/* ========================================================================= */}
      {activeTab === 'oauth' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">OAuth 2.0 Applications</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register first-party and third-party integrations with RFC 7636 PKCE Authorization Code flow.
              </p>
            </div>
            <ClayButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setCreatedOAuthSecret(null);
                setIsNewOAuthModalOpen(true);
              }}
            >
              Register Application
            </ClayButton>
          </div>

          <ClayCard className="overflow-hidden">
            {oauthClients.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Shield className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No OAuth Applications</h4>
                <p className="text-xs mt-1">Register an application to authenticate users via OAuth 2.0.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Application</th>
                      <th className="py-3 px-4">Client ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Redirect URIs</th>
                      <th className="py-3 px-4">Scopes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {oauthClients.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">{c.name}</span>
                          <span className="text-[11px] text-slate-400">By: {c.created_by_name || 'Admin'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {c.client_id}
                        </td>
                        <td className="py-3 px-4">
                          <ClayBadge color={c.is_confidential ? '#6366F1' : '#10B981'}>
                            {c.is_confidential ? 'Confidential' : 'Public (PKCE)'}
                          </ClayBadge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {c.redirect_uris.map((u) => (
                              <div key={u} className="font-mono text-xs text-slate-500 truncate max-w-xs">
                                {u}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.scopes.map((s) => (
                              <ClayBadge key={s} color="#10B981" variant="subtle">
                                {s}
                              </ClayBadge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteOAuth(c.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Delete OAuth App"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ClayCard>

          {/* PKCE Spec Card */}
          <ClayCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                OAuth 2.0 with Proof Key for Code Exchange (RFC 7636)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              DeliverOps supports standard authorization code flow with S256 code challenge:
              <br />
              <code className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400 mt-2 inline-block">
                code_challenge = base64url(SHA256(code_verifier))
              </code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  1. /oauth/authorize
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  User authorizes application with client_id, redirect_uri, scope, and code_challenge.
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  2. /oauth/token
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Exchanges authorization code + code_verifier for access and refresh tokens.
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  3. /oauth/revoke
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  RFC 7009 token revocation with automatic refresh token rotation.
                </span>
              </div>
            </div>
          </ClayCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONNECTORS (SLACK / TEAMS / GITHUB) */}
      {/* ========================================================================= */}
      {activeTab === 'connectors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slack Connector Card */}
          <ClayCard className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#4A154B]/10 dark:bg-[#4A154B]/20 flex items-center justify-center text-[#4A154B] dark:text-[#E01E5A]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                    slackConnected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {slackConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Slack Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Post real-time block-kit project notifications, overdue alerts, and financial milestones directly into Slack channels.
                </p>
              </div>

              {slackConnected ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                    <CheckCircle className="w-4 h-4" /> Connected to Incoming Webhook
                  </div>
                  {slackChannel && (
                    <div className="text-slate-500 dark:text-slate-400">
                      Channel: <code className="font-bold text-slate-700 dark:text-slate-200">{slackChannel}</code>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleConnectSlack} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Slack Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Channel Name (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="#general or #project-alerts"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <ClayButton type="submit" variant="primary" size="sm" className="w-full">
                    Connect Slack
                  </ClayButton>
                </form>
              )}
            </div>

            {slackConnected && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <ClayButton size="sm" onClick={handleTestSlack} icon={<Send className="w-3.5 h-3.5" />}>
                  Send Test Ping
                </ClayButton>
                <ClayButton size="sm" variant="danger" onClick={handleDisconnectSlack}>
                  Disconnect
                </ClayButton>
              </div>
            )}
          </ClayCard>

          {/* Microsoft Teams Card */}
          <ClayCard className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#6264A7]/10 dark:bg-[#6264A7]/20 flex items-center justify-center text-[#6264A7]">
                  <Radio className="w-6 h-6" />
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                    teamsConnected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {teamsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Microsoft Teams</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deliver formatted Office 365 MessageCard cards for task dependencies, risk triggers, and critical path updates.
                </p>
              </div>

              {teamsConnected ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                    <CheckCircle className="w-4 h-4" /> Connected to Teams Connector
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectTeams} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Teams Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://outlook.office.com/webhook/..."
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <ClayButton type="submit" variant="primary" size="sm" className="w-full">
                    Connect Teams
                  </ClayButton>
                </form>
              )}
            </div>

            {teamsConnected && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <ClayButton size="sm" onClick={handleTestTeams} icon={<Send className="w-3.5 h-3.5" />}>
                  Send Test Card
                </ClayButton>
                <ClayButton size="sm" variant="danger" onClick={handleDisconnectTeams}>
                  Disconnect
                </ClayButton>
              </div>
            )}
          </ClayCard>

          {/* GitHub Commit Matcher Card */}
          <ClayCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <GitCommit className="w-6 h-6" />
              </div>
              <ClayBadge color="#10B981">Auto-Linked</ClayBadge>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">GitHub Push Webhook</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Link code commits automatically to tasks by referencing task codes (e.g. <code className="font-mono text-emerald-500">DOPS-123</code>).
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Payload URL to configure in GitHub:</span>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/v1/integrations/github/webhook` : 'https://deliverops.io/api/v1/integrations/github/webhook'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Smart Commit Examples:</span>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                git commit -m "DOPS-42: Implement critical path logic"
              </p>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                git commit -m "Fix database migration (fixes #PRJ-88)"
              </p>
            </div>
          </ClayCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COMPETITOR IMPORTERS */}
      {/* ========================================================================= */}
      {activeTab === 'importers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Import Form Card */}
            <ClayCard className="lg:col-span-1 p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Project Importer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  5-pass topological schedule engine with automated CPM critical path recalculation.
                </p>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                {/* Destination Project */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Destination Project
                  </label>
                  <select
                    value={selectedProjectForImport}
                    onChange={(e) => setSelectedProjectForImport(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code || 'PRJ'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Source Tool
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'jira', label: 'Jira Software', icon: <FileJson className="w-4 h-4" /> },
                      { id: 'asana', label: 'Asana', icon: <FileJson className="w-4 h-4" /> },
                      { id: 'monday', label: 'Monday.com', icon: <FileSpreadsheet className="w-4 h-4" /> },
                      { id: 'ms_project', label: 'MS Project (XML)', icon: <FileCode className="w-4 h-4" /> },
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setImportProvider(prov.id as any)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all border ${
                          importProvider === prov.id
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {prov.icon}
                        <span>{prov.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Dropzone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Upload File ({importProvider === 'monday' ? '.csv' : importProvider === 'ms_project' ? '.xml' : '.json'})
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                    <FileUp className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {importFile ? importFile.name : 'Click to select export file'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept={importProvider === 'monday' ? '.csv' : importProvider === 'ms_project' ? '.xml' : '.json'}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setImportFile(e.target.files[0]);
                          setImportContent('');
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Or Raw Paste Area */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Or Paste Raw Payload
                  </label>
                  <textarea
                    rows={4}
                    placeholder={`Paste ${importProvider.toUpperCase()} raw exported content here...`}
                    value={importContent}
                    onChange={(e) => {
                      setImportContent(e.target.value);
                      if (e.target.value) setImportFile(null);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <ClayButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isImporting}
                  icon={isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                >
                  {isImporting ? 'Processing 5-Pass CPM Schedule...' : 'Run Import & Schedule'}
                </ClayButton>
              </form>
            </ClayCard>

            {/* Past Batches History */}
            <ClayCard className="lg:col-span-2 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Import History & Audit Log</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Previous batch records, imported task counts, and topological validation summaries.
                  </p>
                </div>
                <button
                  onClick={loadImportBatches}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {importBatches.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Database className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Import Batches Found</h4>
                  <p className="text-xs mt-1">Imported projects and competitor data will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3">Provider</th>
                        <th className="py-3 px-3">Project</th>
                        <th className="py-3 px-3">Tasks</th>
                        <th className="py-3 px-3">Dependencies</th>
                        <th className="py-3 px-3">Status / Errors</th>
                        <th className="py-3 px-3">Imported By</th>
                        <th className="py-3 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                      {importBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-3">
                            <ClayBadge color="#10B981">{b.provider.toUpperCase()}</ClayBadge>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                            {b.project?.name || b.project_id.slice(0, 8)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{b.tasks_count}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {b.dependencies_count}
                          </td>
                          <td className="py-3 px-3">
                            {b.errors && b.errors.length > 0 ? (
                              <ClayBadge color="#EF4444">{b.errors.length} warnings</ClayBadge>
                            ) : (
                              <ClayBadge color="#10B981" variant="subtle">Clean</ClayBadge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-xs">
                            {b.user?.name || 'Administrator'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-xs">
                            {new Date(b.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ClayCard>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE API KEY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
        title={createdRawKey ? 'API Key Generated' : 'Create New API Key'}
        description={
          createdRawKey
            ? 'Store this secret key now. DeliverOps only stores the SHA-256 hash at rest and will never reveal it again.'
            : 'Configure name, granular scopes, and token-bucket rate limits.'
        }
      >
        {createdRawKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Never share this secret key!</strong>
                Pass it in requests using the <code className="font-mono">X-API-Key</code> header.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between border border-slate-800">
              <span className="truncate mr-2 select-all">{createdRawKey}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(createdRawKey, () => {
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  })
                }
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <ClayButton variant="primary" className="w-full" onClick={() => setIsNewKeyModalOpen(false)}>
              Done & Secured
            </ClayButton>
          </div>
        ) : (
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Key Label / Description
              </label>
              <input
                type="text"
                placeholder="e.g. CI/CD Pipeline or Zapier Sync"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Granular Scopes
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {allAvailableScopes.map((sc) => (
                  <label key={sc} className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyScopes.includes(sc)}
                      onChange={(e) => {
                        if (sc === '*') {
                          setNewKeyScopes(e.target.checked ? ['*'] : []);
                        } else {
                          const withoutWildcard = newKeyScopes.filter((x) => x !== '*');
                          if (e.target.checked) {
                            setNewKeyScopes([...withoutWildcard, sc]);
                          } else {
                            setNewKeyScopes(withoutWildcard.filter((x) => x !== sc));
                          }
                        }
                      }}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-mono text-[11px]">{sc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Rate Limit (req/min)
                </label>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Expiration
                </label>
                <select
                  value={newKeyExpiryDays ?? 'never'}
                  onChange={(e) => setNewKeyExpiryDays(e.target.value === 'never' ? null : Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                  <option value="never">Never Expires</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <ClayButton variant="ghost" type="button" onClick={() => setIsNewKeyModalOpen(false)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Generate Key
              </ClayButton>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADD WEBHOOK */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewWebhookModalOpen}
        onClose={() => setIsNewWebhookModalOpen(false)}
        title={createdWebhookSecret ? 'Webhook Registered' : 'Add Webhook Endpoint'}
        description={
          createdWebhookSecret
            ? 'Store your HMAC signing secret. Use it to verify the DeliverOps-Signature header.'
            : 'DeliverOps will dispatch HTTP POST requests signed with SHA256 HMAC.'
        }
      >
        {createdWebhookSecret ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between border border-slate-800">
              <span className="truncate mr-2 select-all">{createdWebhookSecret}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(createdWebhookSecret, () => {
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  })
                }
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <ClayButton variant="primary" className="w-full" onClick={() => setIsNewWebhookModalOpen(false)}>
              Got it
            </ClayButton>
          </div>
        ) : (
          <form onSubmit={handleCreateWebhook} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                placeholder="https://api.yourdomain.com/webhooks/deliverops"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                placeholder="Production ERP listener"
                value={webhookDesc}
                onChange={(e) => setWebhookDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Subscribe to Events
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {allWebhookEventTypes.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(ev)}
                      onChange={(e) => {
                        if (ev === '*') {
                          setWebhookEvents(e.target.checked ? ['*'] : []);
                        } else {
                          const withoutWildcard = webhookEvents.filter((x) => x !== '*');
                          if (e.target.checked) {
                            setWebhookEvents([...withoutWildcard, ev]);
                          } else {
                            setWebhookEvents(withoutWildcard.filter((x) => x !== ev));
                          }
                        }
                      }}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-mono text-[11px]">{ev}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <ClayButton variant="ghost" type="button" onClick={() => setIsNewWebhookModalOpen(false)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Register Webhook
              </ClayButton>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: REGISTER OAUTH APP */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewOAuthModalOpen}
        onClose={() => setIsNewOAuthModalOpen(false)}
        title={createdOAuthSecret ? 'Application Registered' : 'Register OAuth Application'}
        description={
          createdOAuthSecret
            ? 'Store the Client Secret now. Confidential applications must use this with authorization code exchanges.'
            : 'Configure client name, redirect URIs, and scopes for OAuth 2.0 PKCE authentication.'
        }
      >
        {createdOAuthSecret ? (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Client Secret</span>
              <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between border border-slate-800">
                <span className="truncate mr-2 select-all">{createdOAuthSecret}</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(createdOAuthSecret, () => {})
                  }
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ClayButton variant="primary" className="w-full" onClick={() => setIsNewOAuthModalOpen(false)}>
              Done
            </ClayButton>
          </div>
        ) : (
          <form onSubmit={handleCreateOAuth} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Application Name
              </label>
              <input
                type="text"
                placeholder="My Custom Portal"
                value={oauthName}
                onChange={(e) => setOAuthName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Authorized Redirect URIs (one per line)
              </label>
              <textarea
                rows={3}
                placeholder="https://myportal.com/auth/callback"
                value={oauthRedirectUris}
                onChange={(e) => setOAuthRedirectUris(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 cursor-pointer">
              <input
                type="checkbox"
                checked={oauthIsConfidential}
                onChange={(e) => setOAuthIsConfidential(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confidential Client (Backend Server with client_secret)
              </span>
            </label>

            <div className="pt-2 flex items-center justify-end gap-2">
              <ClayButton variant="ghost" type="button" onClick={() => setIsNewOAuthModalOpen(false)}>
                Cancel
              </ClayButton>
              <ClayButton variant="primary" type="submit">
                Register App
              </ClayButton>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VIEW PAYLOAD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!viewingPayload}
        onClose={() => setViewingPayload(null)}
        title={`Webhook Payload: ${viewingPayload?.event_type || ''}`}
        description={`Dispatched at ${viewingPayload ? new Date(viewingPayload.created_at).toLocaleString() : ''}`}
        maxWidth="max-w-2xl"
      >
        {viewingPayload && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
              <pre>{JSON.stringify(viewingPayload.payload, null, 2)}</pre>
            </div>
            {viewingPayload.response_body && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Receiver Response Body:
                </span>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs max-h-32 overflow-y-auto">
                  {viewingPayload.response_body}
                </div>
              </div>
            )}
            <ClayButton className="w-full" onClick={() => setViewingPayload(null)}>
              Close
            </ClayButton>
          </div>
        )}
      </Modal>
    </div>
  );
};
