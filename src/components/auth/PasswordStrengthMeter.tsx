import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const calculatePasswordScore = (pass: string): {
  score: number;
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
} => {
  const hasMinLength = pass.length >= 12;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSymbol = /[^A-Za-z0-9]/.test(pass);

  let score = 0;
  if (pass.length > 0) score += 10;
  if (hasMinLength) score += 30;
  if (hasUpper) score += 15;
  if (hasLower) score += 15;
  if (hasNumber) score += 15;
  if (hasSymbol) score += 15;

  let label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' = 'Too Weak';
  let color = 'bg-rose-500';

  if (score >= 90 && hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol) {
    label = 'Very Strong';
    color = 'bg-emerald-500';
  } else if (score >= 70 && hasMinLength) {
    label = 'Strong';
    color = 'bg-teal-500';
  } else if (score >= 50) {
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (score >= 25) {
    label = 'Weak';
    color = 'bg-rose-400';
  }

  return {
    score: Math.min(score, 100),
    label,
    color,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
  };
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const analysis = calculatePasswordScore(password);

  const criteria = [
    { label: 'Minimum 12 characters', met: analysis.hasMinLength },
    { label: 'Uppercase & lowercase letters', met: analysis.hasUpper && analysis.hasLower },
    { label: 'At least one number (0-9)', met: analysis.hasNumber },
    { label: 'At least one symbol (!@#$%^&*)', met: analysis.hasSymbol },
  ];

  return (
    <div className="mt-2 space-y-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
      {/* Progress Bar & Label */}
      <div className="flex items-center justify-between font-medium">
        <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
        <span
          className={
            analysis.score >= 85
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : analysis.score >= 50
              ? 'text-amber-600 dark:text-amber-400 font-medium'
              : 'text-rose-600 dark:text-rose-400 font-medium'
          }
        >
          {analysis.label}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${analysis.color}`}
          style={{ width: `${analysis.score}%` }}
        />
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {criteria.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center space-x-1.5 transition-colors ${
              item.met
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
