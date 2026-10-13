import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiClient, ApiSession } from '../../api/client';
import { ClayButton } from '../common/ClayButton';

export const SessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevokingOther, setIsRevokingOther] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getSessions();
      setSessions(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load active device sessions.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSingle = async (id: string) => {
    setRevokingId(id);
    setMessage(null);
    try {
      await apiClient.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setMessage({ type: 'success', text: 'Device session revoked successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke device session.' });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices and active browser sessions?')) {
      return;
    }
    setIsRevokingOther(true);
    setMessage(null);
    try {
      await apiClient.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      setMessage({ type: 'success', text: 'All other active sessions have been terminated.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke other sessions.' });
    } finally {
      setIsRevokingOther(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    const lower = deviceType.toLowerCase();
    if (lower.includes('mobile') || lower.includes('phone')) {
      return <Smartphone className="w-5 h-5 text-indigo-500" />;
    }
    if (lower.includes('tablet')) {
      return <Tablet className="w-5 h-5 text-purple-500" />;
    }
    if (lower.includes('desktop') || lower.includes('laptop')) {
      return <Laptop className="w-5 h-5 text-emerald-500" />;
    }
    return <Globe className="w-5 h-5 text-slate-500" />;
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-emerald-500" />
            Active Devices & Sessions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage browser sessions and devices currently authenticated with your account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh session list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {sessions.length > 1 && (
            <ClayButton
              variant="danger"
              size="sm"
              onClick={handleRevokeAllOther}
              disabled={isRevokingOther}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              {isRevokingOther ? 'Revoking...' : 'Revoke All Other Devices'}
            </ClayButton>
          )}
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 && !isLoading ? (
        <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
          No active database sessions found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                sess.is_current
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  {getDeviceIcon(sess.device_type || 'Desktop')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {sess.browser || 'Web Browser'} on {sess.platform || 'Operating System'}
                    </span>
                    {sess.is_current && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>IP: {sess.ip_address || '127.0.0.1'}</span>
                    <span>•</span>
                    <span>Last active: {formatDate(sess.last_activity)}</span>
                  </div>
                </div>
              </div>

              {!sess.is_current && (
                <button
                  onClick={() => handleRevokeSingle(sess.id)}
                  disabled={revokingId === sess.id}
                  className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 shrink-0 border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{revokingId === sess.id ? 'Revoking...' : 'Revoke'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
