import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Bot,
  User,
  Loader2,
  Trash2,
  Clock,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { aiApi, ChatMessage, AiActionTaken } from '../../api/ai';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your DeliverOps project intelligence assistant. I can inspect schedules, audit critical paths, draft deliverables, or predict slippages. How can I help with ${
        projectName ? `"${projectName}"` : 'your workspace'
      }?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionsTaken, setActionsTaken] = useState<AiActionTaken[]>([]);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiApi.chat(newHistory, projectId);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.reply,
      };

      setMessages([...newHistory, assistantMsg]);

      if (response.actions_taken && response.actions_taken.length > 0) {
        setActionsTaken((prev) => [...response.actions_taken, ...prev]);
      }
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: `⚠️ Error executing request: ${err.message || 'AI service temporarily unavailable.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (actionLogId: string) => {
    setRollingBackId(actionLogId);
    try {
      await aiApi.rollbackAction(actionLogId);
      setActionsTaken((prev) => prev.filter((a) => a.action_log_id !== actionLogId));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `↺ State reverted: Action successfully rolled back and target records restored.`,
        },
      ]);
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setRollingBackId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform animate-slideLeft"
      role="region"
      aria-label="AI Project Copilot Drawer"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              DeliverOps Copilot
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {projectName ? `Scoped to ${projectName}` : 'Workspace Intelligence'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"
          aria-label="Close Assistant Drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Reversible Actions Status Bar */}
      {actionsTaken.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Reversible Actions Logged ({actionsTaken.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {actionsTaken.map((action) => (
              <div
                key={action.action_log_id}
                className="flex items-center justify-between text-xs bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-amber-200/50 dark:border-amber-800/30"
              >
                <span className="truncate text-slate-700 dark:text-slate-300 mr-2">{action.description}</span>
                <button
                  disabled={rollingBackId === action.action_log_id}
                  onClick={() => handleRollback(action.action_log_id)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 text-amber-800 dark:text-amber-200 flex items-center flex-shrink-0 transition"
                >
                  {rollingBackId === action.action_log_id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3 h-3 mr-1" />
                  )}
                  Revert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`p-2 rounded-xl flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[82%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-700/50'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-3 text-slate-400 text-xs py-2">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary-500 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>Evaluating project schedule parameters...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Starters */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex space-x-2 overflow-x-auto text-xs no-scrollbar">
        <button
          onClick={() => handleSend('What are the critical risks and blockers for this project?')}
          className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap transition"
        >
          🚨 Audit Risks
        </button>
        <button
          onClick={() => handleSend('List all tasks currently marked as Blocked or Overdue')}
          className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap transition"
        >
          📋 Blocked Tasks
        </button>
        <button
          onClick={() => handleSend('Generate an executive summary of current sprint progress')}
          className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap transition"
        >
          📊 Sprint Summary
        </button>
      </div>

      {/* Input Composer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
            placeholder="Ask Copilot or instruct an action..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl shadow-md transition"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
