import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeliverOps Uncaught Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetStorage = () => {
    if (window.confirm('Reset local application data to clean defaults? This resolves legacy schema conflicts.')) {
      try {
        localStorage.clear();
        indexedDB.deleteDatabase('DeliverOps_DB_v2');
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#eef2f5] dark:bg-[#11161b] text-slate-800 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-red-200 dark:border-red-900/50 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  DeliverOps Recovery Mode
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  An unexpected runtime error occurred while rendering the workspace.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 rounded-2xl p-4 text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto max-h-40">
                <div className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-red-500/80 dark:text-red-400/70 whitespace-pre-wrap">
                    {this.state.error.stack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                className="py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                title="Clears corrupted legacy cache and restarts cleanly"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset to Factory Defaults</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
