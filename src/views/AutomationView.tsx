import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Sparkles,
  Settings,
  Layers,
  ArrowRight,
  Loader2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  automationApi,
  AutomationRule,
  AutomationRun,
  AutomationTemplate,
} from '../api/automation';
import { aiApi, AiUsageResponse } from '../api/ai';

export const AutomationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'runs' | 'ai_settings'>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  // Template Instantiation Modal State
  const [instantiatingTemplate, setInstantiatingTemplate] = useState<AutomationTemplate | null>(null);
  const [newRuleName, setNewRuleName] = useState('');

  // AI Settings State
  const [budgetLimit, setBudgetLimit] = useState<number>(50);
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'rules') {
        const res = await automationApi.getRules();
        setRules(res.rules);
      } else if (activeTab === 'templates') {
        const res = await automationApi.getTemplates();
        setTemplates(res.templates);
      } else if (activeTab === 'runs') {
        const res = await automationApi.getRuns();
        setRuns(res.data);
      } else if (activeTab === 'ai_settings') {
        const res = await aiApi.getUsage();
        setAiUsage(res);
        setBudgetLimit(res.monthly_budget_usd);
      }
    } catch (err: any) {
      console.error('Error loading automation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await automationApi.toggleRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? res.rule : r)));
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await automationApi.deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleInstantiate = async () => {
    if (!instantiatingTemplate) return;
    try {
      await automationApi.instantiateTemplate(instantiatingTemplate.id, {
        name: newRuleName || instantiatingTemplate.name,
      });
      setInstantiatingTemplate(null);
      setNewRuleName('');
      setActiveTab('rules');
    } catch (err: any) {
      alert(`Failed to activate template: ${err.message}`);
    }
  };

  const handleSaveAiSettings = async () => {
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await aiApi.updateSettings({
        ai_monthly_budget_usd: budgetLimit,
        credentials: {
          openai_key: openaiKey || undefined,
          anthropic_key: anthropicKey || undefined,
        },
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(`Settings update failed: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
              <Zap className="w-6 h-6 mr-2.5 text-primary-600" /> No-Code Automation & AI Rules
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Event-driven workflow orchestration, rule templates, and AI copilot usage guardrails
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title="Refresh Data"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Automation Rule
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-1">
          {[
            { id: 'rules', label: 'Active Rules', count: rules.length },
            { id: 'templates', label: 'Recipe Catalog', count: templates.length },
            { id: 'runs', label: 'Audit Execution Logs', count: runs.length },
            { id: 'ai_settings', label: 'AI Budget & Engine Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/80 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Active Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {rules.length === 0 && !isLoading ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <Zap className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No active rules configured</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Select a pre-built recipe from the catalog to automate notifications, status updates, or risk alerts.
                </p>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl"
                >
                  Browse Recipe Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`p-2 rounded-xl ${
                              rule.enabled
                                ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                        </div>
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-7 h-7 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-400" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rule.description || 'No description'}</p>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">When</span>
                          <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {rule.trigger.event}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Do</span>
                          <span>
                            {rule.actions.length} action(s) ({rule.actions.map((a) => a.type).join(', ')})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
                      <span>{rule.project ? `Scope: ${rule.project.name}` : 'Global Scope'}</span>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recipe Catalog */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white shadow-md mb-3 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{tpl.description}</p>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center">
                      <span className="w-16 font-semibold text-slate-400 text-[10px] uppercase">Trigger:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{tpl.trigger.event}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-16 font-semibold text-slate-400 text-[10px] uppercase">Actions:</span>
                      <span>{tpl.actions.map((a) => a.type).join(', ')}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setInstantiatingTemplate(tpl);
                    setNewRuleName(tpl.name);
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-900/50 flex items-center justify-center space-x-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Use This Recipe</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Execution Run Logs */}
        {activeTab === 'runs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rule Name</th>
                    <th className="px-4 py-3">Depth</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Executed At</th>
                    <th className="px-4 py-3">Output / Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No automation runs logged yet.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium inline-flex items-center text-[11px] ${
                              run.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : run.status === 'skipped'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {run.status === 'success' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {run.status === 'skipped' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {run.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {run.rule?.name || run.rule_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">depth {run.depth}/5</td>
                        <td className="px-4 py-3 text-slate-500">{run.duration_ms} ms</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(run.executed_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {run.error_message ? (
                            <span className="text-rose-500">{run.error_message}</span>
                          ) : (
                            JSON.stringify(run.output)
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: AI Budget & Engine Settings */}
        {activeTab === 'ai_settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Budget Utilization Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Monthly Budget</h3>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                ${aiUsage?.current_month_spend_usd.toFixed(2) || '0.00'}
                <span className="text-sm font-medium text-slate-400"> / ${budgetLimit.toFixed(2)}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, aiUsage?.burn_percentage || 0)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {aiUsage?.burn_percentage || 0}% utilized. Automatic 6h throttled alerts fire at 80% and 100%.
              </p>
            </div>

            {/* Provider Configuration */}
            <div className="md:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">API Credentials & Guardrails</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Monthly Spending Cap (USD)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    OpenAI API Key (Optional Override)
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                {settingsSuccess && (
                  <span className="text-xs text-emerald-600 flex items-center font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Settings saved successfully
                  </span>
                )}
                <button
                  disabled={isSavingSettings}
                  onClick={handleSaveAiSettings}
                  className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition flex items-center"
                >
                  {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                  Save Guardrails
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Recipe Instantiate */}
        {instantiatingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Activate Recipe: {instantiatingTemplate.name}
              </h3>
              <p className="text-xs text-slate-500 mb-4">{instantiatingTemplate.description}</p>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setInstantiatingTemplate(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInstantiate}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl"
                >
                  Activate Rule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
