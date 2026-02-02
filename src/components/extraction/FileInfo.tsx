import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FileInfoProps {
  filename: string;
  size?: number;
  totalRows?: number;
  onReset: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const FileInfo: React.FC<FileInfoProps> = ({ filename, size, totalRows, onReset }) => {
  const sizeInKb = size ? Math.round(size / 1024) : 0;
  const rowsFormatted = totalRows?.toLocaleString() || '0';

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{filename}</h3>
          <p className="text-slate-600 dark:text-slate-300">
            {rowsFormatted} rows • {sizeInKb} KB
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors font-medium"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};
