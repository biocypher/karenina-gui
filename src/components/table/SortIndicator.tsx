import React from 'react';

interface SortIndicatorProps {
  getIsSorted: () => false | 'asc' | 'desc';
}

export const SortIndicator: React.FC<SortIndicatorProps> = ({ getIsSorted }) => {
  const sorted = getIsSorted();
  if (!sorted) {
    return <span className="text-slate-400 ml-1">↕</span>;
  }
  return <span className="text-indigo-600 dark:text-indigo-400 ml-1">{sorted === 'asc' ? '↑' : '↓'}</span>;
};
