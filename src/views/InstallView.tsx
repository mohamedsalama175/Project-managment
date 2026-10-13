import React, { useState } from 'react';
import {
  Sparkles,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ClayButton } from '../components/common/ClayButton';
import { ClayCard } from '../components/common/ClayCard';

interface InstallViewProps {
  onInstalled: () => void;
}

export const InstallView: React.FC<InstallViewProps> = ({ onInstalled }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const command = 'php artisan deliverops:install';

  const copyCommand = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.getSystemStatus();
      if (res.installed) {
        onInstalled();
      } else {
        setStatusMessage('System not installed yet. Please run the install command in your backend directory.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Unable to connect to backend service.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f5] dark:bg-[#11161b] flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6 animate-in fade-in duration-300">
        {/* Brand Icon Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-3xl clay-button-primary flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-7 h-7 text-white dark:text-emerald-950" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            DeliverOps Platform Installation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Welcome to DeliverOps. The system detected that the database migrations and initial administrator account have not been provisioned yet.
          </p>
        </div>

        {/* Step-by-Step Card */}
        <ClayCard className="p-6 space-y-5 bg-white/95 dark:bg-[#151c24]/95 border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-3xl">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Phase 0 Setup: Initialize Database & RBAC
              </h2>
              <p className="text-[11px] text-slate-400">
                Run the official DeliverOps installer CLI from your terminal.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Terminal Command (run inside <code className="text-emerald-600 dark:text-emerald-400 font-mono">backend/</code>)
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs shadow-inner">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{command}</span>
              </div>
              <button
                type="button"
                onClick={copyCommand}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy command to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>What this command does:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Executes all multi-tenancy and RBAC database migrations.</li>
              <li>Seeds standard system permissions and protected roles.</li>
              <li>Provisions the Default System Organization (<code className="font-mono text-[10px]">01HZX000000000000000000000</code>).</li>
              <li>Creates the initial Super-Admin account using <code className="font-mono text-[10px]">.env</code> credentials.</li>
            </ul>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <ClayButton
              variant="primary"
              size="md"
              className="w-full justify-center"
              icon={<RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />}
              onClick={checkStatus}
              disabled={isChecking}
            >
              {isChecking ? 'Verifying Platform Installation...' : 'Check Installation Status'}
            </ClayButton>
          </div>
        </ClayCard>

        {/* Footer note */}
        <div className="text-center text-[11px] text-slate-400">
          DeliverOps Enterprise Platform v1.0 · Ready for genuine onboarding
        </div>
      </div>
    </div>
  );
};
