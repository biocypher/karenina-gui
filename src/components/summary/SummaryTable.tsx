/**
 * SummaryTable - Reusable table component for summary sections
 *
 * Extracted from SummaryView.tsx to reduce duplication.
 * Provides consistent table styling and structure for summary statistics.
 */

import React from 'react';

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

export interface SummaryTableProps {
  rows: SummaryRow[];
  /** Optional row class override */
  rowClass?: string;
  /** Optional label class override */
  labelClass?: string;
  /** Optional value class override */
  valueClass?: string;
}

// Default classes matching SummaryView styling
const DEFAULT_ROW_CLASS =
  'border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors';
const DEFAULT_LABEL_CLASS = 'py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 w-1/3';
const DEFAULT_VALUE_CLASS = 'py-2.5 px-4 text-slate-900 dark:text-slate-100 font-mono';

export function SummaryTable({
  rows,
  rowClass = DEFAULT_ROW_CLASS,
  labelClass = DEFAULT_LABEL_CLASS,
  valueClass = DEFAULT_VALUE_CLASS,
}: SummaryTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={rowClass}>
              <td className={labelClass}>{row.label}</td>
              <td className={valueClass}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
