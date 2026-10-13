import React, { useState, useEffect } from 'react';
import { X, Moon, Bell, Mail, Check, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { ApiNotificationPreference } from '../../api/client';

export const NotificationPreferencesModal: React.FC = () => {
  const {
    isPreferencesOpen,
    setIsPreferencesOpen,
    preferences,
    fetchPreferences,
    savePreferences,
  } = useNotificationStore();

  const [localPrefs, setLocalPrefs] = useState<ApiNotificationPreference[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isPreferencesOpen) {
      fetchPreferences();
    }
  }, [isPreferencesOpen]);

  useEffect(() => {
    if (preferences.length > 0) {
      setLocalPrefs(preferences);
      const firstWithQuiet = preferences.find((p) => p.quiet_hours_start);
      if (firstWithQuiet) {
        if (firstWithQuiet.quiet_hours_start) setQuietHoursStart(firstWithQuiet.quiet_hours_start.slice(0, 5));
        if (firstWithQuiet.quiet_hours_end) setQuietHoursEnd(firstWithQuiet.quiet_hours_end.slice(0, 5));
      }
    } else {
      // Default preferences
      setLocalPrefs([
        { event_type: 'mention', channel: 'in_app', enabled: true },
        { event_type: 'mention', channel: 'email', enabled: true },
        { event_type: 'comment_watched', channel: 'in_app', enabled: true },
        { event_type: 'comment_watched', channel: 'email', enabled: true },
      ]);
    }
  }, [preferences]);

  if (!isPreferencesOpen) return null;

  const isChannelEnabled = (eventType: string, channel: 'in_app' | 'email') => {
    const pref = localPrefs.find(
      (p) => p.event_type === eventType && p.channel === channel
    );
    return pref ? pref.enabled : true;
  };

  const toggleChannel = (eventType: string, channel: 'in_app' | 'email') => {
    setLocalPrefs((prev) => {
      const idx = prev.findIndex(
        (p) => p.event_type === eventType && p.channel === channel
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
        return updated;
      }
      return [...prev, { event_type: eventType, channel, enabled: false }];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      const payload: ApiNotificationPreference[] = localPrefs.map((p) => ({
        ...p,
        quiet_hours_start: `${quietHoursStart}:00`,
        quiet_hours_end: `${quietHoursEnd}:00`,
      }));

      await savePreferences(payload);
      setSuccessMsg(true);
      setTimeout(() => {
        setIsPreferencesOpen(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Notification Preferences
              </h3>
              <p className="text-xs text-slate-400">
                Choose how and when you receive workspace updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPreferencesOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* Channels Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Event Routing & Channels
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
              {/* Mentions */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Direct @Mentions
                  </div>
                  <div className="text-xs text-slate-400">
                    When someone mentions you in a task discussion
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isChannelEnabled('mention', 'in_app')}
                      onChange={() => toggleChannel('mention', 'in_app')}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isChannelEnabled('mention', 'email')}
                      onChange={() => toggleChannel('mention', 'email')}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              {/* Watched Tasks */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Watched Tasks Comments
                  </div>
                  <div className="text-xs text-slate-400">
                    Activity on tasks you authored, own, or follow
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isChannelEnabled('comment_watched', 'in_app')}
                      onChange={() => toggleChannel('comment_watched', 'in_app')}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isChannelEnabled('comment_watched', 'email')}
                      onChange={() => toggleChannel('comment_watched', 'email')}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Quiet Hours Window */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quiet Hours (Email Suppression)
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              During quiet hours, email alerts are silenced. In-app notifications will still be delivered to your inbox.
            </p>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <Check className="w-4 h-4 shrink-0" />
              <span>Preferences saved successfully!</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsPreferencesOpen(false)}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
