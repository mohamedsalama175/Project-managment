import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  ShieldAlert,
  FileText,
  PlusCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { aiApi, ParsedTaskResponse, TaskEstimationResponse } from '../../api/ai';

interface CommandBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onTaskCreated?: (task: any) => void;
  onOpenAssistant?: () => void;
}

export const CommandBarModal: React.FC<CommandBarModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onTaskCreated,
  onOpenAssistant,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTaskResponse | null>(null);
  const [estimationPreview, setEstimationPreview] = useState<TaskEstimationResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setParsedPreview(null);
      setEstimationPreview(null);
      setStatusMessage(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Ctrl+K / ⌘K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or shortcut
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Suggested quick commands
  const defaultActions = [
    {
      id: 'parse_task',
      title: 'Parse Natural Language Task',
      desc: 'Type: "Create a task for John to audit endpoints due Friday"',
      icon: PlusCircle,
      badge: 'Natural Language',
      action: () => handleParseQuery(query),
    },
    {
      id: 'estimate_effort',
      title: 'Estimate Task Effort',
      desc: 'Type: "Estimate effort for OAuth2 PKCE broker"',
      icon: Clock,
      badge: 'AI Estimator',
      action: () => handleEstimateQuery(query),
    },
    {
      id: 'open_assistant',
      title: 'Ask AI Copilot',
      desc: 'Open side drawer to query schedule risks and take actions',
      icon: Sparkles,
      badge: 'Assistant',
      action: () => {
        onClose();
        onOpenAssistant?.();
      },
    },
    {
      id: 'project_risk',
      title: 'Check Critical Path & Risk Score',
      desc: 'Analyze blockers, schedule drift, and EVM SPI',
      icon: ShieldAlert,
      badge: 'Risk Engine',
      action: () => handleRiskScan(),
    },
  ];

  const handleParseQuery = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setStatusMessage('Analyzing natural language instructions...');
    try {
      const parsed = await aiApi.parseNaturalLanguageTask({ text, project_id: projectId });
      setParsedPreview(parsed);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to parse task instruction.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEstimateQuery = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setStatusMessage('Querying historical baseline estimation models...');
    try {
      const estimated = await aiApi.estimateTask({
        name: text.replace(/^estimate\s+/i, ''),
        project_id: projectId,
      });
      setEstimationPreview(estimated);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(err.message || 'Estimation query failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRiskScan = async () => {
    if (!projectId) {
      setStatusMessage('Please select an active project to calculate risk scores.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Computing 3σ structural schedule risk factors...');
    try {
      const risk = await aiApi.getProjectRiskScore(projectId);
      setStatusMessage(`Project Risk Score: ${risk.risk_score}/100 (${risk.risk_level.toUpperCase()})`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Risk computation error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % defaultActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + defaultActions.length) % defaultActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.toLowerCase().startsWith('create') || query.toLowerCase().startsWith('task')) {
        handleParseQuery(query);
      } else if (query.toLowerCase().startsWith('estimate')) {
        handleEstimateQuery(query);
      } else {
        defaultActions[selectedIndex]?.action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-bar-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3 flex-shrink-0" />
          <input
            id="command-bar-input"
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="command-bar-listbox"
            aria-autocomplete="list"
            className="w-full bg-transparent text-slate-800 dark:text-slate-100 text-base placeholder-slate-400 focus:outline-none"
            placeholder="Type a command or natural language task (e.g. 'Create task for John', 'Estimate API dev')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin ml-2 flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-1 text-xs text-slate-400 dark:text-slate-500 font-mono border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Live Feedback / Status */}
        {statusMessage && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-500 mr-2 flex-shrink-0" />
            {statusMessage}
          </div>
        )}

        {/* Parsed Task Preview Card */}
        {parsedPreview && (
          <div className="p-4 m-4 bg-primary-50/50 dark:bg-primary-950/20 rounded-xl border border-primary-200 dark:border-primary-800 animate-slideDown">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Structured AI Task Extracted
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium">
                {parsedPreview.priority} Priority
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{parsedPreview.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-2">
              <div>
                <span className="font-medium text-slate-500">Category:</span> {parsedPreview.category}
              </div>
              <div>
                <span className="font-medium text-slate-500">Due Date:</span> {parsedPreview.due_date || 'None'}
              </div>
              <div>
                <span className="font-medium text-slate-500">Assignee:</span> {parsedPreview.assignee_name || 'Unassigned'}
              </div>
              <div>
                <span className="font-medium text-slate-500">Est. Hours:</span> {parsedPreview.estimated_hours || 4}h
              </div>
            </div>
            <div className="mt-3 flex justify-end space-x-2">
              <button
                onClick={() => setParsedPreview(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  onTaskCreated?.(parsedPreview);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center"
              >
                Confirm & Add Task <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Task Estimation Preview Card */}
        {estimationPreview && (
          <div className="p-4 m-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-slideDown">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" /> AI Effort Recommendation
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                {Math.round(estimationPreview.confidence * 100)}% Confidence
              </span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {estimationPreview.estimated_hours} Hours
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{estimationPreview.reasoning}</p>
            {estimationPreview.suggested_breakdown && (
              <div className="space-y-1 mb-3">
                {estimationPreview.suggested_breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded">
                    <span>{item.name}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.hours}h</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setEstimationPreview(null)}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Apply to Deliverable
              </button>
            </div>
          </div>
        )}

        {/* Command Listbox */}
        <div id="command-bar-listbox" role="listbox" className="py-2 max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Suggested Actions
          </div>
          {defaultActions.map((item, index) => {
            const Icon = item.icon;
            const isSelected = selectedIndex === index;
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-50/80 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                onClick={item.action}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {item.badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-mono">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-mono">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-mono">
                ENTER
              </kbd>{' '}
              Select
            </span>
          </div>
          <span className="flex items-center text-primary-600 dark:text-primary-400 font-medium">
            <Zap className="w-3.5 h-3.5 mr-1" /> DeliverOps Intelligent Engine
          </span>
        </div>
      </div>
    </div>
  );
};
