import React from 'react';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'elevated' | 'flat' | 'inset';
}

export const ClayCard: React.FC<ClayCardProps> = ({
  children,
  className = '',
  variant = 'elevated',
  ...props
}) => {
  const baseClasses =
    variant === 'elevated'
      ? 'clay-card'
      : variant === 'flat'
      ? 'clay-card-flat'
      : 'clay-input';

  return (
    <div className={`${baseClasses} p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};
