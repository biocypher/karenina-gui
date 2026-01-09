/**
 * SummarySection - Reusable section wrapper for summary statistics
 *
 * Extracted from SummaryView.tsx to reduce duplication.
 * Provides consistent section styling with header.
 */

import React from 'react';

export interface SummarySectionProps {
  title: string;
  children: React.ReactNode;
  /** Optional section class override */
  className?: string;
  /** Optional header class override */
  headerClassName?: string;
}

// Default classes matching SummaryView styling
const DEFAULT_SECTION_CLASS = 'bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4';
const DEFAULT_HEADER_CLASS =
  'text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b-2 border-blue-200 dark:border-blue-800';

export function SummarySection({
  title,
  children,
  className = DEFAULT_SECTION_CLASS,
  headerClassName = DEFAULT_HEADER_CLASS,
}: SummarySectionProps): JSX.Element {
  return (
    <div className={className}>
      <h3 className={headerClassName}>{title}</h3>
      {children}
    </div>
  );
}
