import React from 'react';

interface ClayBadgeProps {
  children: React.ReactNode;
  color?: string; // hex color or preset name
  variant?: 'pill' | 'subtle' | 'outline';
  className?: string;
  icon?: React.ReactNode;
}

export const ClayBadge: React.FC<ClayBadgeProps> = ({
  children,
  color,
  variant = 'pill',
  className = '',
  icon,
}) => {
  const customStyle = color
    ? {
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}40`,
      }
    : undefined;

  return (
    <span
      style={customStyle}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        variant === 'pill' ? 'clay-pill bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : ''
      } ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
