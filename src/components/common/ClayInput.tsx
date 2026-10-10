import React from 'react';

interface ClayInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const ClayInput: React.FC<ClayInputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`clay-input px-3.5 py-2 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all ${
          error ? 'border-red-400 dark:border-red-500 ring-1 ring-red-400' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-medium text-red-500 dark:text-red-400">{error}</span>}
      {helperText && !error && (
        <span className="text-xs text-slate-400 dark:text-slate-500">{helperText}</span>
      )}
    </div>
  );
};
