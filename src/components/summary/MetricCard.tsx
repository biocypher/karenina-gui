/**
 * MetricCard - Reusable stat card component
 *
 * Displays a single metric with value and label.
 * Supports optional click handler for drill-down interactions.
 */

import React from 'react';

interface MetricCardProps {
  value: number | string;
  label: string;
  /** Optional background color class (e.g., 'bg-green-50 dark:bg-green-900/20') */
  bgColor?: string;
  /** Optional text color class for value (e.g., 'text-green-700 dark:text-green-300') */
  valueColor?: string;
  /** Optional click handler for drill-down */
  onClick?: () => void;
  /** Optional subtitle/context */
  subtitle?: string;
}

export function MetricCard({
  value,
  label,
  bgColor = 'bg-slate-50 dark:bg-slate-700/50',
  valueColor = 'text-slate-900 dark:text-slate-100',
  onClick,
  subtitle,
}: MetricCardProps) {
  const baseClasses = 'rounded-lg p-3 text-center transition-colors';
  const interactiveClasses = onClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/50 hover:shadow-md' : '';

  return (
    <div
      className={`${baseClasses} ${bgColor} ${interactiveClasses}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{label}</div>
      {subtitle && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}
