import React from 'react';

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  active = false,
  className = '',
  icon,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl font-medium gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl font-semibold gap-2',
    lg: 'px-5 py-2.5 text-base rounded-2xl font-bold gap-2.5',
  }[size];

  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses = 'clay-button-primary';
  } else if (variant === 'danger') {
    variantClasses =
      'bg-red-500 hover:bg-red-600 text-white shadow-[4px_4px_10px_rgba(239,68,68,0.4),-3px_-3px_8px_rgba(255,255,255,0.8),inset_1.5px_1.5px_2px_rgba(255,255,255,0.4)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(239,68,68,0.3)] active:translate-y-[1px]';
  } else if (variant === 'ghost') {
    variantClasses =
      'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors';
  } else {
    variantClasses = `clay-button text-slate-700 dark:text-slate-200 ${
      active ? 'clay-button-active text-emerald-600 dark:text-emerald-400 font-bold' : ''
    }`;
  }

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
