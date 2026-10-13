import React from 'react';
import { Loader2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { ClayButton } from './ClayButton';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  status?: 'empty' | 'loading' | 'error';
  errorDetails?: string | null;
  onRetry?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'default' | 'danger' | 'ghost' | 'secondary' | 'accent';
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  status = 'empty',
  errorDetails,
  onRetry,
  primaryAction,
  secondaryAction,
  compact = false,
  className = '',
}) => {
  if (status === 'loading') {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center select-none ${
          compact ? 'py-6 px-4' : 'py-16 px-6'
        } ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 animate-pulse shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
          {title || 'Loading data...'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          {description || 'Please wait while we synchronize with the workspace.'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center select-none ${
          compact ? 'py-6 px-4' : 'py-12 px-6'
        } ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-3 shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
          {title || 'Failed to load content'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-2">
          {description || 'An unexpected error occurred while fetching information.'}
        </p>
        {errorDetails && (
          <div className="p-2 mb-4 rounded-xl bg-red-500/5 dark:bg-red-950/30 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-300 max-w-lg break-words">
            {errorDetails}
          </div>
        )}
        {onRetry && (
          <ClayButton
            size="sm"
            variant="default"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry Connection
          </ClayButton>
        )}
      </div>
    );
  }

  // Default 'empty' status
  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        compact ? 'py-8 px-4' : 'py-16 px-6'
      } ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3 shadow-inner">
        {icon || <Sparkles className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
      </div>
      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {primaryAction && (
            <ClayButton
              size="sm"
              variant={primaryAction.variant === 'danger' ? 'danger' : primaryAction.variant === 'ghost' ? 'ghost' : primaryAction.variant === 'default' ? 'default' : 'primary'}
              icon={primaryAction.icon}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </ClayButton>
          )}
          {secondaryAction && (
            <ClayButton
              size="sm"
              variant="default"
              icon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </ClayButton>
          )}
        </div>
      )}
    </div>
  );
};
