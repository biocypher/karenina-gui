import React from 'react';
import { Settings, CheckCircle } from 'lucide-react';
import { AdvancedExtractionPanel } from '../AdvancedExtractionPanel';

// ============================================================================
// Types
// ============================================================================

export interface ColumnConfigurationProps {
  previewData: {
    columns?: string[];
    total_rows?: number;
    data?: Record<string, unknown[]>;
    success: boolean;
  };
  selectedQuestionColumn: string;
  selectedAnswerColumn: string;
  advancedVisible: boolean;
  isExtracting: boolean;
  onQuestionColumnChange: (value: string) => void;
  onAnswerColumnChange: (value: string) => void;
  onAdvancedToggle: () => void;
  onMetadataSettingsChange: (settings: Record<string, unknown>) => void;
  onExtract: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ColumnConfiguration: React.FC<ColumnConfigurationProps> = ({
  previewData,
  selectedQuestionColumn,
  selectedAnswerColumn,
  advancedVisible,
  isExtracting,
  onQuestionColumnChange,
  onAnswerColumnChange,
  onAdvancedToggle,
  onMetadataSettingsChange,
  onExtract,
}) => {
  const canExtract = selectedQuestionColumn && selectedAnswerColumn;

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Configure Columns
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Question Column</label>
          <select
            value={selectedQuestionColumn}
            onChange={(e) => onQuestionColumnChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select column...</option>
            {previewData.columns?.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Answer Column</label>
          <select
            value={selectedAnswerColumn}
            onChange={(e) => onAnswerColumnChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select column...</option>
            {previewData.columns?.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Extraction Panel - Only show after basic columns are selected */}
      {canExtract && previewData.columns && (
        <AdvancedExtractionPanel
          columns={previewData.columns}
          isVisible={advancedVisible}
          onToggle={onAdvancedToggle}
          onSettingsChange={onMetadataSettingsChange}
          previewData={previewData.data}
        />
      )}

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={onExtract}
          disabled={!canExtract || isExtracting}
          className="px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors font-medium"
        >
          {isExtracting ? 'Extracting...' : 'Extract Questions'}
        </button>

        {canExtract && (
          <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Ready to extract
          </div>
        )}
      </div>
    </div>
  );
};
