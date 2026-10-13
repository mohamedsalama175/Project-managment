import React, { useState } from 'react';
import {
  Calendar,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Plane,
  HeartPulse,
  Coffee,
  Sun,
  Loader2,
  FileText,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { resourcesApi, TimeOffRequest } from '../../api/resources';

interface RequestTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: TimeOffRequest) => void;
}

export const RequestTimeOffModal: React.FC<RequestTimeOffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<'vacation' | 'sick' | 'personal' | 'holiday'>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoursOff, setHoursOff] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);

    if (!startDate || !endDate) {
      setError('Please specify both start date and end date.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot precede start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resourcesApi.createTimeOffRequest({
        type,
        start_date: startDate,
        end_date: endDate,
        hours_off: hoursOff ? parseFloat(hoursOff) : undefined,
        notes: notes.trim() || undefined,
      });

      if (res.warnings && res.warnings.length > 0) {
        setWarning(res.warnings[0].message);
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit time-off request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    vacation: { label: 'Vacation', icon: Plane, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    sick: { label: 'Sick Leave', icon: HeartPulse, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    personal: { label: 'Personal Day', icon: Coffee, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    holiday: { label: 'Public Holiday', icon: Sun, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Request Time Off
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit planned leave for manager approval & capacity recalculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {warning && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-semibold animate-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Leave Category
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((key) => {
                const conf = typeConfig[key];
                const IconComponent = conf.icon;
                const isSelected = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                      isSelected
                        ? `${conf.color} ring-2 ring-emerald-500/40 shadow-sm scale-[1.02]`
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Optional Hours Off */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Specific Hours Off (Optional)</span>
              <span className="text-[10px] font-normal text-slate-400">Leave blank for full days</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="e.g. 4.0 for half day"
                value={hoursOff}
                onChange={(e) => setHoursOff(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Provide relevant context for your manager..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <ClayButton
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </ClayButton>
          </div>
        </form>
      </div>
    </div>
  );
};
