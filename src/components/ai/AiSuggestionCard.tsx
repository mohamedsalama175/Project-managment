import React, { useState } from 'react';
import { Sparkles, Clock, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { TaskEstimationResponse } from '../../api/ai';

interface AiSuggestionCardProps {
  estimation: TaskEstimationResponse;
  currentHours?: number | null;
  onApply: (hours: number) => void;
  onDismiss?: () => void;
}

export const AiSuggestionCard: React.FC<AiSuggestionCardProps> = ({
  estimation,
  currentHours,
  onApply,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onApply(estimation.estimated_hours);
    setApplied(true);
  };

  const confidencePct = Math.round(estimation.confidence * 100);

  return (
    <div className="p-3.5 my-2 bg-gradient-to-r from-primary-50/70 to-indigo-50/50 dark:from-slate-800/80 dark:to-primary-950/30 rounded-xl border border-primary-200/80 dark:border-primary-850 shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <span>AI Effort Suggestion: {estimation.estimated_hours}h</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100/70 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                {confidencePct}% Confidence
              </span>
            </div>
            {currentHours !== undefined && currentHours !== null && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Currently planned: {currentHours}h ({estimation.estimated_hours > currentHours ? '+' : ''}
                {Math.round((estimation.estimated_hours - currentHours) * 10) / 10}h delta)
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Toggle breakdown details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            disabled={applied}
            onClick={handleApply}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center space-x-1 transition shadow-sm ${
              applied
                ? 'bg-emerald-600 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {applied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Applied</span>
              </>
            ) : (
              <span>Adopt {estimation.estimated_hours}h</span>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-2.5 border-t border-primary-200/50 dark:border-primary-800/40 text-xs text-slate-600 dark:text-slate-300 animate-fadeIn">
          <p className="mb-2 italic">{estimation.reasoning}</p>
          {estimation.suggested_breakdown && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                Phase Breakdown
              </span>
              {estimation.suggested_breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-1 px-2 rounded bg-white/70 dark:bg-slate-900/60"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{item.hours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
